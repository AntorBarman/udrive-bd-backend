const db = require('../config/database');

class PaymentRepository {
  async create(paymentData) {
    const query = `
      INSERT INTO payments (
        booking_id, user_id, amount, currency,
        transaction_id, gateway, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const params = [
      paymentData.bookingId,
      paymentData.userId,
      paymentData.amount,
      paymentData.currency || 'BDT',
      paymentData.transactionId,
      paymentData.gateway || 'sslcommerz',
      paymentData.status || 'initiated',
    ];
    
    const result = await db.query(query, params);
    return result.rows[0];
  }
  
  async findByTransactionId(transactionId) {
    const query = 'SELECT * FROM payments WHERE transaction_id = $1';
    const result = await db.query(query, [transactionId]);
    return result.rows[0];
  }
  
  async findByBookingId(bookingId) {
    const query = 'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [bookingId]);
    return result.rows;
  }
  
  async updateStatus(id, status, rawResponse = null) {
    const query = `
      UPDATE payments 
      SET status = $1, raw_response = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [status, rawResponse, id]);
    return result.rows[0];
  }
  
  async updateValidationStatus(id, validatedAt) {
    const query = `
      UPDATE payments 
      SET validated_at = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [validatedAt, id]);
    return result.rows[0];
  }
}

module.exports = new PaymentRepository();