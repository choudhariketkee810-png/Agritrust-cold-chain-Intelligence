-- ====================================================================
-- AGRITRUST: MULTI-MODAL LOGISTICS INTELLIGENCE SCHEMA (Road + Marine + Air)
-- Database: ftl_cold_chain
-- Features: Smart Multi-Route Shipment Planner, 3-Mode Comparison,
--           Rate Cards, Quotes, Bookings, Multimodal Route Segments,
--           PIN Code & Hub Directory, Port & Airport Registry,
--           Chargeable Weight Calculator, AI Recommendation Engine
-- ====================================================================

-- 1. PINCODE & REGION DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS pincode_directory (
    pincode VARCHAR(10) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    region_zone VARCHAR(50) DEFAULT 'WEST',
    is_coastal BOOLEAN DEFAULT FALSE,
    nearest_port_id VARCHAR(50),
    distance_to_port_km NUMERIC(8, 2) DEFAULT 0.0,
    nearest_airport_id VARCHAR(50),
    distance_to_airport_km NUMERIC(8, 2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pincode_city ON pincode_directory(city);
CREATE INDEX IF NOT EXISTS idx_pincode_state ON pincode_directory(state);


-- 2. PORTS & AIRPORTS REGISTRY TABLE
CREATE TABLE IF NOT EXISTS ports_airports_registry (
    facility_id VARCHAR(50) PRIMARY KEY,
    facility_type VARCHAR(20) NOT NULL, -- 'PORT' or 'AIRPORT'
    name VARCHAR(150) NOT NULL,
    code VARCHAR(10) NOT NULL, -- IATA (e.g. BOM, DEL) or UN/LOCODE (e.g. INNSA, NLRTM)
    city VARCHAR(100) NOT NULL,
    state_or_country VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    has_cold_storage BOOLEAN DEFAULT TRUE,
    cold_storage_capacity_cbm NUMERIC(12, 2) DEFAULT 5000.0,
    active_reefer_plug_points INTEGER DEFAULT 350,
    supports_envirotainer BOOLEAN DEFAULT TRUE,
    customs_avg_clearance_hours NUMERIC(5, 1) DEFAULT 4.0,
    terminal_handling_base_rate NUMERIC(10, 2) DEFAULT 3500.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registry_type ON ports_airports_registry(facility_type);
CREATE INDEX IF NOT EXISTS idx_registry_city ON ports_airports_registry(city);


-- 3. TRANSPORT RATE CARDS TABLE (Configurable Pricing Parameters)
CREATE TABLE IF NOT EXISTS transport_rate_cards (
    rate_id VARCHAR(50) PRIMARY KEY,
    mode VARCHAR(20) NOT NULL, -- 'ROAD', 'MARINE', 'AIR'
    service_code VARCHAR(60) NOT NULL UNIQUE,
    service_name VARCHAR(120) NOT NULL,
    description TEXT,
    min_weight_kg NUMERIC(10, 2) DEFAULT 10.0,
    max_weight_kg NUMERIC(10, 2) DEFAULT 25000.0,
    base_freight_per_km_or_kg NUMERIC(10, 2) NOT NULL, -- Road: INR/km, Marine: INR/nmi/TEU, Air: INR/kg
    minimum_charge NUMERIC(10, 2) NOT NULL DEFAULT 1500.0,
    first_mile_rate_per_km NUMERIC(8, 2) DEFAULT 35.0,
    last_mile_rate_per_km NUMERIC(8, 2) DEFAULT 38.0,
    loading_unloading_rate_per_tonne NUMERIC(8, 2) DEFAULT 450.0,
    handling_doc_charge NUMERIC(8, 2) DEFAULT 500.0,
    cold_chain_surcharge_pct NUMERIC(5, 2) DEFAULT 25.0,
    fuel_surcharge_pct NUMERIC(5, 2) DEFAULT 10.0,
    toll_rate_per_km NUMERIC(8, 2) DEFAULT 3.20,
    insurance_rate_pct NUMERIC(6, 3) DEFAULT 0.35, -- 0.35% of cargo declared value
    tax_rate_pct NUMERIC(5, 2) DEFAULT 18.0, -- GST 18%
    emissions_co2_kg_per_tonne_km NUMERIC(6, 4) NOT NULL DEFAULT 0.105,
    average_speed_kmh NUMERIC(6, 2) NOT NULL DEFAULT 45.0,
    volumetric_divisor NUMERIC(8, 2) DEFAULT 5000.0, -- For Air (IATA 5000 cm3/kg)
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rates_mode ON transport_rate_cards(mode);


-- 4. CARRIER SERVICES TABLE
CREATE TABLE IF NOT EXISTS carrier_services (
    carrier_id VARCHAR(50) PRIMARY KEY,
    carrier_name VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL, -- 'ROAD', 'MARINE', 'AIR'
    service_tier VARCHAR(50) NOT NULL DEFAULT 'STANDARD', -- 'ECONOMY', 'STANDARD', 'EXPRESS', 'COLD_CHAIN_SPECIALIST'
    vehicle_or_vessel_types JSONB DEFAULT '[]'::jsonb,
    reliability_score INTEGER DEFAULT 96,
    on_time_performance_pct NUMERIC(5, 2) DEFAULT 97.5,
    cold_chain_certified BOOLEAN DEFAULT TRUE,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(50),
    is_live_integration BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carrier_mode ON carrier_services(mode);


-- 5. SHIPMENT QUOTES TABLE
CREATE TABLE IF NOT EXISTS shipment_quotes (
    quote_id VARCHAR(50) PRIMARY KEY,
    quote_reference VARCHAR(50) NOT NULL UNIQUE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    user_role VARCHAR(50) DEFAULT 'LOGISTICS',
    pickup_pincode VARCHAR(10) NOT NULL,
    pickup_location VARCHAR(150) NOT NULL,
    destination_pincode VARCHAR(10) NOT NULL,
    destination_location VARCHAR(150) NOT NULL,
    cargo_weight_kg NUMERIC(10, 2) NOT NULL,
    cargo_type VARCHAR(80) NOT NULL, -- 'Vegetables', 'Fruits', 'Dairy', 'Frozen Food', 'Pharmaceuticals', 'General Goods'
    cargo_volume_cbm NUMERIC(8, 3),
    package_length_cm NUMERIC(8, 2),
    package_width_cm NUMERIC(8, 2),
    package_height_cm NUMERIC(8, 2),
    is_perishable BOOLEAN NOT NULL DEFAULT TRUE,
    shelf_life_days NUMERIC(6, 1) DEFAULT 7.0,
    required_delivery_date TIMESTAMP WITHOUT TIME ZONE,
    urgency_level VARCHAR(30) DEFAULT 'STANDARD', -- 'STANDARD', 'EXPRESS', 'CRITICAL'
    temperature_requirement VARCHAR(60) DEFAULT 'Chilled (2°C to 8°C)',
    temp_min_c NUMERIC(5, 2) DEFAULT 2.0,
    temp_max_c NUMERIC(5, 2) DEFAULT 8.0,
    insurance_preference VARCHAR(30) DEFAULT 'STANDARD', -- 'NONE', 'STANDARD', 'COMPREHENSIVE'
    declared_cargo_value_inr NUMERIC(12, 2) DEFAULT 250000.0,
    priority_preference VARCHAR(30) DEFAULT 'BALANCED', -- 'COST', 'BALANCED', 'SPEED'
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_user ON shipment_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_ref ON shipment_quotes(quote_reference);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON shipment_quotes(created_at DESC);


-- 6. ROUTE OPTIONS TABLE (Computed Comparison for Road, Marine & Air)
CREATE TABLE IF NOT EXISTS route_options (
    option_id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES shipment_quotes(quote_id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL, -- 'ROAD', 'MARINE', 'AIR'
    mode_title VARCHAR(100) NOT NULL,
    is_feasible BOOLEAN NOT NULL DEFAULT TRUE,
    infeasibility_reason TEXT,
    carrier_name VARCHAR(100) DEFAULT 'AGRITrust Verified Network',
    vehicle_or_vessel_desc VARCHAR(150) NOT NULL,
    total_estimated_cost_inr NUMERIC(12, 2) NOT NULL,
    estimated_transit_hours NUMERIC(8, 1) NOT NULL,
    estimated_delivery_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    total_distance_km NUMERIC(10, 2) NOT NULL,
    actual_weight_kg NUMERIC(10, 2) NOT NULL,
    volumetric_weight_kg NUMERIC(10, 2),
    chargeable_weight_kg NUMERIC(10, 2) NOT NULL,
    origin_facility_name VARCHAR(150),
    destination_facility_name VARCHAR(150),
    cost_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    co2_emissions_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    cold_chain_rating VARCHAR(30) DEFAULT 'EXCELLENT',
    perishability_risk_level VARCHAR(30) DEFAULT 'LOW',
    shelf_life_depletion_pct NUMERIC(5, 2) DEFAULT 15.0,
    ai_recommendation_badges JSONB DEFAULT '[]'::jsonb,
    ai_recommendation_score INTEGER DEFAULT 85,
    ai_reasoning_summary TEXT,
    route_waypoints JSONB DEFAULT '[]'::jsonb,
    data_source VARCHAR(80) DEFAULT 'Illustrative Estimates (Configurable Rates)',
    pricing_updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_route_opt_quote ON route_options(quote_id);
CREATE INDEX IF NOT EXISTS idx_route_opt_mode ON route_options(mode);


-- 7. MULTIMODAL SHIPMENT BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS multimodal_bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    booking_reference VARCHAR(50) NOT NULL UNIQUE,
    shipment_id VARCHAR(50) NOT NULL,
    quote_id VARCHAR(50) REFERENCES shipment_quotes(quote_id) ON DELETE SET NULL,
    selected_option_id VARCHAR(50) REFERENCES route_options(option_id) ON DELETE SET NULL,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    selected_mode VARCHAR(20) NOT NULL, -- 'ROAD', 'MARINE', 'AIR'
    carrier_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    produce_name VARCHAR(100) NOT NULL,
    cargo_weight_kg NUMERIC(10, 2) NOT NULL,
    pickup_pincode VARCHAR(10) NOT NULL,
    pickup_location VARCHAR(150) NOT NULL,
    destination_pincode VARCHAR(10) NOT NULL,
    destination_location VARCHAR(150) NOT NULL,
    total_amount_inr NUMERIC(12, 2) NOT NULL,
    cost_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    booking_status VARCHAR(40) NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
    payment_status VARCHAR(30) DEFAULT 'ESCROW_HOLD',
    temp_setpoint_c NUMERIC(5, 2) DEFAULT 4.0,
    temp_min_c NUMERIC(5, 2) DEFAULT 2.0,
    temp_max_c NUMERIC(5, 2) DEFAULT 8.0,
    target_humidity_pct NUMERIC(5, 2) DEFAULT 85.0,
    sender_name VARCHAR(100) NOT NULL DEFAULT 'AGRITrust Verified Producer',
    sender_phone VARCHAR(50) DEFAULT '+91 98220 12345',
    receiver_name VARCHAR(100) NOT NULL DEFAULT 'Metro Agro Hub / Retailer',
    receiver_phone VARCHAR(50) DEFAULT '+91 98450 67890',
    special_instructions TEXT,
    estimated_departure_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estimated_delivery_time TIMESTAMP WITHOUT TIME ZONE,
    actual_delivery_time TIMESTAMP WITHOUT TIME ZONE,
    current_segment_index INTEGER DEFAULT 1,
    current_status_summary VARCHAR(200) DEFAULT 'Booking confirmed. Dispatch preparation underway.',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON multimodal_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_shipment ON multimodal_bookings(shipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON multimodal_bookings(booking_status);


-- 8. ROUTE SEGMENTS TABLE (Multimodal Chain of Custody & Milestones)
CREATE TABLE IF NOT EXISTS route_segments (
    segment_id VARCHAR(50) PRIMARY KEY,
    booking_id VARCHAR(50) REFERENCES multimodal_bookings(booking_id) ON DELETE CASCADE,
    shipment_id VARCHAR(50) NOT NULL,
    segment_order INTEGER NOT NULL,
    segment_type VARCHAR(50) NOT NULL, -- 'FIRST_MILE_ROAD', 'PORT_STUFFING', 'SEA_VOYAGE', 'AIRPORT_TRANSFER', 'AIR_FLIGHT', 'LONG_HAUL_ROAD', 'LAST_MILE_ROAD'
    segment_title VARCHAR(120) NOT NULL,
    origin_point VARCHAR(150) NOT NULL,
    destination_point VARCHAR(150) NOT NULL,
    distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    estimated_duration_hours NUMERIC(6, 1) NOT NULL,
    segment_status VARCHAR(40) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACTIVE', 'COMPLETED', 'DELAYED'
    carrier_operator VARCHAR(100) NOT NULL,
    vehicle_or_vessel_identifier VARCHAR(100),
    custody_holder VARCHAR(100) NOT NULL,
    temp_setpoint_c NUMERIC(5, 2) DEFAULT 4.0,
    current_temp_c NUMERIC(5, 2),
    humidity_pct NUMERIC(5, 2),
    departure_time TIMESTAMP WITHOUT TIME ZONE,
    arrival_time TIMESTAMP WITHOUT TIME ZONE,
    actual_arrival_time TIMESTAMP WITHOUT TIME ZONE,
    is_telemetry_simulated BOOLEAN DEFAULT TRUE,
    telematics_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_segments_booking ON route_segments(booking_id);
CREATE INDEX IF NOT EXISTS idx_segments_shipment ON route_segments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_segments_order ON route_segments(booking_id, segment_order);
