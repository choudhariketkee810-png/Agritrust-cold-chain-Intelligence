-- ====================================================================
-- AGRITRUST ROLE-BASED PLATFORM SCHEMA MIGRATION
-- Database: ftl_cold_chain
-- ====================================================================

-- 1. USERS & AUTHENTICATION TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('FARMER', 'LOGISTICS', 'COLD_STORAGE', 'BUYER', 'ADMIN')),
    phone VARCHAR(30),
    company_name VARCHAR(150),
    is_verified BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- 2. FARMER FARMS TABLE
CREATE TABLE IF NOT EXISTS farmer_farms (
    farm_id VARCHAR(50) PRIMARY KEY,
    farmer_id VARCHAR(50) NOT NULL,
    farm_name VARCHAR(150) NOT NULL,
    location VARCHAR(200) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    acreage NUMERIC(10, 2) NOT NULL DEFAULT 5.0,
    primary_crops TEXT[] DEFAULT ARRAY['Mango', 'Grapes', 'Pomegranate'],
    soil_type VARCHAR(100) DEFAULT 'Black Loam',
    water_source VARCHAR(100) DEFAULT 'Drip Irrigation / Borewell',
    organic_certified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_farm_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_farmer_farms_farmer ON farmer_farms(farmer_id);


-- 3. PRODUCE LISTINGS TABLE
CREATE TABLE IF NOT EXISTS produce_listings (
    listing_id VARCHAR(50) PRIMARY KEY,
    farmer_id VARCHAR(50) NOT NULL,
    farm_id VARCHAR(50),
    crop_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100) NOT NULL,
    harvest_date DATE NOT NULL,
    expected_dispatch_date DATE,
    total_quantity_kg NUMERIC(12, 2) NOT NULL,
    available_quantity_kg NUMERIC(12, 2) NOT NULL,
    unit_price_per_kg NUMERIC(10, 2) NOT NULL,
    target_temp_min NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
    target_temp_max NUMERIC(5, 2) NOT NULL DEFAULT 13.0,
    quality_grade VARCHAR(100) DEFAULT 'Grade A (Export)',
    brix_level NUMERIC(5, 2) DEFAULT 16.5,
    moisture_percent NUMERIC(5, 2) DEFAULT 75.0,
    inspection_notes TEXT,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'IN_STORAGE', 'DISPATCHED', 'SOLD')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_listing_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_listing_farm FOREIGN KEY (farm_id) REFERENCES farmer_farms(farm_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_produce_listings_farmer ON produce_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_produce_listings_status ON produce_listings(status);


-- 4. LOGISTICS PROFILES & DRIVERS
CREATE TABLE IF NOT EXISTS logistics_profiles (
    profile_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    fleet_size INTEGER DEFAULT 12,
    license_number VARCHAR(100) NOT NULL,
    service_regions TEXT[] DEFAULT ARRAY['Maharashtra', 'Gujarat', 'Karnataka', 'National'],
    rating NUMERIC(3, 2) DEFAULT 4.85,
    insurance_policy_number VARCHAR(100),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_logistics_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logistics_drivers (
    driver_id VARCHAR(50) PRIMARY KEY,
    logistics_user_id VARCHAR(50) NOT NULL,
    driver_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    assigned_vehicle_id VARCHAR(50),
    status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ON_DUTY', 'OFF_DUTY')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_driver_logistics FOREIGN KEY (logistics_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logistics_drivers_user ON logistics_drivers(logistics_user_id);


-- 5. COLD STORAGE FACILITIES & CHAMBERS
CREATE TABLE IF NOT EXISTS cold_storage_facilities (
    facility_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    facility_name VARCHAR(150) NOT NULL,
    location VARCHAR(200) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    contact_email VARCHAR(100),
    storage_types JSONB DEFAULT '["Reefer CA", "Cold Room", "Pre-cooling", "Frozen"]'::jsonb,
    total_capacity_mt NUMERIC(10, 2) NOT NULL DEFAULT 500.0,
    available_capacity_mt NUMERIC(10, 2) NOT NULL DEFAULT 320.0,
    rate_per_mt_day NUMERIC(10, 2) DEFAULT 180.0,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_facility_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cold_storage_chambers (
    chamber_id VARCHAR(50) PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL,
    chamber_name VARCHAR(100) NOT NULL,
    capacity_mt NUMERIC(10, 2) NOT NULL DEFAULT 100.0,
    occupied_mt NUMERIC(10, 2) NOT NULL DEFAULT 40.0,
    current_temperature NUMERIC(5, 2) DEFAULT 11.4,
    target_temp_min NUMERIC(5, 2) DEFAULT 10.0,
    target_temp_max NUMERIC(5, 2) DEFAULT 13.0,
    current_humidity NUMERIC(5, 2) DEFAULT 85.0,
    compatible_produce TEXT[] DEFAULT ARRAY['Mango', 'Grapes', 'Pomegranate', 'Citrus'],
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'FULL')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_chamber_facility FOREIGN KEY (facility_id) REFERENCES cold_storage_facilities(facility_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chambers_facility ON cold_storage_chambers(facility_id);


-- 6. COLD STORAGE BOOKINGS
CREATE TABLE IF NOT EXISTS storage_bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL,
    chamber_id VARCHAR(50),
    farmer_id VARCHAR(50) NOT NULL,
    produce_name VARCHAR(100) NOT NULL,
    quantity_mt NUMERIC(10, 2) NOT NULL,
    requested_intake_date DATE NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 14,
    status VARCHAR(30) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACCEPTED', 'REJECTED', 'INTAKE_COMPLETED', 'DISPATCHED', 'CANCELLED')),
    intake_temperature NUMERIC(5, 2),
    intake_quality_grade VARCHAR(50),
    dispatch_date DATE,
    estimated_cost NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_booking_facility FOREIGN KEY (facility_id) REFERENCES cold_storage_facilities(facility_id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_chamber FOREIGN KEY (chamber_id) REFERENCES cold_storage_chambers(chamber_id) ON DELETE SET NULL,
    CONSTRAINT fk_booking_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storage_bookings_facility ON storage_bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_storage_bookings_farmer ON storage_bookings(farmer_id);


-- 7. BUYER ORDERS
CREATE TABLE IF NOT EXISTS buyer_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    buyer_id VARCHAR(50) NOT NULL,
    listing_id VARCHAR(50),
    farmer_id VARCHAR(50) NOT NULL,
    shipment_id VARCHAR(50),
    produce_name VARCHAR(100) NOT NULL,
    quantity_kg NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    order_status VARCHAR(30) DEFAULT 'CONFIRMED' CHECK (order_status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
    payment_status VARCHAR(30) DEFAULT 'ESCROW_LOCKED' CHECK (payment_status IN ('ESCROW_PENDING', 'ESCROW_LOCKED', 'RELEASED_TO_FARMER', 'REFUNDED_TO_BUYER', 'PARTIAL_RELEASE')),
    delivery_address TEXT NOT NULL,
    required_delivery_date DATE,
    buyer_notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_order_buyer FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_listing FOREIGN KEY (listing_id) REFERENCES produce_listings(listing_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_buyer_orders_buyer ON buyer_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_orders_farmer ON buyer_orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_orders_shipment ON buyer_orders(shipment_id);


-- 8. DISPUTES & AI-ASSISTED EVIDENCE REVIEWS
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    order_id VARCHAR(50),
    raised_by_user_id VARCHAR(50) NOT NULL,
    raised_by_role VARCHAR(30) NOT NULL,
    against_role VARCHAR(30) DEFAULT 'LOGISTICS',
    dispute_category VARCHAR(50) NOT NULL CHECK (dispute_category IN ('TEMPERATURE_EXCURSION', 'QUANTITY_SHORTAGE', 'GRADE_MISMATCH', 'CARGO_DAMAGE', 'DELIVERY_DELAY', 'OTHER')),
    claim_amount NUMERIC(12, 2) DEFAULT 0.0,
    description TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    ai_evidence_summary TEXT,
    ai_risk_score INTEGER DEFAULT 75,
    admin_resolution TEXT,
    settlement_amount NUMERIC(12, 2) DEFAULT 0.0,
    settlement_party VARCHAR(50),
    resolved_by_admin_id VARCHAR(50),
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_dispute_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    CONSTRAINT fk_dispute_raised_by FOREIGN KEY (raised_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disputes_shipment ON disputes(shipment_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);


-- 9. AUDIT LOGS (TAMPER-EVIDENT RECORD)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    user_role VARCHAR(30),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);


-- 10. EXTEND SHIPMENTS TABLE WITH ROLE LINKAGES (SAFE ALTER)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='farmer_id') THEN
        ALTER TABLE shipments ADD COLUMN farmer_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='buyer_id') THEN
        ALTER TABLE shipments ADD COLUMN buyer_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='logistics_id') THEN
        ALTER TABLE shipments ADD COLUMN logistics_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='cold_storage_id') THEN
        ALTER TABLE shipments ADD COLUMN cold_storage_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='qr_code_hash') THEN
        ALTER TABLE shipments ADD COLUMN qr_code_hash VARCHAR(100);
    END IF;
END $$;
