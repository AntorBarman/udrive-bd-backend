const db = require('../config/database');

class BranchRepository {
    async findAll({ page = 1, limit = 10, search, status, city }) {
        // Simple query first
        const result = await db.query(`
    SELECT b.*,
           (SELECT COUNT(*)::integer FROM vehicles v WHERE v.branch_id = b.id AND v.is_deleted = FALSE) as vehicle_count,
           (SELECT COUNT(*)::integer FROM bookings bk JOIN vehicles v2 ON bk.vehicle_id = v2.id WHERE v2.branch_id = b.id AND bk.status IN ('confirmed', 'ongoing')) as active_booking_count
    FROM branches b
    ORDER BY b.created_at DESC
  `);

        return {
            branches: result.rows,
            pagination: { page: 1, limit: 10, total: result.rows.length, totalPages: 1 },
            summary: {
                totalBranches: result.rows.length,
                activeBranches: result.rows.filter((b) => b.is_active).length,
                suspendedBranches: result.rows.filter((b) => !b.is_active).length,
                totalVehicles: result.rows.reduce((sum, b) => sum + Number(b.vehicle_count || 0), 0),
            },
        };
    }

    async findById(id) {
        const result = await db.query('SELECT * FROM branches WHERE id = $1::uuid', [id]);
        const branch = result.rows[0];

        if (!branch) return null;

        const vehiclesResult = await db.query(`
      SELECT v.*, u.name as owner_name
      FROM vehicles v
      JOIN users u ON v.owner_id = u.id
      WHERE v.branch_id = $1::uuid AND v.is_deleted = FALSE
      ORDER BY v.created_at DESC
    `, [id]);

        branch.vehicles = vehiclesResult.rows;

        return branch;
    }

    async findByCode(code) {
        const result = await db.query('SELECT * FROM branches WHERE code = $1::text', [code]);
        return result.rows[0];
    }

    async create(data) {
        const result = await db.query(`
      INSERT INTO branches (name, code, city, district, address, phone, email, opening_time, closing_time, is_active)
      VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text, $8::time, $9::time, TRUE)
      RETURNING *
    `, [
            data.name,
            data.code,
            data.city,
            data.district || null,
            data.address,
            data.phone,
            data.email || null,
            data.opening_time || '08:00:00',
            data.closing_time || '20:00:00',
        ]);

        return result.rows[0];
    }

    async update(id, data) {
        const updates = [];
        const params = [];
        let paramCount = 1;

        const allowedFields = ['name', 'city', 'district', 'address', 'phone', 'email', 'opening_time', 'closing_time'];

        allowedFields.forEach((field) => {
            if (data[field] !== undefined && data[field] !== null) {
                updates.push(`${field} = $${paramCount}::text`);
                params.push(data[field]);
                paramCount++;
            }
        });

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        const result = await db.query(
            `UPDATE branches SET ${updates.join(', ')} WHERE id = $${paramCount}::uuid RETURNING *`,
            params
        );

        return result.rows[0];
    }

    async suspend(id, reason) {
        const result = await db.query(
            `UPDATE branches SET is_active = FALSE, suspension_reason = $1::text, suspended_at = CURRENT_TIMESTAMP 
       WHERE id = $2::uuid RETURNING *`,
            [reason, id]
        );
        return result.rows[0];
    }

    async activate(id) {
        const result = await db.query(
            `UPDATE branches SET is_active = TRUE, suspension_reason = NULL, suspended_at = NULL 
       WHERE id = $1::uuid RETURNING *`,
            [id]
        );
        return result.rows[0];
    }

    async logAudit({ userId, action, tableName, recordId, oldValue = null, newValue = null }) {
        await db.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value)
      VALUES ($1::uuid, $2::text, $3::text, $4::uuid, $5::jsonb, $6::jsonb)
    `, [
            userId,
            action,
            tableName,
            recordId,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
        ]);
    }
}

module.exports = new BranchRepository();