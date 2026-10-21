-- ====================================================================
-- AGRITRUST: MANDATORY PHYSICAL CONSIGNMENT VERIFICATION SCHEMA
-- Database: ftl_cold_chain
-- ====================================================================

-- 1. SAFELY UPDATE USERS ROLE CHECK CONSTRAINT
DO $$
BEGIN
    -- Drop old check constraint if present
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    -- Add updated check constraint including VERIFICATION_TEAM and VERIFICATION_OFFICER
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('FARMER', 'LOGISTICS', 'COLD_STORAGE', 'BUYER', 'ADMIN', 'VERIFICATION_TEAM', 'VERIFICATION_OFFICER'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;


-- 2. VERIFICATION OFFICERS TABLE
CREATE TABLE IF NOT EXISTS verification_officers (
    officer_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255) NOT NULL,
    assigned_region VARCHAR(100) NOT NULL DEFAULT 'Western Agro Corridor (Maharashtra)',
    station_location VARCHAR(150) NOT NULL DEFAULT 'Nashik Agro-Certification Centre',
    specialization VARCHAR(150) NOT NULL DEFAULT 'Perishables, Cold-Chain & Export Grade Certification',
    availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' 
        CHECK (availability_status IN ('AVAILABLE', 'ON_INSPECTION', 'OFF_DUTY', 'ON_LEAVE')),
    active_assignments_count INTEGER NOT NULL DEFAULT 0,
    total_inspections_completed INTEGER NOT NULL DEFAULT 0,
    approval_rate_pct NUMERIC(5, 2) DEFAULT 92.50,
    avg_turnaround_hours NUMERIC(5, 2) DEFAULT 2.40,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_officer_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_officers_status ON verification_officers(availability_status);
CREATE INDEX IF NOT EXISTS idx_officers_region ON verification_officers(assigned_region);


-- 3. CONSIGNMENT REQUESTS TABLE (Mandatory Physical Inspection Baseline)
CREATE TABLE IF NOT EXISTS consignment_requests (
    consignment_id VARCHAR(50) PRIMARY KEY,
    consignment_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(255),
    customer_role VARCHAR(30) NOT NULL DEFAULT 'FARMER',
    
    -- Pickup & Destination Locations
    pickup_location VARCHAR(255) NOT NULL,
    pickup_pincode VARCHAR(20) NOT NULL,
    pickup_city VARCHAR(100) NOT NULL DEFAULT 'Nashik',
    pickup_state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    pickup_geo_lat NUMERIC(10, 6) DEFAULT 19.9975,
    pickup_geo_lon NUMERIC(10, 6) DEFAULT 73.7898,
    
    destination_location VARCHAR(255) NOT NULL,
    destination_pincode VARCHAR(20) NOT NULL,
    destination_city VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
    destination_state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    destination_geo_lat NUMERIC(10, 6) DEFAULT 18.9322,
    destination_geo_lon NUMERIC(10, 6) DEFAULT 72.8354,

    -- Consignment Goods & Packaging Details
    product_category VARCHAR(100) NOT NULL DEFAULT 'Fresh Fruits & Vegetables',
    product_name VARCHAR(150) NOT NULL,
    variety VARCHAR(100),
    material_description TEXT NOT NULL,
    declared_quantity_kg NUMERIC(12, 2) NOT NULL,
    declared_package_count INTEGER DEFAULT 100,
    packaging_type VARCHAR(100) NOT NULL DEFAULT 'Ventilated Reefer Crates (CFB)',
    packaging_requirements TEXT DEFAULT 'Corrugated food-grade ventilated cartons with ethylene absorption pads',
    storage_requirements TEXT DEFAULT 'Pre-cooled to target bracket before container loading',
    
    -- Thermal & Environmental Requirements
    requires_temperature_control BOOLEAN DEFAULT TRUE,
    target_temp_min NUMERIC(5, 2) DEFAULT 10.0,
    target_temp_max NUMERIC(5, 2) DEFAULT 13.0,
    target_humidity_min NUMERIC(5, 2) DEFAULT 80.0,
    target_humidity_max NUMERIC(5, 2) DEFAULT 90.0,
    
    -- Mode Preferences & Dates
    preferred_transport_mode VARCHAR(30) NOT NULL DEFAULT 'ROAD'
        CHECK (preferred_transport_mode IN ('ROAD', 'AIR', 'MARINE', 'MULTIMODAL')),
    expected_pickup_date DATE NOT NULL,
    urgency_level VARCHAR(30) DEFAULT 'STANDARD'
        CHECK (urgency_level IN ('STANDARD', 'EXPRESS', 'CRITICAL')),
    declared_cargo_value_inr NUMERIC(14, 2) DEFAULT 250000.0,
    
    -- Evidence & Supporting Documents uploaded by Customer
    customer_photos JSONB DEFAULT '[]'::jsonb,
    customer_videos JSONB DEFAULT '[]'::jsonb,
    supporting_documents JSONB DEFAULT '[]'::jsonb,
    customer_notes TEXT,

    -- Verification & Inspection Lifecycle State
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION'
        CHECK (verification_status IN (
            'REQUEST_CREATED',
            'PENDING_VERIFICATION',
            'INSPECTION_SCHEDULED',
            'UNDER_INSPECTION',
            'APPROVED',
            'REJECTED',
            'REQUIRES_CORRECTION',
            'AWAITING_BOOKING',
            'BOOKING_CONFIRMED',
            'LOGISTICS_ACCEPTED',
            'READY_FOR_DISPATCH',
            'DISPATCHED',
            'IN_TRANSIT',
            'DELIVERED'
        )),
    
    -- Officer Assignment
    assigned_officer_id VARCHAR(50),
    assigned_officer_name VARCHAR(150),
    assigned_at TIMESTAMP WITHOUT TIME ZONE,
    scheduled_inspection_time TIMESTAMP WITHOUT TIME ZONE,
    
    -- Verification Outcome Details
    verification_reference_no VARCHAR(100), -- e.g. VRF-2026-8839
    verified_at TIMESTAMP WITHOUT TIME ZONE,
    verified_quantity_kg NUMERIC(12, 2),
    verified_quality_grade VARCHAR(100),
    verified_temperature NUMERIC(5, 2),
    inspection_decision_notes TEXT,
    rejection_reason TEXT,
    required_corrections TEXT,
    correction_submitted_at TIMESTAMP WITHOUT TIME ZONE,

    -- Downstream Transport Booking & Logistics linkage
    booking_id VARCHAR(50),
    quote_id VARCHAR(50),
    selected_transport_mode VARCHAR(30),
    carrier_id VARCHAR(50),
    carrier_name VARCHAR(150),
    assigned_vehicle_or_vessel VARCHAR(100),
    shipment_id VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_consignment_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_consignment_officer FOREIGN KEY (assigned_officer_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignment_requests(verification_status);
CREATE INDEX IF NOT EXISTS idx_consignments_customer ON consignment_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_consignments_officer ON consignment_requests(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_consignments_ref ON consignment_requests(consignment_reference);
CREATE INDEX IF NOT EXISTS idx_consignments_vrf ON consignment_requests(verification_reference_no);


-- 4. PHYSICAL CONSIGNMENT INSPECTIONS TABLE (Audit & Reinspection Trail)
CREATE TABLE IF NOT EXISTS consignment_inspections (
    inspection_id VARCHAR(50) PRIMARY KEY,
    consignment_id VARCHAR(50) NOT NULL,
    inspection_number INTEGER NOT NULL DEFAULT 1, -- 1 for initial, 2+ for reinspections
    is_reinspection BOOLEAN NOT NULL DEFAULT FALSE,
    previous_inspection_id VARCHAR(50),
    
    -- Inspecting Officer
    officer_id VARCHAR(50) NOT NULL,
    officer_name VARCHAR(150) NOT NULL,
    officer_badge VARCHAR(50) NOT NULL,
    
    -- Inspection Place & Time
    inspection_location VARCHAR(255) NOT NULL,
    inspection_facility_type VARCHAR(100) NOT NULL DEFAULT 'Farm Gate Packhouse',
    inspection_started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    inspection_completed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Mandatory Physical Checklist Items (Boolean Validations)
    actual_material_condition_verified BOOLEAN NOT NULL DEFAULT TRUE,
    actual_weight_verified BOOLEAN NOT NULL DEFAULT TRUE,
    visible_damage_detected BOOLEAN NOT NULL DEFAULT FALSE,
    contamination_spoilage_detected BOOLEAN NOT NULL DEFAULT FALSE,
    packaging_labelling_compliant BOOLEAN NOT NULL DEFAULT TRUE,
    temp_within_required_range BOOLEAN NOT NULL DEFAULT TRUE,
    supporting_docs_verified BOOLEAN NOT NULL DEFAULT TRUE,
    transport_mode_suitability_confirmed BOOLEAN NOT NULL DEFAULT TRUE,

    -- Recorded Measurements & Observations
    declared_quantity_kg NUMERIC(12, 2) NOT NULL,
    verified_quantity_kg NUMERIC(12, 2) NOT NULL,
    quantity_discrepancy_kg NUMERIC(12, 2) DEFAULT 0.0,
    
    measured_temperature NUMERIC(5, 2),
    measured_humidity NUMERIC(5, 2),
    measured_brix_level NUMERIC(5, 2),
    
    verified_quality_grade VARCHAR(255) NOT NULL DEFAULT 'Grade A (Export Ready)',
    verified_packaging_condition TEXT NOT NULL DEFAULT 'Tamper-evident sealed, ventilated corrugated export boxes',
    
    -- Transport Mode Suitability Assessment
    evaluated_mode VARCHAR(50) NOT NULL DEFAULT 'ROAD',
    mode_suitability_result VARCHAR(100) NOT NULL DEFAULT 'SUITABLE_AS_REQUESTED',
    mode_suitability_notes TEXT DEFAULT 'Pre-cooling temperature meets reefer transport requirements.',

    -- Discrepancies & Corrective Actions
    discrepancies_found JSONB DEFAULT '[]'::jsonb,
    corrective_actions_required TEXT,

    -- Evidence Media Captured by Officer (NOT Customer)
    officer_evidence_photos JSONB DEFAULT '[]'::jsonb,
    officer_evidence_videos JSONB DEFAULT '[]'::jsonb,
    inspection_certificate_hash VARCHAR(150),

    -- Decision & Remarks
    inspection_result VARCHAR(50) NOT NULL 
        CHECK (inspection_result IN ('APPROVED', 'REJECTED', 'REQUIRES_CORRECTION')),
    officer_remarks TEXT NOT NULL,
    verification_reference_no VARCHAR(100),
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_inspection_consignment FOREIGN KEY (consignment_id) REFERENCES consignment_requests(consignment_id) ON DELETE CASCADE,
    CONSTRAINT fk_inspection_officer FOREIGN KEY (officer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Ensure expanded column types if table already created
ALTER TABLE consignment_inspections ALTER COLUMN verified_packaging_condition TYPE TEXT;
ALTER TABLE consignment_inspections ALTER COLUMN verified_quality_grade TYPE VARCHAR(255);
ALTER TABLE consignment_inspections ALTER COLUMN mode_suitability_result TYPE VARCHAR(100);
ALTER TABLE consignment_requests ALTER COLUMN verified_quality_grade TYPE VARCHAR(255);
ALTER TABLE consignment_requests ALTER COLUMN verification_reference_no TYPE VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_inspections_consignment ON consignment_inspections(consignment_id);
CREATE INDEX IF NOT EXISTS idx_inspections_officer ON consignment_inspections(officer_id);
CREATE INDEX IF NOT EXISTS idx_inspections_result ON consignment_inspections(inspection_result);


-- 5. CONSIGNMENT STATUS HISTORY (Strict Tamper-Evident State Machine Audit)
CREATE TABLE IF NOT EXISTS consignment_status_history (
    history_id BIGSERIAL PRIMARY KEY,
    consignment_id VARCHAR(50) NOT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    changed_by_user_id VARCHAR(50) NOT NULL,
    changed_by_user_name VARCHAR(150),
    changed_by_role VARCHAR(50) NOT NULL,
    action_title VARCHAR(150) NOT NULL,
    notes TEXT,
    event_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_status_history_consignment FOREIGN KEY (consignment_id) REFERENCES consignment_requests(consignment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_status_history_consignment ON consignment_status_history(consignment_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created ON consignment_status_history(created_at DESC);


-- 6. DISPATCH READINESS CHECKS TABLE (Logistics Verification Gate)
CREATE TABLE IF NOT EXISTS dispatch_readiness_checks (
    check_id VARCHAR(50) PRIMARY KEY,
    consignment_id VARCHAR(50) NOT NULL,
    shipment_id VARCHAR(50),
    logistics_user_id VARCHAR(50) NOT NULL,
    
    -- 5 Mandatory Pre-Dispatch Checks
    check_physical_verification_approved BOOLEAN NOT NULL DEFAULT FALSE,
    check_booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    check_verified_quantity_matched BOOLEAN NOT NULL DEFAULT FALSE,
    check_packaging_docs_compliant BOOLEAN NOT NULL DEFAULT FALSE,
    check_transport_capacity_ready BOOLEAN NOT NULL DEFAULT FALSE,
    
    all_checks_passed BOOLEAN NOT NULL DEFAULT FALSE,
    verified_ref_number_checked VARCHAR(100),
    assigned_vehicle_number VARCHAR(100),
    pre_cooling_temp_c NUMERIC(5, 2),
    odometer_km INTEGER,
    seal_number VARCHAR(100),
    carrier_operator_notes TEXT,
    evaluated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_readiness_consignment FOREIGN KEY (consignment_id) REFERENCES consignment_requests(consignment_id) ON DELETE CASCADE,
    CONSTRAINT fk_readiness_logistics FOREIGN KEY (logistics_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_readiness_consignment ON dispatch_readiness_checks(consignment_id);
