const db = require('../config/database');

class BookingRepository {
  async createWithTransaction(bookingData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      console.log('🔍 Transaction started');
      
      // 1. Lock vehicle row
      const vehicleResult = await client.query(
        `SELECT * FROM vehicles 
         WHERE id = $1 AND status = 'approved' AND is_deleted = FALSE 
         FOR UPDATE`,
        [bookingData.vehicleId]
      );
      
      console.log('🚗 Vehicle Query:', vehicleResult.rows.length > 0 ? 'Found' : 'NOT FOUND');
      
      if (vehicleResult.rows.length === 0) {
        throw new Error('Vehicle not available for booking');
      }
      
      const vehicle = vehicleResult.rows[0];
      console.log('✅ Vehicle:', {
        id: vehicle.id,
        brand: vehicle.brand,
        status: vehicle.status,
        daily_rate: vehicle.daily_rate,
        deposit_amount: vehicle.deposit_amount,
      });
      
      // 2. Check overlapping bookings
      const overlapResult = await client.query(
        `SELECT id FROM bookings 
         WHERE vehicle_id = $1 
         AND status IN ('pending_payment', 'confirmed', 'ongoing')
         AND (
           (pickup_date <= $2::date AND return_date >= $2::date) OR
           (pickup_date <= $3::date AND return_date >= $3::date) OR
           (pickup_date >= $2::date AND return_date <= $3::date)
         )
         FOR UPDATE`,
        [bookingData.vehicleId, bookingData.pickupDate, bookingData.returnDate]
      );
      
      console.log('📅 Overlap Check:', overlapResult.rows.length > 0 ? 'FOUND OVERLAP' : 'NO OVERLAP');
      
      if (overlapResult.rows.length > 0) {
        throw new Error('Vehicle already booked for these dates');
      }
      
      // 3. Calculate price (snapshot)
      // ✅ FIX: Convert to Number to avoid string concatenation
      const pickupDate = new Date(bookingData.pickupDate);
      const returnDate = new Date(bookingData.returnDate);
      const days = Math.ceil((returnDate - pickupDate) / (1000 * 60 * 60 * 24));
      
      const dailyRateSnapshot = Number(vehicle.daily_rate);
      const depositSnapshot = Number(vehicle.deposit_amount);
      const rentalAmount = days * dailyRateSnapshot;
      const totalAmount = rentalAmount + depositSnapshot;
      
      console.log('💰 Price Calculation:', {
        days,
        dailyRate: dailyRateSnapshot,
        rentalAmount,
        depositAmount: depositSnapshot,
        totalAmount,
      });
      
      // 4. Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (
          customer_id, vehicle_id, pickup_date, return_date,
          pickup_time, return_time,
          daily_rate_snapshot, deposit_amount_snapshot,
          rental_amount, total_amount, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          bookingData.customerId,
          bookingData.vehicleId,
          bookingData.pickupDate,
          bookingData.returnDate,
          bookingData.pickupTime || '10:00',
          bookingData.returnTime || '10:00',
          dailyRateSnapshot,
          depositSnapshot,
          rentalAmount,
          totalAmount,
          'pending_payment',
        ]
      );
      
      console.log('✅ Booking Created:', bookingResult.rows[0].id);
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed');
      
      return bookingResult.rows[0];
      
    } catch (error) {
      console.error('❌ Transaction Error:', error.message);
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async findById(id) {
    const query = `
      SELECT b.*, 
             v.brand, v.model, v.year, v.vehicle_type,
             v.transmission, v.fuel_type, v.seats,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             o.name as owner_name, o.email as owner_email,
             v.owner_id as owner_id
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users c ON b.customer_id = c.id
      JOIN users o ON v.owner_id = o.id
      WHERE b.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
  
  async findByCustomerId(customerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings
      WHERE customer_id = $1
    `;
    
    const countResult = await db.query(countQuery, [customerId]);
    const total = parseInt(countResult.rows[0].total);
    
    const dataQuery = `
      SELECT b.*, 
             v.brand, v.model, v.year,
             (SELECT url FROM vehicle_images vi WHERE vi.vehicle_id = v.id AND vi.is_primary = TRUE LIMIT 1) as vehicle_image
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.customer_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(dataQuery, [customerId, limit, offset]);
    
    return {
      bookings: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  async findByOwnerId(ownerId) {
    const query = `
      SELECT b.*, 
             v.brand, v.model, v.year,
             c.name as customer_name, c.phone as customer_phone
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users c ON b.customer_id = c.id
      WHERE v.owner_id = $1
      ORDER BY b.created_at DESC
    `;
    
    const result = await db.query(query, [ownerId]);
    return result.rows;
  }
  
  async updateStatus(id, status, additionalData = {}) {
    const updates = ['status = $1'];
    const params = [status];
    let paramCount = 2;
    
    if (additionalData.cancelReason !== undefined) {
      updates.push(`cancel_reason = $${paramCount}`);
      params.push(additionalData.cancelReason);
      paramCount++;
    }
    
    if (additionalData.cancelledBy !== undefined) {
      updates.push(`cancelled_by = $${paramCount}`);
      params.push(additionalData.cancelledBy);
      paramCount++;
    }
    
    if (additionalData.cancelledAt !== undefined) {
      updates.push(`cancelled_at = $${paramCount}`);
      params.push(additionalData.cancelledAt);
      paramCount++;
    }
    
    if (additionalData.actualPickupTime !== undefined) {
      updates.push(`actual_pickup_time = $${paramCount}`);
      params.push(additionalData.actualPickupTime);
      paramCount++;
    }
    
    if (additionalData.actualReturnTime !== undefined) {
      updates.push(`actual_return_time = $${paramCount}`);
      params.push(additionalData.actualReturnTime);
      paramCount++;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const query = `
      UPDATE bookings 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, params);
    return result.rows[0];
  }
  
  async getBookingStatus(id) {
    const query = 'SELECT status FROM bookings WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0]?.status;
  }
}

module.exports = new BookingRepository();