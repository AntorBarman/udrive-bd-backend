const db = require('../config/database');

class VehicleRepository {
    async create(vehicleData) {
        const dataQuery = `
        SELECT v.*, 
            b.name as branch_name,
            COALESCE(
                (SELECT vi.image_url FROM vehicle_images vi 
                WHERE vi.vehicle_id = v.id AND vi.is_primary = TRUE 
                LIMIT 1),
                (SELECT vi.image_url FROM vehicle_images vi 
                WHERE vi.vehicle_id = v.id 
                ORDER BY vi.created_at ASC 
                LIMIT 1)
            ) as primary_image
        FROM vehicles v
        JOIN branches b ON v.branch_id = b.id
        WHERE ${whereClause}
        ORDER BY v.${sortBy} ${sortOrder}
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `;


        const params = [
            vehicleData.ownerId,
            vehicleData.branch_id,
            vehicleData.brand,
            vehicleData.model,
            vehicleData.year,
            vehicleData.vehicle_type,
            vehicleData.transmission,
            vehicleData.fuel_type,
            vehicleData.seats,
            vehicleData.color,
            vehicleData.registration_number,
            vehicleData.description,
            vehicleData.daily_rate,
            vehicleData.deposit_amount,
        ];

        const result = await db.query(query, params);
        return result.rows[0];
    }

    async findById(id) {
        const query = `
            SELECT v.*, 
                b.name as branch_name,
                b.address as branch_address,
                u.name as owner_name,
                u.email as owner_email,
                u.phone as owner_phone,
                COALESCE(
                    (SELECT vi.image_url FROM vehicle_images vi 
                    WHERE vi.vehicle_id = v.id AND vi.is_primary = TRUE 
                    LIMIT 1),
                    (SELECT vi.image_url FROM vehicle_images vi 
                    WHERE vi.vehicle_id = v.id 
                    ORDER BY vi.created_at ASC 
                    LIMIT 1)
                ) as primary_image
            FROM vehicles v
            JOIN branches b ON v.branch_id = b.id
            JOIN users u ON v.owner_id = u.id
            WHERE v.id = $1 AND v.is_deleted = FALSE
        `;

        const result = await db.query(query, [id]);
        const vehicle = result.rows[0];

        if (vehicle) {
            // Get all images
            const imagesQuery = `
            SELECT id, image_url, public_id, is_primary, display_order
            FROM vehicle_images
            WHERE vehicle_id = $1
            ORDER BY is_primary DESC, display_order ASC
            `;
            const imagesResult = await db.query(imagesQuery, [id]);
            vehicle.images = imagesResult.rows;
        }

        return vehicle;
    }
    async findByOwnerId(ownerId) {
        const query = `
      SELECT v.*, b.name as branch_name
      FROM vehicles v
      JOIN branches b ON v.branch_id = b.id
      WHERE v.owner_id = $1 AND v.is_deleted = FALSE
      ORDER BY v.created_at DESC
    `;

        const result = await db.query(query, [ownerId]);
        return result.rows;
    }

    async update(id, vehicleData) {
        const updates = [];
        const params = [];
        let paramCount = 1;

        // Dynamic update - only provided fields
        Object.keys(vehicleData).forEach((key, index) => {
            updates.push(`${key} = $${paramCount}`);
            params.push(vehicleData[key]);
            paramCount++;
        });

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        const query = `
      UPDATE vehicles 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND is_deleted = FALSE
      RETURNING *
    `;

        const result = await db.query(query, params);
        return result.rows[0];
    }

    async softDelete(id) {
        const query = `
      UPDATE vehicles 
      SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    async search(filters) {
        const conditions = ['v.is_deleted = FALSE', 'v.status = $1'];
        const params = ['approved'];
        let paramCount = 1; // ✅ ১ থেকে শুরু হবে

        // Dynamic WHERE clause তৈরি
        if (filters.brand) {
            paramCount++;
            conditions.push(`v.brand ILIKE $${paramCount}`);
            params.push(`%${filters.brand}%`);
        }

        if (filters.vehicle_type) {
            paramCount++;
            conditions.push(`v.vehicle_type = $${paramCount}`);
            params.push(filters.vehicle_type);
        }

        if (filters.transmission) {
            paramCount++;
            conditions.push(`v.transmission = $${paramCount}`);
            params.push(filters.transmission);
        }

        if (filters.fuel_type) {
            paramCount++;
            conditions.push(`v.fuel_type = $${paramCount}`);
            params.push(filters.fuel_type);
        }

        if (filters.seats) {
            paramCount++;
            conditions.push(`v.seats = $${paramCount}`);
            params.push(filters.seats);
        }

        if (filters.min_price) {
            paramCount++;
            conditions.push(`v.daily_rate >= $${paramCount}`);
            params.push(filters.min_price);
        }

        if (filters.max_price) {
            paramCount++;
            conditions.push(`v.daily_rate <= $${paramCount}`);
            params.push(filters.max_price);
        }

        if (filters.branch_id) {
            paramCount++;
            conditions.push(`v.branch_id = $${paramCount}`);
            params.push(filters.branch_id);
        }

        const whereClause = conditions.join(' AND ');

        // Total matching count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles v
      WHERE ${whereClause}
    `;

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Paginated results
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        const limit = parseInt(filters.limit) || 10;
        const page = parseInt(filters.page) || 1;
        const offset = (page - 1) * limit;

        // Data query প্যারামিটার যোগ করা
        const dataParams = [...params];
        let dataParamCount = paramCount;

        dataParamCount++;
        const limitParam = `$${dataParamCount}`;
        dataParams.push(limit);

        dataParamCount++;
        const offsetParam = `$${dataParamCount}`;
        dataParams.push(offset);

        const dataQuery = `
            SELECT v.*, 
                    b.name as branch_name,
                    (SELECT vi.image_url FROM vehicle_images vi 
                    WHERE vi.vehicle_id = v.id AND vi.is_primary = TRUE 
                    LIMIT 1) as primary_image
            FROM vehicles v
            JOIN branches b ON v.branch_id = b.id
            WHERE ${whereClause}
            ORDER BY v.${sortBy} ${sortOrder}
            LIMIT ${limitParam} OFFSET ${offsetParam}
            `;

        const dataResult = await db.query(dataQuery, dataParams);

        return {
            vehicles: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async addImage(vehicleId, imageUrl, publicId, isPrimary = false, displayOrder = 0) {
        const query = `
      INSERT INTO vehicle_images (vehicle_id, image_url, public_id, is_primary, display_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

        const result = await db.query(query, [vehicleId, imageUrl, publicId, isPrimary, displayOrder]);
        return result.rows[0];
    }

    async getImages(vehicleId) {
        const query = `
      SELECT * FROM vehicle_images
      WHERE vehicle_id = $1
      ORDER BY is_primary DESC, display_order ASC
    `;

        const result = await db.query(query, [vehicleId]);
        return result.rows;
    }

    async deleteImage(imageId) {
        const query = 'DELETE FROM vehicle_images WHERE id = $1 RETURNING *';
        const result = await db.query(query, [imageId]);
        return result.rows[0];
    }

    async hasActiveBookings(vehicleId) {
        const query = `
      SELECT COUNT(*) as count
      FROM bookings
      WHERE vehicle_id = $1
      AND status IN ('pending_payment', 'confirmed', 'ongoing')
    `;

        const result = await db.query(query, [vehicleId]);
        return parseInt(result.rows[0].count) > 0;
    }
}

module.exports = new VehicleRepository();