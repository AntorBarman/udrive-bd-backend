-- ============================================
-- UDrive Bangladesh V2 - Complete Database Schema
-- ============================================

-- UUID Extension Enable
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    avatar_url TEXT,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_role CHECK (role IN ('customer', 'owner', 'staff', 'admin')),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_phone_format CHECK (phone ~ '^(\+8801|01)[0-9]{9}$')
);

-- 2. branches Table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    opening_time TIME DEFAULT '08:00:00',
    closing_time TIME DEFAULT '20:00:00',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    transmission VARCHAR(20) NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,
    seats INTEGER NOT NULL,
    color VARCHAR(30),
    registration_number VARCHAR(50) UNIQUE,
    description TEXT,
    
    daily_rate DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL,
    hourly_rate DECIMAL(10, 2),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_deleted BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT,
    
    total_bookings INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_year CHECK (year BETWEEN 2000 AND EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    CONSTRAINT chk_seats CHECK (seats BETWEEN 2 AND 15),
    CONSTRAINT chk_daily_rate CHECK (daily_rate >= 500),
    CONSTRAINT chk_deposit CHECK (deposit_amount >= daily_rate * 2),
    CONSTRAINT chk_vehicle_type CHECK (vehicle_type IN ('sedan', 'suv', 'hatchback', 'microbus', 'pickup', 'luxury')),
    CONSTRAINT chk_transmission CHECK (transmission IN ('automatic', 'manual')),
    CONSTRAINT chk_fuel_type CHECK (fuel_type IN ('petrol', 'diesel', 'cng', 'hybrid', 'electric')),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'approved', 'rejected', 'available', 'unavailable', 'suspended'))
);

-- 4. vehicle_images Table
CREATE TABLE IF NOT EXISTS vehicle_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    public_id VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    pickup_time TIME DEFAULT '10:00:00',
    return_time TIME DEFAULT '10:00:00',
    
    daily_rate_snapshot DECIMAL(10, 2) NOT NULL,
    deposit_amount_snapshot DECIMAL(10, 2) NOT NULL,
    rental_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
    cancel_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP,
    
    actual_pickup_time TIMESTAMP,
    actual_return_time TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_dates CHECK (return_date > pickup_date),
    CONSTRAINT chk_rental_amount CHECK (rental_amount >= 0),
    CONSTRAINT chk_total_amount CHECK (total_amount >= rental_amount),
    CONSTRAINT chk_status CHECK (status IN ('pending_payment', 'confirmed', 'ongoing', 'completed', 'cancelled', 'expired'))
);

-- 6. payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    payment_method VARCHAR(50),
    
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    gateway VARCHAR(50) DEFAULT 'sslcommerz',
    
    status VARCHAR(20) NOT NULL DEFAULT 'initiated',
    error_message TEXT,
    
    raw_response JSONB,
    validated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_amount CHECK (amount > 0),
    CONSTRAINT chk_status CHECK (status IN ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'refunded'))
);

-- 7. documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    
    document_type VARCHAR(50) NOT NULL,
    document_url TEXT NOT NULL,
    public_id VARCHAR(255),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_doc_type CHECK (document_type IN ('nid', 'driving_license', 'vehicle_rc', 'insurance', 'vehicle_photo', 'other')),
    CONSTRAINT chk_doc_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 8. wallet_transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id),
    
    type VARCHAR(10) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT,
    
    reference_id VARCHAR(100),
    balance_after DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_type CHECK (type IN ('credit', 'debit')),
    CONSTRAINT chk_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_transaction_type CHECK (transaction_type IN (
        'booking_payment', 'commission', 'owner_earning', 
        'deposit_refund', 'withdrawal', 'adjustment', 'bonus'
    ))
);

-- 9. reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    rating INTEGER NOT NULL,
    comment TEXT,
    
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_one_review_per_booking UNIQUE (booking_id)
);

-- 10. refresh_tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    replaced_by UUID REFERENCES refresh_tokens(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- 11. audit_logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicles_branch ON vehicles(branch_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(daily_rate) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_vehicle ON vehicle_images(vehicle_id) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_dates ON bookings(vehicle_id, pickup_date, return_date) WHERE status IN ('pending_payment', 'confirmed', 'ongoing');
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- ============================================
-- SAMPLE DATA
-- ============================================
INSERT INTO branches (name, address, city, district, phone, email) VALUES
('UDrive Banani', 'House 12, Road 11, Banani', 'Dhaka', 'Dhaka', '01700000001', 'banani@udrivebd.com'),
('UDrive Gulshan', 'House 45, Road 7, Gulshan', 'Dhaka', 'Dhaka', '01700000002', 'gulshan@udrivebd.com'),
('UDrive Uttara', 'Sector 7, Uttara', 'Dhaka', 'Dhaka', '01700000003', 'uttara@udrivebd.com')
ON CONFLICT (id) DO NOTHING;

-- Success Message
SELECT '✅ All tables created successfully!' AS status;