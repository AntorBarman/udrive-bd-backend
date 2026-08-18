const ApiError = require('../utils/ApiError');

class CommissionService {
  async processCommissionSplit(client, booking, payment) {
    const PLATFORM_COMMISSION_RATE = 0.15; // 15%
    const OWNER_EARNING_RATE = 0.85; // 85%
    
    const paymentAmount = Number(payment.amount);
    const platformCommission = paymentAmount * PLATFORM_COMMISSION_RATE;
    const ownerEarning = paymentAmount * OWNER_EARNING_RATE;
    
    console.log('💰 Commission Split:', {
      paymentAmount,
      platformCommission,
      ownerEarning,
    });
    
    // Get admin user (platform account)
    const adminResult = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    
    if (adminResult.rows.length === 0) {
      throw new Error('Admin account not found for commission');
    }
    
    const adminId = adminResult.rows[0].id;
    
    // Get owner ID from vehicle
    const vehicleResult = await client.query(
      `SELECT owner_id FROM vehicles WHERE id = $1`,
      [booking.vehicle_id]
    );
    
    if (vehicleResult.rows.length === 0) {
      throw new Error('Vehicle not found for commission');
    }
    
    const ownerId = vehicleResult.rows[0].owner_id;
    
    // 1. Owner credit (85%)
    await client.query(
      `INSERT INTO wallet_transactions (
        user_id, booking_id, type, amount,
        transaction_type, description, reference_id
      )
      VALUES ($1, $2, 'credit', $3, 'owner_earning', $4, $5)`,
      [
        ownerId,
        booking.id,
        ownerEarning,
        `Earning from booking #${booking.id.slice(0, 8)}`,
        payment.transaction_id,
      ]
    );
    console.log('✅ Owner credited:', ownerEarning);
    
    // 2. Platform commission (15%)
    await client.query(
      `INSERT INTO wallet_transactions (
        user_id, booking_id, type, amount,
        transaction_type, description, reference_id
      )
      VALUES ($1, $2, 'credit', $3, 'commission', $4, $5)`,
      [
        adminId,
        booking.id,
        platformCommission,
        `Commission from booking #${booking.id.slice(0, 8)}`,
        payment.transaction_id,
      ]
    );
    console.log('✅ Platform commission:', platformCommission);
    
    return {
      platformCommission,
      ownerEarning,
      ownerId,
      adminId,
    };
  }
}

module.exports = new CommissionService();