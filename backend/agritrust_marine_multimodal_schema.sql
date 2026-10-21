-- ====================================================================
-- AGRITRUST: MULTIMODAL AGRI COLD-CHAIN & MARINE ROUTE INTELLIGENCE SCHEMA
-- Database: ftl_cold_chain
-- Phase: Marine Route, Reefer Containers, Loss Prevention, AI Incident Timeline,
--        Shelf-Life Predictor, Sell Before Spoilage, Black Box, Digital Seals,
--        Sensor Trust, GPS Anomaly Detection & What-If Simulation
-- ====================================================================

-- 1. SHIPPING CONTAINERS TABLE
CREATE TABLE IF NOT EXISTS shipping_containers (
    container_id VARCHAR(50) PRIMARY KEY,
    container_type VARCHAR(60) NOT NULL DEFAULT '40ft High Cube Reefer (Controlled Atmosphere)',
    current_vessel_name VARCHAR(100) NOT NULL DEFAULT 'MV AGRI STAR',
    voyage_number VARCHAR(50) NOT NULL DEFAULT 'VOY-2026-EU04',
    carrier_name VARCHAR(100) NOT NULL DEFAULT 'Maersk Line',
    set_temperature NUMERIC(5, 2) NOT NULL DEFAULT 4.0,
    current_temperature NUMERIC(5, 2) NOT NULL DEFAULT 4.2,
    target_temp_min NUMERIC(5, 2) NOT NULL DEFAULT 3.0,
    target_temp_max NUMERIC(5, 2) NOT NULL DEFAULT 6.0,
    current_humidity NUMERIC(5, 2) NOT NULL DEFAULT 78.0,
    target_humidity NUMERIC(5, 2) NOT NULL DEFAULT 85.0,
    reefer_power_status VARCHAR(30) NOT NULL DEFAULT 'ON',
    compressor_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE_COOLING',
    door_status VARCHAR(20) NOT NULL DEFAULT 'CLOSED',
    current_latitude NUMERIC(10, 6) NOT NULL DEFAULT 18.9500,
    current_longitude NUMERIC(10, 6) NOT NULL DEFAULT 72.8500,
    speed_knots NUMERIC(5, 2) NOT NULL DEFAULT 18.5,
    heading_degrees NUMERIC(5, 1) NOT NULL DEFAULT 285.0,
    current_sea_region VARCHAR(100) NOT NULL DEFAULT 'Arabian Sea',
    current_status VARCHAR(40) NOT NULL DEFAULT 'AT_SEA',
    origin_port VARCHAR(100) NOT NULL DEFAULT 'Nhava Sheva (JNPT), India',
    destination_port VARCHAR(100) NOT NULL DEFAULT 'Port of Rotterdam, Netherlands',
    transshipment_port VARCHAR(100) DEFAULT 'Port of Salalah / Suez',
    departure_time TIMESTAMP WITHOUT TIME ZONE DEFAULT (CURRENT_TIMESTAMP - INTERVAL '4 days'),
    estimated_arrival_time TIMESTAMP WITHOUT TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '12 days'),
    actual_arrival_time TIMESTAMP WITHOUT TIME ZONE,
    total_distance_nmi NUMERIC(10, 2) NOT NULL DEFAULT 6250.0,
    distance_travelled_nmi NUMERIC(10, 2) NOT NULL DEFAULT 2180.0,
    distance_remaining_nmi NUMERIC(10, 2) NOT NULL DEFAULT 4070.0,
    route_progress_pct NUMERIC(5, 2) NOT NULL DEFAULT 34.88,
    data_source VARCHAR(40) NOT NULL DEFAULT 'DEMO / SIMULATED DATA',
    seal_id VARCHAR(50),
    reefer_health_score INTEGER DEFAULT 95,
    reefer_health_status VARCHAR(30) DEFAULT 'GOOD',
    sensor_trust_score INTEGER DEFAULT 98,
    gps_anomaly_flag BOOLEAN DEFAULT FALSE,
    expected_dwell_hours NUMERIC(6, 1) DEFAULT 8.0,
    actual_dwell_hours NUMERIC(6, 1) DEFAULT 8.0,
    transshipment_count INTEGER DEFAULT 0,
    weather_risk_level VARCHAR(30) DEFAULT 'LOW',
    last_telemetry_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Ensure extended columns if table was created previously
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS seal_id VARCHAR(50);
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS reefer_health_score INTEGER DEFAULT 95;
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS reefer_health_status VARCHAR(30) DEFAULT 'GOOD';
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS sensor_trust_score INTEGER DEFAULT 98;
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS gps_anomaly_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS expected_dwell_hours NUMERIC(6, 1) DEFAULT 8.0;
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS actual_dwell_hours NUMERIC(6, 1) DEFAULT 8.0;
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS transshipment_count INTEGER DEFAULT 0;
ALTER TABLE shipping_containers ADD COLUMN IF NOT EXISTS weather_risk_level VARCHAR(30) DEFAULT 'LOW';

CREATE INDEX IF NOT EXISTS idx_containers_status ON shipping_containers(current_status);
CREATE INDEX IF NOT EXISTS idx_containers_vessel ON shipping_containers(current_vessel_name);


-- 2. MARINE ROUTE WAYPOINTS TABLE (Curated Nautical Routes)
CREATE TABLE IF NOT EXISTS marine_route_waypoints (
    waypoint_id BIGSERIAL PRIMARY KEY,
    route_code VARCHAR(50) NOT NULL,
    sequence_order INTEGER NOT NULL,
    waypoint_name VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    segment_type VARCHAR(40) NOT NULL DEFAULT 'OPEN_OCEAN',
    sea_region VARCHAR(100) NOT NULL,
    distance_from_origin_nmi NUMERIC(10, 2) NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_marine_waypoints_route ON marine_route_waypoints(route_code, sequence_order);


-- 3. CONTAINER LOCATION & TELEMETRY HISTORY TABLE
CREATE TABLE IF NOT EXISTS container_location_history (
    history_id BIGSERIAL PRIMARY KEY,
    container_id VARCHAR(50) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    sea_region VARCHAR(100) NOT NULL,
    speed_knots NUMERIC(5, 2) DEFAULT 18.0,
    heading_degrees NUMERIC(5, 1) DEFAULT 280.0,
    temperature NUMERIC(5, 2) NOT NULL,
    humidity NUMERIC(5, 2) NOT NULL,
    reefer_power_status VARCHAR(30) DEFAULT 'ON',
    compressor_status VARCHAR(30) DEFAULT 'ACTIVE_COOLING',
    door_status VARCHAR(20) DEFAULT 'CLOSED',
    distance_remaining_nmi NUMERIC(10, 2) DEFAULT 0.0,
    route_progress_pct NUMERIC(5, 2) DEFAULT 0.0,
    event_note TEXT,
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_container_history FOREIGN KEY (container_id) REFERENCES shipping_containers(container_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_container_hist_container ON container_location_history(container_id);
CREATE INDEX IF NOT EXISTS idx_container_hist_time ON container_location_history(recorded_at DESC);


-- 4. CONTAINER BLACK BOX EVENTS (Central Chronological Event Trail)
CREATE TABLE IF NOT EXISTS container_black_box_events (
    event_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    container_id VARCHAR(50) NOT NULL,
    event_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    event_type VARCHAR(60) NOT NULL,
    temperature NUMERIC(5, 2),
    humidity NUMERIC(5, 2),
    door_status VARCHAR(20) DEFAULT 'CLOSED',
    reefer_status VARCHAR(40) DEFAULT 'ACTIVE_COOLING',
    actor_role VARCHAR(100),
    evidence_ref VARCHAR(200),
    notes TEXT,
    severity VARCHAR(30) DEFAULT 'INFO',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blackbox_container ON container_black_box_events(container_id);
CREATE INDEX IF NOT EXISTS idx_blackbox_shipment ON container_black_box_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_blackbox_time ON container_black_box_events(event_timestamp ASC);


-- 5. DIGITAL CONTAINER SEALS TABLE
CREATE TABLE IF NOT EXISTS digital_seals (
    seal_id VARCHAR(50) PRIMARY KEY,
    container_id VARCHAR(50) NOT NULL,
    shipment_id VARCHAR(50) NOT NULL,
    origin_seal_number VARCHAR(100) NOT NULL,
    destination_verified_seal_number VARCHAR(100),
    applied_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    applied_location VARCHAR(150) NOT NULL,
    applied_by VARCHAR(100) NOT NULL,
    verified_timestamp TIMESTAMP WITHOUT TIME ZONE,
    verified_location VARCHAR(150),
    verified_by VARCHAR(100),
    seal_status VARCHAR(40) NOT NULL DEFAULT 'SEAL_INTACT',
    tamper_evidence_detected BOOLEAN DEFAULT FALSE,
    notes TEXT,
    photo_url VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seals_container ON digital_seals(container_id);
CREATE INDEX IF NOT EXISTS idx_seals_shipment ON digital_seals(shipment_id);


-- 6. MARINE WEATHER EVENTS TABLE (Simulated Weather Dynamics)
CREATE TABLE IF NOT EXISTS marine_weather_events (
    weather_event_id VARCHAR(50) PRIMARY KEY,
    container_id VARCHAR(50),
    sea_region VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    weather_condition VARCHAR(50) NOT NULL,
    wind_speed_knots NUMERIC(5, 1) DEFAULT 15.0,
    wave_height_meters NUMERIC(4, 1) DEFAULT 1.5,
    expected_delay_hours NUMERIC(5, 1) DEFAULT 0.0,
    severity_level VARCHAR(30) DEFAULT 'NORMAL',
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weather_container ON marine_weather_events(container_id);


-- 7. MULTIMODAL SHIPMENTS TABLE (End-to-End Visibility)
CREATE TABLE IF NOT EXISTS multimodal_shipments (
    shipment_id VARCHAR(50) PRIMARY KEY,
    container_id VARCHAR(50) REFERENCES shipping_containers(container_id) ON DELETE SET NULL,
    transport_mode VARCHAR(40) NOT NULL DEFAULT 'MULTIMODAL (Road + Port + Marine + Road)',
    produce_name VARCHAR(100) NOT NULL,
    harvest_date DATE DEFAULT (CURRENT_DATE - INTERVAL '6 days'),
    initial_shelf_life_hours NUMERIC(6, 1) NOT NULL DEFAULT 360.0,
    shelf_life_remaining_hours NUMERIC(6, 1) NOT NULL DEFAULT 180.0,
    initial_quantity_kg NUMERIC(10, 2) NOT NULL DEFAULT 1000.0,
    current_quantity_kg NUMERIC(10, 2) NOT NULL DEFAULT 998.0,
    delivered_quantity_kg NUMERIC(10, 2),
    quantity_loss_kg NUMERIC(10, 2) DEFAULT 2.0,
    unit_price_per_kg_inr NUMERIC(8, 2) DEFAULT 60.0,
    origin_farmer_location VARCHAR(150) NOT NULL DEFAULT 'Sahyadri Farm Cluster, Nashik, India',
    collection_center VARCHAR(150) NOT NULL DEFAULT 'Nashik Agri Packhouse CC-02',
    origin_truck_id VARCHAR(50) NOT NULL DEFAULT 'FTL-MH15-8821',
    origin_port_name VARCHAR(150) NOT NULL DEFAULT 'JNPT Nhava Sheva Terminal 4, Mumbai',
    vessel_name VARCHAR(100) NOT NULL DEFAULT 'MV AGRI STAR',
    voyage_number VARCHAR(50) NOT NULL DEFAULT 'VOY-2026-EU04',
    destination_port_name VARCHAR(150) NOT NULL DEFAULT 'Port of Rotterdam ECT Delta, Netherlands',
    destination_truck_id VARCHAR(50) DEFAULT 'EUR-NL-7742',
    final_buyer_name VARCHAR(150) NOT NULL DEFAULT 'EuroFresh Logistics BV, Rotterdam',
    current_multimodal_stage VARCHAR(50) NOT NULL DEFAULT 'VESSEL_TRANSIT',
    temperature_setpoint NUMERIC(5, 2) NOT NULL DEFAULT 4.0,
    temperature_min_limit NUMERIC(5, 2) NOT NULL DEFAULT 3.0,
    temperature_max_limit NUMERIC(5, 2) NOT NULL DEFAULT 6.0,
    target_humidity NUMERIC(5, 2) NOT NULL DEFAULT 85.0,
    overall_risk_score INTEGER NOT NULL DEFAULT 28,
    risk_category VARCHAR(30) NOT NULL DEFAULT 'LOW_RISK',
    risk_breakdown JSONB DEFAULT '{}'::jsonb,
    spoilage_status VARCHAR(40) NOT NULL DEFAULT 'SAFE',
    eta_destination_hours NUMERIC(6, 1) NOT NULL DEFAULT 140.0,
    departure_time TIMESTAMP WITHOUT TIME ZONE DEFAULT (CURRENT_TIMESTAMP - INTERVAL '4 days'),
    expected_delivery_time TIMESTAMP WITHOUT TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '12 days'),
    actual_delivery_time TIMESTAMP WITHOUT TIME ZONE,
    shipment_status VARCHAR(40) NOT NULL DEFAULT 'IN_TRANSIT',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE multimodal_shipments ADD COLUMN IF NOT EXISTS unit_price_per_kg_inr NUMERIC(8, 2) DEFAULT 60.0;
ALTER TABLE multimodal_shipments ALTER COLUMN transport_mode TYPE VARCHAR(120);
ALTER TABLE multimodal_shipments ALTER COLUMN shipment_status TYPE VARCHAR(100);
ALTER TABLE multimodal_shipments ALTER COLUMN spoilage_status TYPE VARCHAR(100);
ALTER TABLE multimodal_shipments ALTER COLUMN current_multimodal_stage TYPE VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_multimodal_container ON multimodal_shipments(container_id);
CREATE INDEX IF NOT EXISTS idx_multimodal_stage ON multimodal_shipments(current_multimodal_stage);
CREATE INDEX IF NOT EXISTS idx_multimodal_risk ON multimodal_shipments(risk_category);


-- 8. MULTIMODAL JOURNEY STAGES TABLE (Loss Prevention & Investigation Reconstruction)
CREATE TABLE IF NOT EXISTS multimodal_journey_stages (
    stage_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    stage_order INTEGER NOT NULL,
    stage_key VARCHAR(50) NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    stage_location VARCHAR(150) NOT NULL,
    timestamp_recorded TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    recorded_quantity_kg NUMERIC(10, 2) NOT NULL,
    recorded_temp_c NUMERIC(5, 2),
    recorded_humidity_pct NUMERIC(5, 2),
    door_status VARCHAR(20) DEFAULT 'CLOSED',
    refrigeration_status VARCHAR(30) DEFAULT 'ON',
    responsible_party VARCHAR(100) NOT NULL,
    evidence_available TEXT,
    discrepancy_kg NUMERIC(10, 2) DEFAULT 0.0,
    temp_excursion_min INTEGER DEFAULT 0,
    incident_flag BOOLEAN DEFAULT FALSE,
    incident_summary TEXT,
    data_payload JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_journey_shipment FOREIGN KEY (shipment_id) REFERENCES multimodal_shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journey_stages_shipment ON multimodal_journey_stages(shipment_id, stage_order);


-- 9. PORT HANDOVER EVENTS TABLE
CREATE TABLE IF NOT EXISTS port_handover_events (
    event_id BIGSERIAL PRIMARY KEY,
    container_id VARCHAR(50) NOT NULL,
    shipment_id VARCHAR(50) NOT NULL,
    port_code VARCHAR(50) NOT NULL,
    port_name VARCHAR(150) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    terminal_name VARCHAR(100),
    dwell_time_hours NUMERIC(6, 1) DEFAULT 0.0,
    expected_dwell_hours NUMERIC(6, 1) DEFAULT 8.0,
    congestion_level VARCHAR(30) DEFAULT 'LOW',
    inspection_result VARCHAR(50) DEFAULT 'CLEARED',
    recorded_temp_c NUMERIC(5, 2),
    power_source VARCHAR(50) DEFAULT 'PORT_TERMINAL_GRID',
    event_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    operator_name VARCHAR(100) NOT NULL DEFAULT 'Port Terminal Operator',
    verified BOOLEAN DEFAULT TRUE,
    notes TEXT
);

ALTER TABLE port_handover_events ADD COLUMN IF NOT EXISTS expected_dwell_hours NUMERIC(6, 1) DEFAULT 8.0;

CREATE INDEX IF NOT EXISTS idx_port_handover_container ON port_handover_events(container_id);
CREATE INDEX IF NOT EXISTS idx_port_handover_shipment ON port_handover_events(shipment_id);


-- 10. MARINE ALTERNATIVE BUYERS TABLE (Sell Before Spoilage Discovery)
CREATE TABLE IF NOT EXISTS marine_alternative_buyers (
    buyer_id VARCHAR(50) PRIMARY KEY,
    buyer_name VARCHAR(150) NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    port_or_city VARCHAR(100) NOT NULL,
    distance_km NUMERIC(8, 2) NOT NULL,
    distance_nmi NUMERIC(8, 2) NOT NULL,
    demand_quantity_kg NUMERIC(10, 2) NOT NULL,
    offered_price_per_kg_inr NUMERIC(8, 2) NOT NULL,
    delivery_deadline_hours NUMERIC(6, 1) NOT NULL,
    buyer_type VARCHAR(60) NOT NULL,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    match_compatibility_score INTEGER DEFAULT 95
);

CREATE INDEX IF NOT EXISTS idx_alt_buyers_distance ON marine_alternative_buyers(distance_km);
