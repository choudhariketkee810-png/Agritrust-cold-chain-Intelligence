-- ====================================================================
-- AGRITRUST: SHARED COLD STORAGE & CONSOLIDATED MICRO-COLD-CHAIN SCHEMA
-- Database: ftl_cold_chain
-- Safe, repeatable DDL migrations with primary/foreign keys & indexes
-- ====================================================================

-- 1. ENHANCE COLD STORAGE FACILITIES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cold_storage_facilities' AND column_name='operating_status') THEN
        ALTER TABLE cold_storage_facilities ADD COLUMN operating_status VARCHAR(30) DEFAULT 'OPERATIONAL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cold_storage_facilities' AND column_name='is_demo') THEN
        ALTER TABLE cold_storage_facilities ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. ENHANCE COLD STORAGE CHAMBERS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cold_storage_chambers' AND column_name='humidity_min') THEN
        ALTER TABLE cold_storage_chambers ADD COLUMN humidity_min NUMERIC(5, 2) DEFAULT 80.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cold_storage_chambers' AND column_name='humidity_max') THEN
        ALTER TABLE cold_storage_chambers ADD COLUMN humidity_max NUMERIC(5, 2) DEFAULT 95.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cold_storage_chambers' AND column_name='rate_per_mt_day') THEN
        ALTER TABLE cold_storage_chambers ADD COLUMN rate_per_mt_day NUMERIC(10, 2) DEFAULT 180.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cold_storage_chambers' AND column_name='is_demo') THEN
        ALTER TABLE cold_storage_chambers ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. SHARED STORAGE BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS storage_bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL,
    chamber_id VARCHAR(50),
    farmer_id VARCHAR(50) NOT NULL,
    produce_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    quantity_mt NUMERIC(10, 2) NOT NULL CHECK (quantity_mt > 0),
    target_temp_min NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
    target_temp_max NUMERIC(5, 2) NOT NULL DEFAULT 13.0,
    requested_intake_date DATE NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 7 CHECK (duration_days > 0),
    estimated_cost NUMERIC(12, 2) DEFAULT 0.0,
    handling_requirements TEXT,
    status VARCHAR(30) DEFAULT 'REQUESTED',
    rejection_reason TEXT,
    intake_temperature NUMERIC(5, 2),
    intake_quality_grade VARCHAR(50),
    dispatch_date DATE,
    notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storage_bookings' AND column_name='variety') THEN
        ALTER TABLE storage_bookings ADD COLUMN variety VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storage_bookings' AND column_name='target_temp_min') THEN
        ALTER TABLE storage_bookings ADD COLUMN target_temp_min NUMERIC(5, 2) DEFAULT 10.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storage_bookings' AND column_name='target_temp_max') THEN
        ALTER TABLE storage_bookings ADD COLUMN target_temp_max NUMERIC(5, 2) DEFAULT 13.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storage_bookings' AND column_name='handling_requirements') THEN
        ALTER TABLE storage_bookings ADD COLUMN handling_requirements TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storage_bookings' AND column_name='rejection_reason') THEN
        ALTER TABLE storage_bookings ADD COLUMN rejection_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storage_bookings' AND column_name='is_demo') THEN
        ALTER TABLE storage_bookings ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_storage_bookings_facility ON storage_bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_storage_bookings_farmer ON storage_bookings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_storage_bookings_status ON storage_bookings(status);

-- 4. SEPARATE FARMER INVENTORY OWNERSHIP TABLE
CREATE TABLE IF NOT EXISTS storage_inventory (
    inventory_id VARCHAR(50) PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    facility_id VARCHAR(50) NOT NULL,
    chamber_id VARCHAR(50) NOT NULL,
    produce_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    allocated_quantity_mt NUMERIC(10, 2) NOT NULL CHECK (allocated_quantity_mt > 0),
    current_quantity_mt NUMERIC(10, 2) NOT NULL CHECK (current_quantity_mt >= 0),
    initial_quality_grade VARCHAR(100) DEFAULT 'Grade A (Intact)',
    current_quality_grade VARCHAR(100) DEFAULT 'Grade A (Intact)',
    intake_temperature NUMERIC(5, 2) DEFAULT 11.2,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    handling_notes TEXT,
    intake_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    checkout_timestamp TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PARTIALLY_RELEASED', 'CHECKED_OUT', 'DISPUTED')),
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_inventory_booking FOREIGN KEY (booking_id) REFERENCES storage_bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_facility FOREIGN KEY (facility_id) REFERENCES cold_storage_facilities(facility_id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_chamber FOREIGN KEY (chamber_id) REFERENCES cold_storage_chambers(chamber_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storage_inventory_farmer ON storage_inventory(farmer_id);
CREATE INDEX IF NOT EXISTS idx_storage_inventory_chamber ON storage_inventory(chamber_id);
CREATE INDEX IF NOT EXISTS idx_storage_inventory_facility ON storage_inventory(facility_id);
CREATE INDEX IF NOT EXISTS idx_storage_inventory_status ON storage_inventory(status);

-- 5. STORAGE INTAKE CUSTODY RECORDS (Immutable)
CREATE TABLE IF NOT EXISTS storage_intake_records (
    intake_id VARCHAR(50) PRIMARY KEY,
    inventory_id VARCHAR(50) NOT NULL,
    booking_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    facility_id VARCHAR(50) NOT NULL,
    chamber_id VARCHAR(50) NOT NULL,
    received_quantity_mt NUMERIC(10, 2) NOT NULL CHECK (received_quantity_mt > 0),
    intake_temperature NUMERIC(5, 2) NOT NULL,
    quality_grade VARCHAR(100) NOT NULL,
    inspector_name VARCHAR(150) NOT NULL,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    intake_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_intake_inventory FOREIGN KEY (inventory_id) REFERENCES storage_inventory(inventory_id) ON DELETE CASCADE,
    CONSTRAINT fk_intake_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storage_intake_inventory ON storage_intake_records(inventory_id);

-- 6. STORAGE CHECKOUT CUSTODY RECORDS (Immutable)
CREATE TABLE IF NOT EXISTS storage_checkout_records (
    checkout_id VARCHAR(50) PRIMARY KEY,
    inventory_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    facility_id VARCHAR(50) NOT NULL,
    chamber_id VARCHAR(50) NOT NULL,
    released_quantity_mt NUMERIC(10, 2) NOT NULL CHECK (released_quantity_mt > 0),
    dispatch_temperature NUMERIC(5, 2) NOT NULL,
    quality_condition VARCHAR(100) NOT NULL,
    receiving_party VARCHAR(150) NOT NULL,
    carrier_vehicle_id VARCHAR(50),
    carrier_driver_name VARCHAR(150),
    photo_urls JSONB DEFAULT '[]'::jsonb,
    custody_notes TEXT,
    checkout_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_checkout_inventory FOREIGN KEY (inventory_id) REFERENCES storage_inventory(inventory_id) ON DELETE CASCADE,
    CONSTRAINT fk_checkout_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storage_checkout_inventory ON storage_checkout_records(inventory_id);

-- 7. CONSOLIDATED TRANSPORT PLANS TABLE
CREATE TABLE IF NOT EXISTS consolidated_transport_plans (
    plan_id VARCHAR(50) PRIMARY KEY,
    logistics_user_id VARCHAR(50) NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    driver_id VARCHAR(50),
    origin_hub VARCHAR(200) NOT NULL,
    destination_hub VARCHAR(200) NOT NULL,
    target_temp_min NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
    target_temp_max NUMERIC(5, 2) NOT NULL DEFAULT 13.0,
    total_vehicle_capacity_mt NUMERIC(10, 2) NOT NULL DEFAULT 12.0,
    total_consolidated_mt NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    route_summary TEXT,
    estimated_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    pickup_window_start TIMESTAMP WITHOUT TIME ZONE,
    pickup_window_end TIMESTAMP WITHOUT TIME ZONE,
    delivery_deadline TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(30) DEFAULT 'AWAITING_APPROVAL' CHECK (status IN ('PROPOSED', 'AWAITING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'DELIVERED', 'REJECTED', 'CANCELLED')),
    rejection_reason TEXT,
    approval_notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_plan_logistics FOREIGN KEY (logistics_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consolidated_plans_logistics ON consolidated_transport_plans(logistics_user_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_plans_status ON consolidated_transport_plans(status);

-- 8. CONSOLIDATED TRANSPORT ITEMS TABLE (Individual Farmer Parcels in Consolidated Load)
CREATE TABLE IF NOT EXISTS consolidated_transport_items (
    item_id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    booking_id VARCHAR(50),
    inventory_id VARCHAR(50),
    shipment_id VARCHAR(50),
    produce_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    quantity_mt NUMERIC(10, 2) NOT NULL CHECK (quantity_mt > 0),
    pickup_location TEXT NOT NULL,
    destination_location TEXT NOT NULL,
    estimated_cost_share NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    item_status VARCHAR(30) DEFAULT 'PLANNED' CHECK (item_status IN ('PLANNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_item_plan FOREIGN KEY (plan_id) REFERENCES consolidated_transport_plans(plan_id) ON DELETE CASCADE,
    CONSTRAINT fk_item_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consolidated_items_plan ON consolidated_transport_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_items_farmer ON consolidated_transport_items(farmer_id);

-- 9. TRANSPORT COST ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS transport_cost_allocations (
    allocation_id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    quantity_mt NUMERIC(10, 2) NOT NULL,
    distance_km NUMERIC(8, 2) NOT NULL DEFAULT 120.0,
    handling_factor NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    base_share_amount NUMERIC(10, 2) NOT NULL,
    final_share_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'ESTIMATED' CHECK (status IN ('ESTIMATED', 'CONFIRMED', 'BILLED', 'PAID')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_cost_plan FOREIGN KEY (plan_id) REFERENCES consolidated_transport_plans(plan_id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cost_allocations_plan ON transport_cost_allocations(plan_id);
CREATE INDEX IF NOT EXISTS idx_cost_allocations_farmer ON transport_cost_allocations(farmer_id);
