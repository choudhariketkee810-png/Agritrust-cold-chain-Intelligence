CREATE TABLE vehicles (
    vehicle_id VARCHAR(20) PRIMARY KEY,
    vehicle_number VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(30),
    capacity_kg INTEGER,
    refrigeration_status VARCHAR(20),
    status VARCHAR(20)
);

CREATE TABLE shipments (
    shipment_id VARCHAR(20) PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    origin VARCHAR(100),
    destination VARCHAR(100),
    target_temp_min DECIMAL(5,2),
    target_temp_max DECIMAL(5,2),
    shipment_status VARCHAR(30),
    departure_time TIMESTAMP,
    expected_delivery_time TIMESTAMP,
    CONSTRAINT fk_shipment_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(vehicle_id)
);

CREATE TABLE telemetry (
    telemetry_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(20) NOT NULL,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    door_status VARCHAR(20),
    refrigeration_status VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE telemetry
ADD CONSTRAINT fk_telemetry_shipment
FOREIGN KEY (shipment_id)
REFERENCES shipments(shipment_id);

INSERT INTO vehicles (
    vehicle_id,
    vehicle_number,
    vehicle_type,
    capacity_kg,
    refrigeration_status,
    status
)
VALUES (
    'FTL-V001',
    'MH15AB1234',
    'REEFER',
    5000,
    'ON',
    'ACTIVE'
);

INSERT INTO shipments (
    shipment_id,
    vehicle_id,
    product_name,
    origin,
    destination,
    target_temp_min,
    target_temp_max,
    shipment_status,
    departure_time,
    expected_delivery_time
)
VALUES (
    'SHP-0001',
    'FTL-V001',
    'Mango',
    'Nashik',
    'Mumbai',
    10.00,
    13.00,
    'IN TRANSIT',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '8 hours'
);

INSERT INTO telemetry (
    shipment_id,
    temperature,
    humidity,
    latitude,
    longitude,
    door_status,
    refrigeration_status
)
VALUES (
    'SHP-0001',
    11.20,
    68.00,
    20.0059,
    73.8244,
    'CLOSED',
    'ON'
);

SELECT * FROM telemetry;
SELECT *
FROM telemetry
ORDER BY recorded_at DESC
LIMIT 10;

CREATE TABLE alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    shipment_id VARCHAR(20) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    recommended_action TEXT,
    temperature DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OPEN'
);
ALTER TABLE alerts
ADD CONSTRAINT fk_alert_shipment
FOREIGN KEY (shipment_id)
REFERENCES shipments(shipment_id);
SELECT * FROM alerts;

SELECT * 
FROM alerts
ORDER BY created_at DESC;

SELECT
    alert_id,
    shipment_id,
    alert_type,
    severity,
    temperature,
    status,
    created_at
FROM alerts
ORDER BY created_at DESC;
SELECT COUNT(*)
FROM alerts
WHERE shipment_id = 'SHP-0001'
  AND alert_type = 'HIGH_TEMPERATURE'
  AND status = 'OPEN';
  ALTER TABLE alerts
ADD COLUMN resolved_at TIMESTAMP;

SELECT
    alert_id,
    status,
    created_at,
    resolved_at
FROM alerts
ORDER BY alert_id DESC;