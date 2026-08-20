const vehicleRepository = require('../repositories/vehicleRepository');
const userRepository = require('../repositories/userRepository');
const ApiError = require('../utils/ApiError');
const db = require('../config/database');

class AdminService {
  async getPendingVehicles() {
    const query = `
      SELECT v.*, 
             u.name as owner_name,
             u.email as owner_email,
             u.phone as owner_phone,
             b.name as branch_name
      FROM vehicles v
      JOIN users u ON v.owner_id = u.id
      JOIN branches b ON v.branch_id = b.id
      WHERE v.status = 'pending' AND v.is_deleted = FALSE
      ORDER BY v.created_at ASC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }
  
  async getAllVehicles() {
    const query = `
      SELECT v.*, 
             u.name as owner_name,
             b.name as branch_name
      FROM vehicles v
      JOIN users u ON v.owner_id = u.id
      JOIN branches b ON v.branch_id = b.id
      WHERE v.is_deleted = FALSE
      ORDER BY v.created_at DESC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }
  
  async approveVehicle(vehicleId, adminId) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get vehicle
      const vehicleResult = await client.query(
        `SELECT * FROM vehicles WHERE id = $1 FOR UPDATE`,
        [vehicleId]
      );
      
      if (vehicleResult.rows.length === 0) {
        throw ApiError.notFound('Vehicle not found');
      }
      
      const vehicle = vehicleResult.rows[0];
      
      // Check if pending
      if (vehicle.status !== 'pending') {
        throw ApiError.badRequest(`Vehicle is already ${vehicle.status}`);
      }
      
      // Update status
      const updateResult = await client.query(
        `UPDATE vehicles 
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [vehicleId]
      );
      
      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
         VALUES ($1, 'APPROVE', 'vehicles', $2, $3)`,
        [adminId, vehicleId, JSON.stringify({ status: 'approved' })]
      );
      
      await client.query('COMMIT');
      return updateResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async rejectVehicle(vehicleId, adminId, reason) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get vehicle
      const vehicleResult = await client.query(
        `SELECT * FROM vehicles WHERE id = $1 FOR UPDATE`,
        [vehicleId]
      );
      
      if (vehicleResult.rows.length === 0) {
        throw ApiError.notFound('Vehicle not found');
      }
      
      const vehicle = vehicleResult.rows[0];
      
      // Check if pending
      if (vehicle.status !== 'pending') {
        throw ApiError.badRequest(`Vehicle is already ${vehicle.status}`);
      }
      
      if (!reason) {
        throw ApiError.badRequest('Rejection reason is required');
      }
      
      // Update status
      const updateResult = await client.query(
        `UPDATE vehicles 
         SET status = 'rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [reason, vehicleId]
      );
      
      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
         VALUES ($1, 'REJECT', 'vehicles', $2, $3)`,
        [adminId, vehicleId, JSON.stringify({ status: 'rejected', reason })]
      );
      
      await client.query('COMMIT');
      return updateResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async suspendVehicle(vehicleId, adminId) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const vehicleResult = await client.query(
        `SELECT * FROM vehicles WHERE id = $1 FOR UPDATE`,
        [vehicleId]
      );
      
      if (vehicleResult.rows.length === 0) {
        throw ApiError.notFound('Vehicle not found');
      }
      
      const updateResult = await client.query(
        `UPDATE vehicles 
         SET status = 'suspended', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [vehicleId]
      );
      
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value)
         VALUES ($1, 'SUSPEND', 'vehicles', $2, $3)`,
        [adminId, vehicleId, JSON.stringify({ status: 'suspended' })]
      );
      
      await client.query('COMMIT');
      return updateResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getAdminStats() {
    const stats = {};
    
    // Total users
    const usersResult = await db.query(`SELECT COUNT(*) FROM users`);
    stats.totalUsers = parseInt(usersResult.rows[0].count);
    
    // Total vehicles
    const vehiclesResult = await db.query(`SELECT COUNT(*) FROM vehicles WHERE is_deleted = FALSE`);
    stats.totalVehicles = parseInt(vehiclesResult.rows[0].count);
    
    // Pending vehicles
    const pendingResult = await db.query(`SELECT COUNT(*) FROM vehicles WHERE status = 'pending' AND is_deleted = FALSE`);
    stats.pendingVehicles = parseInt(pendingResult.rows[0].count);
    
    // Total bookings
    const bookingsResult = await db.query(`SELECT COUNT(*) FROM bookings`);
    stats.totalBookings = parseInt(bookingsResult.rows[0].count);
    
    // Total payments
    const paymentsResult = await db.query(`SELECT COUNT(*) FROM payments WHERE status = 'paid'`);
    stats.totalPayments = parseInt(paymentsResult.rows[0].count);
    
    return stats;
  }
}

module.exports = new AdminService();