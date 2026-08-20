const paymentRepository = require('../repositories/paymentRepository');
const bookingRepository = require('../repositories/bookingRepository');
const commissionService = require('./commissionService');
const { createSSLCommerzInstance } = require('../config/sslcommerz');
const ApiError = require('../utils/ApiError');
const db = require('../config/database');
const { generateTransactionId } = require('../utils/transactionId');

class PaymentService {
  async initiatePayment(bookingId, userId) {
    console.log('🔍 Initiate payment:', { bookingId, userId });
    
    const booking = await bookingRepository.findById(bookingId);
    
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }
    
    if (booking.customer_id !== userId) {
      throw ApiError.forbidden('You can only pay for your own bookings');
    }
    
    if (booking.status !== 'pending_payment') {
      throw ApiError.badRequest(`Booking status is ${booking.status}, cannot initiate payment`);
    }
    
    // ✅ Use utility function
    const transactionId = generateTransactionId('UDRIVE');
    const bookingAmount = Number(booking.total_amount);
    
    console.log('💰 Payment amount:', bookingAmount);
    console.log('🔑 Transaction ID:', transactionId);
    
    const payment = await paymentRepository.create({
      bookingId,
      userId,
      amount: bookingAmount,
      transactionId,
      status: 'initiated',
    });
    
    const sslcommerz = createSSLCommerzInstance();
    
    const paymentData = {
      total_amount: bookingAmount,
      currency: 'BDT',
      tran_id: transactionId,
      success_url: process.env.SSLC_SUCCESS_URL,
      fail_url: process.env.SSLC_FAIL_URL,
      cancel_url: process.env.SSLC_CANCEL_URL,
      ipn_url: process.env.SSLC_IPN_URL,
      
      product_name: 'UDrive Car Rental',
      product_category: 'transportation',
      product_profile: 'general',
      
      shipping_method: 'NO',
      num_of_item: 1,
      
      cus_name: booking.customer_name || 'Customer',
      cus_email: booking.customer_email || 'customer@example.com',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: booking.customer_phone || '01700000000',
      
      ship_name: booking.customer_name || 'Customer',
      ship_add1: 'Dhaka',
      ship_city: 'Dhaka',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
    };
    
    try {
      console.log('🔍 Calling SSLCommerz init...');
      const response = await sslcommerz.init(paymentData);
      
      console.log('🔍 SSLCommerz Response:', JSON.stringify(response, null, 2));
      
      if (response.status === 'FAILED') {
        await paymentRepository.updateStatus(payment.id, 'failed', response);
        throw new Error(response.failedreason || 'Payment initiation failed');
      }
      
      await paymentRepository.updateStatus(payment.id, 'pending', response);
      
      const gatewayUrl = response.GatewayPageURL || response.redirectGatewayURL;
      
      console.log('✅ Gateway URL:', gatewayUrl);
      
      if (!gatewayUrl) {
        throw new Error('Gateway URL not received from SSLCommerz');
      }
      
      return {
        paymentId: payment.id,
        transactionId,
        gatewayUrl,
        amount: bookingAmount,
      };
    } catch (error) {
      console.error('❌ SSLCommerz Error:', error.message);
      await paymentRepository.updateStatus(payment.id, 'failed', { error: error.message });
      throw ApiError.badRequest('Payment initiation failed: ' + error.message);
    }
  }
  
  async handlePaymentSuccess(transactionId, valId) {
    return this.processPayment(transactionId, valId, 'success');
  }
  
  async handlePaymentIPN(transactionId, valId) {
    return this.processPayment(transactionId, valId, 'ipn');
  }
  
  async processPayment(transactionId, valId, source) {
    console.log(`🔍 Processing payment from ${source}:`, { transactionId, valId });
    
    // Get existing payment
    const existingPayment = await paymentRepository.findByTransactionId(transactionId);
    
    if (!existingPayment) {
      throw ApiError.notFound('Payment not found');
    }
    
    // Idempotency check - already processed
    if (existingPayment.status === 'paid') {
      console.log('✅ Payment already processed (idempotent)');
      return {
        success: true,
        message: 'Payment already processed',
        paymentId: existingPayment.id,
      };
    }
    
    // Get booking
    const booking = await bookingRepository.findById(existingPayment.booking_id);
    
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }
    
    // Process with database transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      console.log('🔍 Transaction started');
      
      // 1. Update payment status
      await client.query(
        `UPDATE payments 
         SET status = 'paid', 
             validated_at = CURRENT_TIMESTAMP, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [existingPayment.id]
      );
      console.log('✅ Payment marked as paid');
      
      // 2. Update booking status
      await client.query(
        `UPDATE bookings 
         SET status = 'confirmed', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [booking.id]
      );
      console.log('✅ Booking confirmed');
      
      // 3. Customer wallet debit
      await client.query(
        `INSERT INTO wallet_transactions (
          user_id, booking_id, type, amount,
          transaction_type, description, reference_id
        )
        VALUES ($1, $2, 'debit', $3, 'booking_payment', $4, $5)`,
        [
          existingPayment.user_id,
          booking.id,
          Number(existingPayment.amount),
          `Payment for booking #${booking.id.slice(0, 8)}`,
          transactionId,
        ]
      );
      console.log('✅ Customer wallet debited');
      
      // 4. Commission split (owner 85%, platform 15%)
      await commissionService.processCommissionSplit(client, booking, existingPayment);
      console.log('✅ Commission split completed');
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed');
      
      return {
        success: true,
        message: 'Payment processed successfully',
        paymentId: existingPayment.id,
        bookingId: booking.id,
        bookingStatus: 'confirmed',
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async handlePaymentFail(transactionId) {
    console.log('🔍 Payment failed:', transactionId);
    
    const payment = await paymentRepository.findByTransactionId(transactionId);
    
    if (payment) {
      await paymentRepository.updateStatus(payment.id, 'failed');
    }
    
    return { success: false, message: 'Payment failed' };
  }
  
  async handlePaymentCancel(transactionId) {
    console.log('🔍 Payment cancelled:', transactionId);
    
    const payment = await paymentRepository.findByTransactionId(transactionId);
    
    if (payment) {
      await paymentRepository.updateStatus(payment.id, 'cancelled');
    }
    
    return { success: false, message: 'Payment cancelled' };
  }
  
  async getPaymentStatus(bookingId, userId) {
    const payments = await paymentRepository.findByBookingId(bookingId);
    
    if (payments.length === 0) {
      throw ApiError.notFound('No payments found for this booking');
    }
    
    const booking = await bookingRepository.findById(bookingId);
    
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }
    
    // Check ownership
    const isCustomer = booking.customer_id === userId;
    const isOwner = booking.owner_id === userId;
    
    if (!isCustomer && !isOwner) {
      throw ApiError.forbidden('You do not have permission to view this payment');
    }
    
    // Return latest payment
    return payments[0];
  }
}

module.exports = new PaymentService();