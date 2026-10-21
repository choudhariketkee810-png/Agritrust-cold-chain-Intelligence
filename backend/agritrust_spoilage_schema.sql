-- ====================================================================
-- AGRITRUST: SELL BEFORE SPOILAGE DYNAMIC MARKETPLACE SCHEMA
-- Database: ftl_cold_chain
-- Safe, repeatable DDL migrations with primary/foreign keys & indexes
-- ====================================================================

-- 1. BUYER DEMAND REGISTRY (Active purchasing requirements)
CREATE TABLE IF NOT EXISTS buyer_demand (
    demand_id VARCHAR(50) PRIMARY KEY,
    buyer_id VARCHAR(50) NOT NULL,
    produce_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100) NOT NULL,
    quantity_demanded_kg NUMERIC(12, 2) NOT NULL,
    fulfilled_quantity_kg NUMERIC(12, 2) DEFAULT 0.0,
    offered_price_per_kg NUMERIC(10, 2) NOT NULL,
    acceptable_quality_grade VARCHAR(100) DEFAULT 'Grade A or B',
    delivery_location VARCHAR(200) NOT NULL,
    delivery_district VARCHAR(100) NOT NULL,
    max_delivery_distance_km NUMERIC(8, 2) DEFAULT 50.0,
    receiving_window VARCHAR(30) DEFAULT 'TODAY' CHECK (receiving_window IN ('TODAY', 'TOMORROW', 'FUTURE_DATE')),
    required_delivery_date DATE,
    notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_demand_buyer FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_buyer_demand_produce ON buyer_demand(produce_name, status);
CREATE INDEX IF NOT EXISTS idx_buyer_demand_buyer ON buyer_demand(buyer_id);


-- 2. SPOILAGE RISK ASSESSMENTS
CREATE TABLE IF NOT EXISTS spoilage_risk_assessments (
    assessment_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    estimated_shelf_life_hours NUMERIC(6, 1) NOT NULL,
    predicted_eta_hours NUMERIC(6, 1) NOT NULL,
    safety_buffer_hours NUMERIC(5, 1) DEFAULT 6.0,
    risk_level VARCHAR(30) NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'UNKNOWN')),
    confidence_score INTEGER DEFAULT 85,
    factors JSONB DEFAULT '[]'::jsonb,
    assessed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_assessment_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_spoilage_risk_shipment ON spoilage_risk_assessments(shipment_id);


-- 3. MARKETPLACE OFFERS (Farmer Proposed Alternative Buyer Deals)
CREATE TABLE IF NOT EXISTS marketplace_offers (
    offer_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL,
    demand_id VARCHAR(50),
    quantity_kg NUMERIC(12, 2) NOT NULL,
    offered_price_per_kg NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    original_price_per_kg NUMERIC(10, 2) DEFAULT 0.0,
    estimated_delivery_time_hours NUMERIC(5, 1) NOT NULL,
    additional_logistics_cost NUMERIC(10, 2) DEFAULT 0.0,
    destination_address TEXT NOT NULL,
    distance_km NUMERIC(8, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PROPOSED' CHECK (status IN (
        'PROPOSED', 
        'BUYER_ACCEPTED', 
        'LOGISTICS_APPROVED', 
        'FARMER_CONFIRMED', 
        'REJECTED', 
        'EXPIRED', 
        'DELIVERED', 
        'CANCELLED'
    )),
    buyer_action_notes TEXT,
    logistics_action_notes TEXT,
    farmer_confirmation_notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_offer_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    CONSTRAINT fk_offer_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_offer_buyer FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_offer_demand FOREIGN KEY (demand_id) REFERENCES buyer_demand(demand_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_marketplace_offers_shipment ON marketplace_offers(shipment_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_buyer ON marketplace_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_status ON marketplace_offers(status);


-- 4. SHIPMENT ALLOCATIONS (Handles Split Quantities to Multiple Buyers)
CREATE TABLE IF NOT EXISTS shipment_allocations (
    allocation_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    offer_id VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL,
    allocated_quantity_kg NUMERIC(12, 2) NOT NULL,
    destination_address TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'IN_TRANSIT_NEW_DEST', 'DELIVERED', 'CANCELLED')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_alloc_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_offer FOREIGN KEY (offer_id) REFERENCES marketplace_offers(offer_id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_buyer FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shipment_allocations_shipment ON shipment_allocations(shipment_id);


-- 5. DYNAMIC REDIRECTION REQUESTS & APPROVALS
CREATE TABLE IF NOT EXISTS redirection_requests (
    request_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    offer_id VARCHAR(50),
    vehicle_id VARCHAR(50),
    driver_id VARCHAR(50),
    original_destination TEXT NOT NULL,
    new_destination TEXT NOT NULL,
    distance_km NUMERIC(8, 2) NOT NULL,
    estimated_travel_time_hours NUMERIC(5, 1) NOT NULL,
    additional_transport_cost NUMERIC(10, 2) DEFAULT 0.0,
    logistics_approved BOOLEAN DEFAULT FALSE,
    farmer_confirmed BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'PENDING_LOGISTICS' CHECK (status IN (
        'PENDING_LOGISTICS', 
        'LOGISTICS_CONFIRMED', 
        'FARMER_AUTHORIZED', 
        'EXECUTED', 
        'REJECTED'
    )),
    approval_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_redir_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_redirection_requests_shipment ON redirection_requests(shipment_id);


-- 6. EMERGENCY RESCUE STORAGE REQUESTS
CREATE TABLE IF NOT EXISTS rescue_storage_requests (
    request_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    facility_id VARCHAR(50) NOT NULL,
    quantity_mt NUMERIC(10, 2) NOT NULL,
    target_temperature NUMERIC(5, 2) DEFAULT 10.0,
    duration_days INTEGER NOT NULL DEFAULT 7,
    estimated_cost NUMERIC(12, 2) DEFAULT 0.0,
    status VARCHAR(30) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACCEPTED', 'INTAKE_RECORDED', 'REJECTED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_rescue_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    CONSTRAINT fk_rescue_facility FOREIGN KEY (facility_id) REFERENCES cold_storage_facilities(facility_id) ON DELETE CASCADE,
    CONSTRAINT fk_rescue_farmer FOREIGN KEY (farmer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rescue_requests_facility ON rescue_storage_requests(facility_id);


-- 7. MARKETPLACE IN-APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS marketplace_notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_role VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    shipment_id VARCHAR(50),
    action_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_marketplace_notif_user ON marketplace_notifications(user_id, is_read);


-- 8. ROUTE CHANGE AUDIT HISTORY (Immutable tracking of destination shifts)
CREATE TABLE IF NOT EXISTS route_change_history (
    change_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    redirection_id VARCHAR(50),
    original_destination TEXT NOT NULL,
    authorized_new_destination TEXT NOT NULL,
    quantity_kg NUMERIC(12, 2) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL,
    changed_by_user_id VARCHAR(50) NOT NULL,
    changed_by_role VARCHAR(30) NOT NULL,
    reason TEXT,
    gps_latitude NUMERIC(10, 6),
    gps_longitude NUMERIC(10, 6),
    temperature_at_change NUMERIC(5, 2),
    changed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_route_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_route_change_shipment ON route_change_history(shipment_id);

