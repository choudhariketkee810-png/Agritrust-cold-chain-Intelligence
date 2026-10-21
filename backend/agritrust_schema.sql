-- ====================================================================
-- AGRITrust — Verified Farm-to-Buyer Logistics Database Foundation
-- Phase 1 Schema: Verification, Evidence, Events, Receiving & Incidents
-- Database: ftl_cold_chain
-- ====================================================================

-- 1. SHIPMENT QUALITY TABLE
CREATE TABLE IF NOT EXISTS shipment_quality (
    quality_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(20) NOT NULL,
    grade_a_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    grade_b_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    damaged_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quality_notes TEXT,
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_quality_shipment 
        FOREIGN KEY (shipment_id) 
        REFERENCES shipments(shipment_id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shipment_quality_shipment_id ON shipment_quality(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_quality_recorded_at ON shipment_quality(recorded_at);


-- 2. SHIPMENT EVIDENCE TABLE
CREATE TABLE IF NOT EXISTS shipment_evidence (
    evidence_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(20) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    file_reference TEXT NOT NULL,
    description TEXT,
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_evidence_shipment 
        FOREIGN KEY (shipment_id) 
        REFERENCES shipments(shipment_id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shipment_evidence_shipment_id ON shipment_evidence(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_evidence_type ON shipment_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_shipment_evidence_uploaded_at ON shipment_evidence(uploaded_at);


-- 3. SHIPMENT EVENTS TABLE (APPEND-ONLY AUDIT LOG)
CREATE TABLE IF NOT EXISTS shipment_events (
    event_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    actor_role VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    event_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    event_description TEXT NOT NULL,
    event_data JSONB,
    CONSTRAINT fk_events_shipment 
        FOREIGN KEY (shipment_id) 
        REFERENCES shipments(shipment_id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_timestamp ON shipment_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_shipment_events_type ON shipment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_time ON shipment_events(shipment_id, event_timestamp DESC);


-- 4. RECEIVING RECORDS TABLE
CREATE TABLE IF NOT EXISTS receiving_records (
    receiving_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(20) NOT NULL,
    received_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    received_grade_a NUMERIC(10, 2) NOT NULL DEFAULT 0,
    received_grade_b NUMERIC(10, 2) NOT NULL DEFAULT 0,
    damaged_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    receiving_location VARCHAR(200),
    receiving_temperature NUMERIC(5, 2),
    receiving_humidity NUMERIC(5, 2),
    receiving_notes TEXT,
    received_by VARCHAR(100) NOT NULL,
    received_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_receiving_shipment 
        FOREIGN KEY (shipment_id) 
        REFERENCES shipments(shipment_id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receiving_records_shipment_id ON receiving_records(shipment_id);
CREATE INDEX IF NOT EXISTS idx_receiving_records_received_at ON receiving_records(received_at);


-- 5. INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    incident_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(20) NOT NULL,
    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_incidents_shipment 
        FOREIGN KEY (shipment_id) 
        REFERENCES shipments(shipment_id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidents_shipment_id ON incidents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_detected_at ON incidents(detected_at);
