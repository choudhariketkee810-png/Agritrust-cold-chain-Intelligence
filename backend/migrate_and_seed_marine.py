"""
AGRITrust — Marine Route & Multimodal Intelligence Migration and Seeder
Populates realistic maritime corridors, shipping containers, reefer telemetry,
container black box events, digital seals, weather events, journey stages,
port handovers, alternative buyers, and 5 comprehensive demonstration scenarios.
"""

import psycopg2
from psycopg2.extras import RealDictCursor, Json
from datetime import datetime, timedelta
import json
import uuid

def get_connection():
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="ftl_cold_chain",
        user="postgres",
        password="1234"
    )

def run_migration_and_seed():
    print("=" * 80)
    print(" AGRITRUST — ADVANCED MULTIMODAL MARINE INTELLIGENCE & LOSS PREVENTION SEED")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Apply DDL Schema
    print("\n[STEP 1] Applying Marine & Multimodal Schema...")
    with open("agritrust_marine_multimodal_schema.sql", "r") as f:
        schema_sql = f.read()
    cur.execute(schema_sql)
    conn.commit()
    print("  [SUCCESS] Tables shipping_containers, marine_route_waypoints, container_location_history,")
    print("            container_black_box_events, digital_seals, marine_weather_events,")
    print("            multimodal_shipments, multimodal_journey_stages, port_handover_events,")
    print("            marine_alternative_buyers verified.")

    now = datetime.now()

    # 2. Seed Nautical Route Waypoints
    print("\n[STEP 2] Seeding Maritime Route Waypoints...")
    cur.execute("DELETE FROM marine_route_waypoints;")

    waypoints_data = [
        # ROUTE 1: Nhava Sheva (JNPT) -> Rotterdam (via Suez Canal)
        ("ROUTE-JNPT-ROTTERDAM", 1, "JNPT Nhava Sheva Terminal", 18.9500, 72.8500, "PORT_ORIGIN", "Arabian Sea (India)", 0.0),
        ("ROUTE-JNPT-ROTTERDAM", 2, "Arabian Sea Offshore Corridor", 17.5000, 68.2000, "OPEN_OCEAN", "Arabian Sea", 320.0),
        ("ROUTE-JNPT-ROTTERDAM", 3, "Gulf of Aden East Approach", 13.8000, 52.0000, "OPEN_OCEAN", "Gulf of Aden", 1250.0),
        ("ROUTE-JNPT-ROTTERDAM", 4, "Bab-el-Mandeb Strait", 12.5800, 43.3400, "STRAIT", "Bab-el-Mandeb", 1800.0),
        ("ROUTE-JNPT-ROTTERDAM", 5, "Red Sea Central Channel", 20.0000, 38.5000, "OPEN_OCEAN", "Red Sea", 2350.0),
        ("ROUTE-JNPT-ROTTERDAM", 6, "Gulf of Suez Approach", 27.8000, 33.7000, "CANAL_PASSAGE", "Gulf of Suez", 2950.0),
        ("ROUTE-JNPT-ROTTERDAM", 7, "Suez Canal Transit (Port Said)", 31.2600, 32.3000, "CANAL_PASSAGE", "Suez Canal", 3180.0),
        ("ROUTE-JNPT-ROTTERDAM", 8, "Eastern Mediterranean Sea", 34.5000, 24.5000, "OPEN_OCEAN", "Mediterranean Sea", 3650.0),
        ("ROUTE-JNPT-ROTTERDAM", 9, "Strait of Sicily Passage", 37.2000, 11.5000, "STRAIT", "Mediterranean Sea", 4350.0),
        ("ROUTE-JNPT-ROTTERDAM", 10, "Strait of Gibraltar", 35.9500, -5.6000, "STRAIT", "Strait of Gibraltar", 5200.0),
        ("ROUTE-JNPT-ROTTERDAM", 11, "Bay of Biscay Corridor", 45.0000, -7.5000, "OPEN_OCEAN", "Atlantic Ocean", 5750.0),
        ("ROUTE-JNPT-ROTTERDAM", 12, "English Channel Eastbound", 50.1000, -0.5000, "STRAIT", "English Channel", 6080.0),
        ("ROUTE-JNPT-ROTTERDAM", 13, "Port of Rotterdam (ECT Delta)", 51.9500, 4.1300, "PORT_DESTINATION", "North Sea (Netherlands)", 6250.0),

        # ROUTE 2: Mundra -> Jebel Ali (Dubai)
        ("ROUTE-MUNDRA-JEBELALI", 1, "Mundra Port Terminal", 22.7500, 69.7000, "PORT_ORIGIN", "Gulf of Kutch", 0.0),
        ("ROUTE-MUNDRA-JEBELALI", 2, "Northern Arabian Sea", 23.5000, 64.0000, "OPEN_OCEAN", "Arabian Sea", 380.0),
        ("ROUTE-MUNDRA-JEBELALI", 3, "Gulf of Oman Western Corridor", 24.8000, 58.5000, "OPEN_OCEAN", "Gulf of Oman", 720.0),
        ("ROUTE-MUNDRA-JEBELALI", 4, "Strait of Hormuz", 26.5600, 56.4500, "STRAIT", "Strait of Hormuz", 910.0),
        ("ROUTE-MUNDRA-JEBELALI", 5, "Port of Jebel Ali (DP World)", 25.0100, 55.0600, "PORT_DESTINATION", "Persian Gulf (UAE)", 1050.0),

        # ROUTE 3: Chennai -> Singapore
        ("ROUTE-CHENNAI-SINGAPORE", 1, "Chennai Port Container Terminal", 13.0800, 80.3000, "PORT_ORIGIN", "Bay of Bengal (India)", 0.0),
        ("ROUTE-CHENNAI-SINGAPORE", 2, "Central Bay of Bengal", 10.0000, 86.5000, "OPEN_OCEAN", "Bay of Bengal", 430.0),
        ("ROUTE-CHENNAI-SINGAPORE", 3, "Andaman Sea West Entry", 6.8000, 94.0000, "OPEN_OCEAN", "Andaman Sea", 920.0),
        ("ROUTE-CHENNAI-SINGAPORE", 4, "Strait of Malacca North", 4.2000, 99.5000, "STRAIT", "Strait of Malacca", 1340.0),
        ("ROUTE-CHENNAI-SINGAPORE", 5, "Port of Singapore (PSA Pasir Panjang)", 1.2700, 103.7800, "PORT_DESTINATION", "Singapore Strait", 1620.0)
    ]

    for wp in waypoints_data:
        cur.execute("""
            INSERT INTO marine_route_waypoints (
                route_code, sequence_order, waypoint_name, latitude, longitude,
                segment_type, sea_region, distance_from_origin_nmi
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, wp)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(waypoints_data)} nautical waypoints.")

    # 3. Clean and Seed Shipping Containers (5 Scenarios)
    print("\n[STEP 3] Seeding 5 Shipping Containers with Reefer Telematics...")
    cur.execute("DELETE FROM container_black_box_events;")
    cur.execute("DELETE FROM digital_seals;")
    cur.execute("DELETE FROM marine_weather_events;")
    cur.execute("DELETE FROM container_location_history;")
    cur.execute("DELETE FROM multimodal_journey_stages;")
    cur.execute("DELETE FROM port_handover_events;")
    cur.execute("DELETE FROM multimodal_shipments;")
    cur.execute("DELETE FROM shipping_containers;")

    containers_data = [
        # Scenario 1: NORMAL (MSKU1234567)
        {
            "container_id": "MSKU1234567",
            "container_type": "40ft High Cube Reefer (Controlled Atmosphere)",
            "current_vessel_name": "MV AGRI STAR",
            "voyage_number": "VOY-2026-EU04",
            "carrier_name": "Maersk Line",
            "set_temperature": 4.0,
            "current_temperature": 4.2,
            "target_temp_min": 3.0,
            "target_temp_max": 6.0,
            "current_humidity": 78.0,
            "target_humidity": 85.0,
            "reefer_power_status": "ON",
            "compressor_status": "ACTIVE_COOLING",
            "door_status": "CLOSED",
            "current_latitude": 20.0000,
            "current_longitude": 38.5000, # Red Sea
            "speed_knots": 18.5,
            "heading_degrees": 315.0,
            "current_sea_region": "Red Sea (Central Channel)",
            "current_status": "AT_SEA",
            "origin_port": "Nhava Sheva (JNPT), India",
            "destination_port": "Port of Rotterdam, Netherlands",
            "transshipment_port": "Port of Salalah / Suez Canal",
            "departure_time": now - timedelta(days=4, hours=6),
            "estimated_arrival_time": now + timedelta(days=8, hours=12),
            "actual_arrival_time": None,
            "total_distance_nmi": 6250.0,
            "distance_travelled_nmi": 2350.0,
            "distance_remaining_nmi": 3900.0,
            "route_progress_pct": 37.6,
            "data_source": "DEMO / SIMULATED DATA",
            "seal_id": "SEAL-MSK-0199",
            "reefer_health_score": 98,
            "reefer_health_status": "GOOD",
            "sensor_trust_score": 99,
            "gps_anomaly_flag": False,
            "expected_dwell_hours": 8.0,
            "actual_dwell_hours": 7.5,
            "transshipment_count": 0,
            "weather_risk_level": "LOW"
        },
        # Scenario 2: TEMPERATURE EXCURSION & REEFER DEGRADATION (CMAU8492019)
        {
            "container_id": "CMAU8492019",
            "container_type": "40ft High Cube Reefer",
            "current_vessel_name": "CMA CGM GANGA",
            "voyage_number": "VOY-2026-EU09",
            "carrier_name": "CMA CGM",
            "set_temperature": 4.0,
            "current_temperature": 8.7, # Severe excursion!
            "target_temp_min": 3.0,
            "target_temp_max": 6.0,
            "current_humidity": 64.0,
            "target_humidity": 85.0,
            "reefer_power_status": "BACKUP_GENSET",
            "compressor_status": "DEFROST_ANOMALY",
            "door_status": "CLOSED",
            "current_latitude": 13.8000,
            "current_longitude": 52.0000, # Gulf of Aden
            "speed_knots": 16.2,
            "heading_degrees": 265.0,
            "current_sea_region": "Gulf of Aden East Approach",
            "current_status": "AT_SEA",
            "origin_port": "Nhava Sheva (JNPT), India",
            "destination_port": "Port of Rotterdam, Netherlands",
            "transshipment_port": "Port of Jeddah",
            "departure_time": now - timedelta(days=2, hours=14),
            "estimated_arrival_time": now + timedelta(days=11, hours=4),
            "actual_arrival_time": None,
            "total_distance_nmi": 6250.0,
            "distance_travelled_nmi": 1250.0,
            "distance_remaining_nmi": 5000.0,
            "route_progress_pct": 20.0,
            "data_source": "DEMO / SIMULATED DATA",
            "seal_id": "SEAL-CMA-9921",
            "reefer_health_score": 54,
            "reefer_health_status": "FAIR / DECLINING",
            "sensor_trust_score": 94,
            "gps_anomaly_flag": False,
            "expected_dwell_hours": 8.0,
            "actual_dwell_hours": 12.8,
            "transshipment_count": 1,
            "weather_risk_level": "MEDIUM"
        },
        # Scenario 3: PORT DWELL DELAY (HAPAG3948123)
        {
            "container_id": "HAPAG3948123",
            "container_type": "20ft ISO Reefer",
            "current_vessel_name": "HAPAG EXPRESS",
            "voyage_number": "VOY-2026-ME02",
            "carrier_name": "Hapag-Lloyd",
            "set_temperature": 12.0,
            "current_temperature": 11.8,
            "target_temp_min": 10.0,
            "target_temp_max": 14.0,
            "current_humidity": 88.0,
            "target_humidity": 90.0,
            "reefer_power_status": "ON",
            "compressor_status": "ACTIVE_COOLING",
            "door_status": "CLOSED",
            "current_latitude": 24.8000,
            "current_longitude": 58.5000, # Gulf of Oman
            "speed_knots": 19.1,
            "heading_degrees": 298.0,
            "current_sea_region": "Gulf of Oman Corridor",
            "current_status": "PORT_DWELL",
            "origin_port": "Mundra Port, Gujarat, India",
            "destination_port": "Port of Jebel Ali, UAE",
            "transshipment_port": "Direct Call",
            "departure_time": now - timedelta(days=1, hours=8),
            "estimated_arrival_time": now + timedelta(hours=14),
            "actual_arrival_time": None,
            "total_distance_nmi": 1050.0,
            "distance_travelled_nmi": 720.0,
            "distance_remaining_nmi": 330.0,
            "route_progress_pct": 68.57,
            "data_source": "DEMO / SIMULATED DATA",
            "seal_id": "SEAL-HPG-3310",
            "reefer_health_score": 88,
            "reefer_health_status": "GOOD",
            "sensor_trust_score": 96,
            "gps_anomaly_flag": False,
            "expected_dwell_hours": 8.0,
            "actual_dwell_hours": 22.0, # 14h delay! Consumed 34% shelf life
            "transshipment_count": 0,
            "weather_risk_level": "LOW"
        },
        # Scenario 4: SHELF-LIFE CRISIS & WEATHER DELAY (ONEU9284102)
        {
            "container_id": "ONEU9284102",
            "container_type": "40ft High Cube Reefer (CA Atmosphere)",
            "current_vessel_name": "ONE HARMONY",
            "voyage_number": "VOY-2026-SG11",
            "carrier_name": "Ocean Network Express",
            "set_temperature": 2.0,
            "current_temperature": 2.2,
            "target_temp_min": 1.0,
            "target_temp_max": 4.0,
            "current_humidity": 90.0,
            "target_humidity": 92.0,
            "reefer_power_status": "ON",
            "compressor_status": "ACTIVE_COOLING",
            "door_status": "CLOSED",
            "current_latitude": 4.2000,
            "current_longitude": 99.5000, # Strait of Malacca
            "speed_knots": 8.5, # Slowed by storm
            "heading_degrees": 135.0,
            "current_sea_region": "Strait of Malacca (Storm Corridor)",
            "current_status": "AT_SEA",
            "origin_port": "Chennai Port, India",
            "destination_port": "Port of Singapore",
            "transshipment_port": "Direct Call",
            "departure_time": now - timedelta(days=3, hours=10),
            "estimated_arrival_time": now + timedelta(hours=48), # Storm pushed ETA to 48h!
            "actual_arrival_time": None,
            "total_distance_nmi": 1620.0,
            "distance_travelled_nmi": 1340.0,
            "distance_remaining_nmi": 280.0,
            "route_progress_pct": 82.72,
            "data_source": "DEMO / SIMULATED DATA",
            "seal_id": "SEAL-ONE-8831",
            "reefer_health_score": 82,
            "reefer_health_status": "GOOD",
            "sensor_trust_score": 93,
            "gps_anomaly_flag": False,
            "expected_dwell_hours": 6.0,
            "actual_dwell_hours": 6.0,
            "transshipment_count": 0,
            "weather_risk_level": "HIGH"
        },
        # Scenario 5: FLAGSHIP MULTIPLE INCIDENT & FULL INVESTIGATION (MEDU7719203)
        {
            "container_id": "MEDU7719203",
            "container_type": "40ft High Cube Reefer",
            "current_vessel_name": "MSC MEDITERRANEA",
            "voyage_number": "VOY-2026-IT05",
            "carrier_name": "MSC Mediterranean Shipping",
            "set_temperature": 11.0,
            "current_temperature": 9.2,
            "target_temp_min": 10.0,
            "target_temp_max": 13.0,
            "current_humidity": 72.0,
            "target_humidity": 85.0,
            "reefer_power_status": "ON",
            "compressor_status": "ACTIVE_COOLING",
            "door_status": "CLOSED",
            "current_latitude": 37.2000,
            "current_longitude": 11.5000, # Strait of Sicily
            "speed_knots": 17.8,
            "heading_degrees": 290.0,
            "current_sea_region": "Strait of Sicily / Mediterranean",
            "current_status": "PORT_DESTINATION",
            "origin_port": "JNPT Nhava Sheva Terminal 2, Mumbai",
            "destination_port": "Port of Genoa / Rotterdam Hub",
            "transshipment_port": "Port of Salalah & Port Said",
            "departure_time": now - timedelta(days=6, hours=12),
            "estimated_arrival_time": now + timedelta(hours=8),
            "actual_arrival_time": None,
            "total_distance_nmi": 5400.0,
            "distance_travelled_nmi": 4350.0,
            "distance_remaining_nmi": 1050.0,
            "route_progress_pct": 80.55,
            "data_source": "DEMO / SIMULATED DATA",
            "seal_id": "SEAL-MSC-9948",
            "reefer_health_score": 62,
            "reefer_health_status": "FAIR / DECLINING",
            "sensor_trust_score": 88,
            "gps_anomaly_flag": False,
            "expected_dwell_hours": 8.0,
            "actual_dwell_hours": 24.0, # 16h dwell delay
            "transshipment_count": 2, # Multiple transshipments
            "weather_risk_level": "MEDIUM"
        }
    ]

    for c in containers_data:
        cur.execute("""
            INSERT INTO shipping_containers (
                container_id, container_type, current_vessel_name, voyage_number,
                carrier_name, set_temperature, current_temperature, target_temp_min,
                target_temp_max, current_humidity, target_humidity, reefer_power_status,
                compressor_status, door_status, current_latitude, current_longitude,
                speed_knots, heading_degrees, current_sea_region, current_status,
                origin_port, destination_port, transshipment_port, departure_time,
                estimated_arrival_time, actual_arrival_time, total_distance_nmi,
                distance_travelled_nmi, distance_remaining_nmi, route_progress_pct,
                data_source, seal_id, reefer_health_score, reefer_health_status,
                sensor_trust_score, gps_anomaly_flag, expected_dwell_hours,
                actual_dwell_hours, transshipment_count, weather_risk_level, last_telemetry_at
            ) VALUES (
                %(container_id)s, %(container_type)s, %(current_vessel_name)s, %(voyage_number)s,
                %(carrier_name)s, %(set_temperature)s, %(current_temperature)s, %(target_temp_min)s,
                %(target_temp_max)s, %(current_humidity)s, %(target_humidity)s, %(reefer_power_status)s,
                %(compressor_status)s, %(door_status)s, %(current_latitude)s, %(current_longitude)s,
                %(speed_knots)s, %(heading_degrees)s, %(current_sea_region)s, %(current_status)s,
                %(origin_port)s, %(destination_port)s, %(transshipment_port)s, %(departure_time)s,
                %(estimated_arrival_time)s, %(actual_arrival_time)s, %(total_distance_nmi)s,
                %(distance_travelled_nmi)s, %(distance_remaining_nmi)s, %(route_progress_pct)s,
                %(data_source)s, %(seal_id)s, %(reefer_health_score)s, %(reefer_health_status)s,
                %(sensor_trust_score)s, %(gps_anomaly_flag)s, %(expected_dwell_hours)s,
                %(actual_dwell_hours)s, %(transshipment_count)s, %(weather_risk_level)s, CURRENT_TIMESTAMP
            );
        """, c)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(containers_data)} shipping containers.")

    # 4. Seed Container Black Box Events (Central Chronological Trail)
    print("\n[STEP 4] Seeding Container Black Box Events...")
    black_box_events = [
        # MSKU1234567 (Normal Trail)
        ("BB-MSK-01", "AGRI-SHP-0001", "MSKU1234567", now - timedelta(days=4, hours=8), "Nashik Packhouse CC-02", 19.9975, 73.7898, "CONTAINER_SEALED", 4.0, 80.0, "CLOSED", "ACTIVE_COOLING", "Packhouse QA Lead", "SEAL-MSK-0199", "Container stuffed with 1,000 kg export Alphonso Mangoes; digital seal applied.", "INFO"),
        ("BB-MSK-02", "AGRI-SHP-0001", "MSKU1234567", now - timedelta(days=4, hours=7), "Nashik Highway Gate", 19.9500, 73.7000, "TRUCK_DEPARTED", 4.1, 79.5, "CLOSED", "ACTIVE_COOLING", "Reefer Driver Amit", "BOL-MH15-8821", "Reefer truck en route to JNPT Port Mumbai.", "INFO"),
        ("BB-MSK-03", "AGRI-SHP-0001", "MSKU1234567", now - timedelta(days=4, hours=2), "JNPT Port Gate 4", 18.9500, 72.8500, "PORT_GATE_IN", 4.0, 79.0, "CLOSED", "ACTIVE_COOLING", "JNPT Gate Marshal", "E-TICKET-JNPT-01", "Container gated into terminal; shore power connected.", "INFO"),
        ("BB-MSK-04", "AGRI-SHP-0001", "MSKU1234567", now - timedelta(days=4, hours=1), "JNPT Quay 1 Gantry", 18.9500, 72.8500, "CONTAINER_LOADED", 4.0, 78.5, "CLOSED", "ACTIVE_COOLING", "Stevedore Lead", "STOW-BAY-14", "Stowed below-deck on MV AGRI STAR.", "INFO"),
        ("BB-MSK-05", "AGRI-SHP-0001", "MSKU1234567", now - timedelta(days=4, hours=0), "JNPT Harbor Channel", 18.9500, 72.8500, "VESSEL_DEPARTED", 4.0, 78.0, "CLOSED", "ACTIVE_COOLING", "Harbor Pilot", "AIS-DEP-001", "Vessel departed on scheduled Europe voyage.", "INFO"),
        ("BB-MSK-06", "AGRI-SHP-0001", "MSKU1234567", now - timedelta(days=1, hours=2), "Bab-el-Mandeb Strait", 12.5800, 43.3400, "STRAIT_TRANSIT", 4.1, 78.0, "CLOSED", "ACTIVE_COOLING", "Vessel Officer", "LOG-NAUT-44", "Passed Bab-el-Mandeb; thermal stability 99.4%.", "INFO"),
        ("BB-MSK-07", "AGRI-SHP-0001", "MSKU1234567", now - timedelta(minutes=15), "Red Sea Central Channel", 20.0000, 38.5000, "LIVE_POSITION", 4.2, 78.0, "CLOSED", "ACTIVE_COOLING", "Satellite Telemetry", "SAT-TEL-881", "Pristine voyage underway. ETA Rotterdam on schedule.", "INFO"),

        # CMAU8492019 (Thermal Excursion Incident)
        ("BB-CMA-01", "AGRI-SHP-8802", "CMAU8492019", now - timedelta(days=2, hours=16), "Niphad Packhouse", 20.0800, 74.1100, "CONTAINER_SEALED", 4.0, 82.0, "CLOSED", "ACTIVE_COOLING", "Farmer Ramesh Patil", "SEAL-CMA-9921", "Container loaded with 1,000 kg Tomatoes & Grapes.", "INFO"),
        ("BB-CMA-02", "AGRI-SHP-8802", "CMAU8492019", now - timedelta(days=2, hours=14), "JNPT Port Dock", 18.9500, 72.8500, "PORT_GATE_IN", 4.2, 80.0, "CLOSED", "ACTIVE_COOLING", "JNPT Marshal", "GATE-PASS-88", "Gated into port terminal.", "INFO"),
        ("BB-CMA-03", "AGRI-SHP-8802", "CMAU8492019", now - timedelta(days=2, hours=12), "JNPT Berth 2", 18.9500, 72.8500, "VESSEL_DEPARTED", 4.2, 80.0, "CLOSED", "ACTIVE_COOLING", "CMA CGM GANGA Pilot", "AIS-DEP-09", "Vessel departed outbound.", "INFO"),
        ("BB-CMA-04", "AGRI-SHP-8802", "CMAU8492019", now - timedelta(hours=18), "Arabian Sea Central", 15.1000, 59.8000, "TEMP_EXCURSION", 6.8, 70.0, "OPEN", "BACKUP_GENSET", "Deck Engineer", "DECK-LOG-11", "Power switched to backup genset; door sensor ajar for 40 min.", "WARNING"),
        ("BB-CMA-05", "AGRI-SHP-8802", "CMAU8492019", now - timedelta(hours=14), "Gulf of Aden East Approach", 14.2000, 55.4000, "CRITICAL_EXCURSION", 8.7, 64.0, "CLOSED", "BACKUP_GENSET", "Chief Engineer", "ALM-TEMP-8802", "Temperature peaked at 8.7°C (+4.7°C above setpoint) for 3h 18m.", "CRITICAL"),
        ("BB-CMA-06", "AGRI-SHP-8802", "CMAU8492019", now - timedelta(hours=10), "Gulf of Aden Corridor", 13.9000, 53.2000, "TEMP_RECOVERY", 6.4, 68.0, "CLOSED", "ACTIVE_COOLING", "Reefer Technician", "LOG-REC-01", "Compressor reset; temperature recovering slowly.", "WARNING"),

        # MEDU7719203 (Flagship Multiple Incident Scenario)
        ("BB-MED-01", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(days=6, hours=12), "Sahyadri Farms CC-01", 20.0000, 73.8000, "CONTAINER_SEALED", 11.5, 85.0, "CLOSED", "ACTIVE_COOLING", "Farmer Suresh More", "SEAL-MSC-9948", "Dispatched 1,000.0 kg Table Tomatoes with verified electronic seal #SEAL-MSC-9948.", "INFO"),
        ("BB-MED-02", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(days=6, hours=4), "JNPT Terminal 2", 18.9500, 72.8500, "PORT_GATE_IN", 11.2, 84.0, "CLOSED", "ACTIVE_COOLING", "JNPT Marshal", "E-GATE-9905", "Inbound truck gated into port. Net weight: 1,000.0 kg.", "INFO"),
        ("BB-MED-03", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(days=5, hours=8), "JNPT Reefer Yard", 18.9500, 72.8500, "PORT_DWELL_DELAY", 11.8, 83.0, "CLOSED", "PORT_TERMINAL_GRID", "Yard Supervisor", "LOG-DWELL-16", "Container experienced 16-hour yard dwell delay awaiting feeder vessel connection.", "WARNING"),
        ("BB-MED-04", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(days=5, hours=2), "JNPT Quay 2", 18.9500, 72.8500, "VESSEL_DEPARTED", 11.0, 82.0, "CLOSED", "VESSEL_AUX_POWER", "MSC Feeder Captain", "AIS-FEEDER-11", "Vessel departed for Salalah transshipment hub.", "INFO"),
        ("BB-MED-05", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(days=3, hours=14), "Port of Salalah Transshipment Hub", 16.9500, 54.0000, "TRANSSHIPMENT_TRANSFER", 13.5, 78.0, "OPEN", "OFF", "Salalah Stevedore", "TRAN-SL-094", "Container transferred from feeder to mother vessel MSC MEDITERRANEA. Unplugged for 2.5 hours during yard stack move.", "WARNING"),
        ("BB-MED-06", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(days=2, hours=6), "Red Sea South Corridor", 17.5000, 41.2000, "TEMP_EXCURSION", 14.8, 68.0, "CLOSED", "BACKUP_GENSET", "MSC Engineer", "ALM-TEMP-9905", "Temperature excursion reached 14.8°C (above 13.0°C limit) lasting 3 hours 30 mins during auxiliary generator switch.", "CRITICAL"),
        ("BB-MED-07", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(hours=4), "Port of Genoa Container Terminal", 44.4000, 8.9000, "SEAL_MISMATCH", 12.0, 72.0, "OPEN", "PORT_TERMINAL_GRID", "Customs & Port Inspector", "SEAL-AUDIT-9905", "🚨 SEAL MISMATCH DETECTED: Physical seal found on container (#MED-UN-0044) does not match recorded dispatch seal (#SEAL-MSC-9948). Investigation initiated.", "CRITICAL"),
        ("BB-MED-08", "AGRI-SHP-9905", "MEDU7719203", now - timedelta(hours=2), "Genoa Destination Packhouse", 44.4100, 8.9200, "QUANTITY_DISCREPANCY", 12.2, 70.0, "OPEN", "OFF", "Buyer Quality Inspector Marco Rossi", "GIN-IT-9905", "DISCREPANCY LOGGED: Final received weight 960.0 kg vs 1,000.0 kg dispatch (40 kg deficit). 35 kg unsellable due to heat damage.", "CRITICAL")
    ]

    for bb in black_box_events:
        cur.execute("""
            INSERT INTO container_black_box_events (
                event_id, shipment_id, container_id, event_timestamp, location_name,
                latitude, longitude, event_type, temperature, humidity, door_status,
                reefer_status, actor_role, evidence_ref, notes, severity
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, bb)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(black_box_events)} Container Black Box events.")

    # 5. Seed Digital Container Seals
    print("\n[STEP 5] Seeding Digital Container Seals...")
    seals_data = [
        ("SEAL-MSK-0199", "MSKU1234567", "AGRI-SHP-0001", "MSK-SL-994821", "MSK-SL-994821", now - timedelta(days=4, hours=8), "Nashik Packhouse CC-02", "Packhouse QA Lead", now - timedelta(days=4, hours=2), "JNPT Terminal 4", "JNPT Customs Officer", "SEAL_INTACT", False, "High-security tamper-evident cryptographic digital bolt seal. Verified intact.", "/evidence/seals/seal_msk_0199.jpg"),
        ("SEAL-CMA-9921", "CMAU8492019", "AGRI-SHP-8802", "CMA-SL-441092", "CMA-SL-441092", now - timedelta(days=2, hours=16), "Niphad Packhouse", "Logistics Driver Sunita", now - timedelta(days=2, hours=14), "JNPT Gate 2", "Port Gate Marshall", "SEAL_INTACT", False, "Standard ISO 17712 high security container seal verified intact.", "/evidence/seals/seal_cma_9921.jpg"),
        ("SEAL-HPG-3310", "HAPAG3948123", "AGRI-SHP-5503", "HPG-SL-772019", "HPG-SL-772019", now - timedelta(days=1, hours=8), "Mundra Packhouse", "Mundra Port Logistics Lead", now - timedelta(days=1, hours=6), "Mundra Berth 1", "Customs Inspector", "SEAL_INTACT", False, "ISO bolt seal intact across domestic port transfer.", "/evidence/seals/seal_hpg_3310.jpg"),
        ("SEAL-ONE-8831", "ONEU9284102", "AGRI-SHP-4404", "ONE-SL-110944", "ONE-SL-110944", now - timedelta(days=3, hours=10), "Chennai Agri Hub", "Chennai Dispatch Inspector", now - timedelta(days=3, hours=8), "Chennai Terminal", "Port Authority", "SEAL_INTACT", False, "Atmosphere integrity seal intact.", "/evidence/seals/seal_one_8831.jpg"),
        # Mismatch Flagship Incident
        ("SEAL-MSC-9948", "MEDU7719203", "AGRI-SHP-9905", "MSK-SL-771800", "MED-UN-004499", now - timedelta(days=6, hours=12), "Sahyadri Farm CC-01", "Farmer Suresh More", now - timedelta(hours=4), "Port of Genoa Quay", "Customs Inspector Rossi", "SEAL_MISMATCH", True, "🚨 CRITICAL SEAL MISMATCH: Origin applied seal #MSK-SL-771800 differs from terminal verified seal #MED-UN-004499. Investigation event automatically logged.", "/evidence/seals/seal_mismatch_medu.jpg")
    ]

    for sd in seals_data:
        cur.execute("""
            INSERT INTO digital_seals (
                seal_id, container_id, shipment_id, origin_seal_number,
                destination_verified_seal_number, applied_timestamp, applied_location,
                applied_by, verified_timestamp, verified_location, verified_by,
                seal_status, tamper_evidence_detected, notes, photo_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, sd)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(seals_data)} Digital Container Seals.")

    # 6. Seed Marine Weather Events (Simulated Weather Dynamics)
    print("\n[STEP 6] Seeding Marine Weather Events...")
    weather_data = [
        ("WX-01", "MSKU1234567", "Red Sea Central Channel", 20.0000, 38.5000, "CALM", 12.0, 1.2, 0.0, "NORMAL", now - timedelta(hours=2)),
        ("WX-02", "CMAU8492019", "Gulf of Aden East Approach", 13.8000, 52.0000, "MODERATE_SWELL", 22.0, 2.8, 4.0, "MODERATE", now - timedelta(hours=8)),
        ("WX-03", "HAPAG3948123", "Gulf of Oman Corridor", 24.8000, 58.5000, "CALM", 10.0, 0.8, 0.0, "NORMAL", now - timedelta(hours=1)),
        # Severe Storm in Malacca causing shelf-life crisis
        ("WX-04", "ONEU9284102", "Strait of Malacca (Storm Corridor)", 4.2000, 99.5000, "STORM_CYCLONE_SWELL", 48.0, 5.2, 16.0, "HIGH", now - timedelta(hours=6)),
        ("WX-05", "MEDU7719203", "Strait of Sicily", 37.2000, 11.5000, "HIGH_WAVES", 32.0, 3.5, 6.0, "MODERATE", now - timedelta(hours=12))
    ]

    for wd in weather_data:
        cur.execute("""
            INSERT INTO marine_weather_events (
                weather_event_id, container_id, sea_region, latitude, longitude,
                weather_condition, wind_speed_knots, wave_height_meters,
                expected_delay_hours, severity_level, recorded_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, wd)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(weather_data)} Marine Weather Events.")

    # 7. Seed Container Location History
    print("\n[STEP 7] Seeding Container Historical Telemetry...")
    history_points = [
        # MSKU1234567
        ("MSKU1234567", 18.9500, 72.8500, "JNPT Nhava Sheva", 0.0, 0.0, 4.0, 80.0, "ON", "ACTIVE_COOLING", "CLOSED", 6250.0, 0.0, "Departed JNPT terminal berth 4 after pre-cool verification", now - timedelta(days=4, hours=6)),
        ("MSKU1234567", 17.5000, 68.2000, "Arabian Sea", 18.2, 280.0, 4.1, 79.0, "ON", "ACTIVE_COOLING", "CLOSED", 5930.0, 5.12, "Full ocean speed engaged, normal thermal envelope", now - timedelta(days=3, hours=12)),
        ("MSKU1234567", 13.8000, 52.0000, "Gulf of Aden", 18.6, 275.0, 4.2, 78.5, "ON", "ACTIVE_COOLING", "CLOSED", 5000.0, 20.0, "Gulf of Aden convoy corridor", now - timedelta(days=2, hours=4)),
        ("MSKU1234567", 12.5800, 43.3400, "Bab-el-Mandeb Strait", 17.8, 320.0, 4.1, 78.0, "ON", "ACTIVE_COOLING", "CLOSED", 4450.0, 28.8, "Passed Bab-el-Mandeb strait heading into Red Sea", now - timedelta(days=1, hours=2)),
        ("MSKU1234567", 20.0000, 38.5000, "Red Sea (Central Channel)", 18.5, 315.0, 4.2, 78.0, "ON", "ACTIVE_COOLING", "CLOSED", 3900.0, 37.6, "Live simulated position: Red Sea Northbound", now - timedelta(minutes=5)),

        # CMAU8492019
        ("CMAU8492019", 18.9500, 72.8500, "JNPT Port Dock", 0.0, 0.0, 4.0, 82.0, "ON", "ACTIVE_COOLING", "CLOSED", 6250.0, 0.0, "Container loaded and sealed at origin port. Weight verified: 998 kg.", now - timedelta(days=2, hours=14)),
        ("CMAU8492019", 17.2000, 67.5000, "Arabian Sea Exit", 17.4, 278.0, 4.2, 80.0, "ON", "ACTIVE_COOLING", "CLOSED", 5900.0, 5.6, "Vessel transit steady, temp 4.2°C", now - timedelta(days=2, hours=2)),
        ("CMAU8492019", 15.1000, 59.8000, "Arabian Sea Central", 16.8, 270.0, 6.8, 70.0, "BACKUP_GENSET", "DEFROST_ANOMALY", "OPEN", 5450.0, 12.8, "WARNING: Reefer power switched to backup genset, temp rising to 6.8°C", now - timedelta(hours=18)),
        ("CMAU8492019", 14.2000, 55.4000, "Gulf of Aden East Approach", 16.0, 266.0, 8.7, 64.0, "BACKUP_GENSET", "DEFROST_ANOMALY", "CLOSED", 5200.0, 16.8, "CRITICAL: Excursion reached +4.7°C above setpoint lasting 3h 18m", now - timedelta(hours=14)),
        ("CMAU8492019", 13.8000, 52.0000, "Gulf of Aden East Approach", 16.2, 265.0, 8.7, 64.0, "BACKUP_GENSET", "DEFROST_ANOMALY", "CLOSED", 5000.0, 20.0, "Live simulated position: High Spoilage Risk", now - timedelta(minutes=8)),

        # ONEU9284102 (Shelf-Life Crisis)
        ("ONEU9284102", 13.0800, 80.3000, "Chennai Port", 0.0, 0.0, 2.0, 92.0, "ON", "ACTIVE_COOLING", "CLOSED", 1620.0, 0.0, "Dispatched Chennai Port Terminal 1", now - timedelta(days=3, hours=10)),
        ("ONEU9284102", 10.0000, 86.5000, "Bay of Bengal", 18.5, 120.0, 2.1, 91.0, "ON", "ACTIVE_COOLING", "CLOSED", 1190.0, 26.5, "Ocean passage normal", now - timedelta(days=2, hours=4)),
        ("ONEU9284102", 6.8000, 94.0000, "Andaman Sea Entry", 14.2, 130.0, 2.1, 90.0, "ON", "ACTIVE_COOLING", "CLOSED", 700.0, 56.8, "Storm warning encountered, vessel reduced speed to 14 knots", now - timedelta(days=1, hours=2)),
        ("ONEU9284102", 4.2000, 99.5000, "Strait of Malacca", 8.5, 135.0, 2.2, 90.0, "ON", "ACTIVE_COOLING", "CLOSED", 280.0, 82.7, "Severe storm delay: ETA pushed to +48h. Shelf life critically endangered.", now - timedelta(minutes=10))
    ]

    for hp in history_points:
        cur.execute("""
            INSERT INTO container_location_history (
                container_id, latitude, longitude, sea_region, speed_knots,
                heading_degrees, temperature, humidity, reefer_power_status,
                compressor_status, door_status, distance_remaining_nmi,
                route_progress_pct, event_note, recorded_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, hp)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(history_points)} container history points.")

    # 8. Seed Multimodal Shipments (5 Scenarios)
    print("\n[STEP 8] Seeding 5 Multimodal Shipments...")
    multimodal_data = [
        # 1. Normal (Alphonso Mango & Pomegranate)
        {
            "shipment_id": "AGRI-SHP-0001",
            "container_id": "MSKU1234567",
            "transport_mode": "MULTIMODAL (Road + Port + Marine + Road)",
            "produce_name": "Alphonso Mango & Pomegranate",
            "harvest_date": (now - timedelta(days=6)).date(),
            "initial_shelf_life_hours": 360.0,
            "shelf_life_remaining_hours": 210.0,
            "initial_quantity_kg": 1000.0,
            "current_quantity_kg": 998.0,
            "delivered_quantity_kg": None,
            "quantity_loss_kg": 2.0,
            "unit_price_per_kg_inr": 180.0,
            "origin_farmer_location": "Sahyadri Farms Cluster, Dindori, Nashik, India",
            "collection_center": "Nashik Agri Packhouse CC-02",
            "origin_truck_id": "FTL-MH15-8821",
            "origin_port_name": "JNPT Nhava Sheva Terminal 4, Mumbai, India",
            "vessel_name": "MV AGRI STAR",
            "voyage_number": "VOY-2026-EU04",
            "destination_port_name": "Port of Rotterdam ECT Delta, Netherlands",
            "destination_truck_id": "EUR-NL-7742",
            "final_buyer_name": "EuroFresh Logistics BV, Rotterdam Hub",
            "current_multimodal_stage": "VESSEL_TRANSIT",
            "temperature_setpoint": 4.0,
            "temperature_min_limit": 3.0,
            "temperature_max_limit": 6.0,
            "target_humidity": 85.0,
            "overall_risk_score": 18,
            "risk_category": "LOW",
            "risk_breakdown": {
                "temperature_excursion_score": 0,
                "port_dwell_score": 2,
                "reefer_interruption_score": 0,
                "weather_risk_score": 2,
                "shelf_life_score": 14
            },
            "spoilage_status": "SAFE",
            "eta_destination_hours": 140.0,
            "departure_time": now - timedelta(days=4, hours=6),
            "expected_delivery_time": now + timedelta(days=8, hours=12),
            "shipment_status": "IN_TRANSIT"
        },
        # 2. Excursion (Export Table Grapes)
        {
            "shipment_id": "AGRI-SHP-8802",
            "container_id": "CMAU8492019",
            "transport_mode": "MULTIMODAL (Road + Port + Marine + Road)",
            "produce_name": "Export Table Grapes & Tomatoes",
            "harvest_date": (now - timedelta(days=4)).date(),
            "initial_shelf_life_hours": 120.0,
            "shelf_life_remaining_hours": 31.0,
            "initial_quantity_kg": 1000.0,
            "current_quantity_kg": 960.0,
            "delivered_quantity_kg": None,
            "quantity_loss_kg": 40.0,
            "unit_price_per_kg_inr": 75.0,
            "origin_farmer_location": "Niphad Farm Cluster, Nashik, India",
            "collection_center": "Niphad Cold Collection Center #1",
            "origin_truck_id": "FTL-MH15-3920",
            "origin_port_name": "JNPT Nhava Sheva Terminal 2, Mumbai, India",
            "vessel_name": "CMA CGM GANGA",
            "voyage_number": "VOY-2026-EU09",
            "destination_port_name": "Port of Rotterdam, Netherlands",
            "destination_truck_id": "EUR-NL-1109",
            "final_buyer_name": "Rotterdam Central Wholesale Agromarket",
            "current_multimodal_stage": "VESSEL_TRANSIT",
            "temperature_setpoint": 4.0,
            "temperature_min_limit": 3.0,
            "temperature_max_limit": 6.0,
            "target_humidity": 85.0,
            "overall_risk_score": 78,
            "risk_category": "HIGH",
            "risk_breakdown": {
                "temperature_excursion_score": 28,
                "port_delay_score": 14,
                "reefer_interruption_score": 18,
                "weather_risk_score": 8,
                "shelf_life_margin_score": 10
            },
            "spoilage_status": "HIGH_SPOILAGE_RISK",
            "eta_destination_hours": 266.0,
            "departure_time": now - timedelta(days=2, hours=14),
            "expected_delivery_time": now + timedelta(days=11, hours=4),
            "shipment_status": "HIGH_RISK_INTERVENTION_REQUIRED"
        },
        # 3. Port Delay (Export Guavas & Pomegranates)
        {
            "shipment_id": "AGRI-SHP-5503",
            "container_id": "HAPAG3948123",
            "transport_mode": "MULTIMODAL (Road + Port + Marine)",
            "produce_name": "Export Guavas & Pomegranates",
            "harvest_date": (now - timedelta(days=3)).date(),
            "initial_shelf_life_hours": 160.0,
            "shelf_life_remaining_hours": 64.0,
            "initial_quantity_kg": 1000.0,
            "current_quantity_kg": 995.0,
            "delivered_quantity_kg": None,
            "quantity_loss_kg": 5.0,
            "unit_price_per_kg_inr": 90.0,
            "origin_farmer_location": "Mundra Agri Export Zone, Gujarat",
            "collection_center": "Kutch Agro Hub CC-01",
            "origin_truck_id": "GJ-12-AZ-4412",
            "origin_port_name": "Mundra Port Container Terminal",
            "vessel_name": "HAPAG EXPRESS",
            "voyage_number": "VOY-2026-ME02",
            "destination_port_name": "Port of Jebel Ali, Dubai, UAE",
            "destination_truck_id": "DXB-REEFER-01",
            "final_buyer_name": "Gulf Fresh Supermarkets Logistics Hub, Dubai",
            "current_multimodal_stage": "PORT_DWELL",
            "temperature_setpoint": 12.0,
            "temperature_min_limit": 10.0,
            "temperature_max_limit": 14.0,
            "target_humidity": 90.0,
            "overall_risk_score": 64,
            "risk_category": "HIGH",
            "risk_breakdown": {
                "port_dwell_score": 34,
                "temperature_excursion_score": 4,
                "reefer_interruption_score": 6,
                "shelf_life_score": 20
            },
            "spoilage_status": "PORT_DWELL_WARNING",
            "eta_destination_hours": 14.0,
            "departure_time": now - timedelta(days=1, hours=8),
            "expected_delivery_time": now + timedelta(hours=14),
            "shipment_status": "PORT_DWELL_DELAYED"
        },
        # 4. Shelf-Life Crisis & Sell-Before-Spoilage (Papayas & Onions)
        {
            "shipment_id": "AGRI-SHP-4404",
            "container_id": "ONEU9284102",
            "transport_mode": "MULTIMODAL (Road + Marine + Port)",
            "produce_name": "Fresh Papayas & Red Onions",
            "harvest_date": (now - timedelta(days=5)).date(),
            "initial_shelf_life_hours": 100.0,
            "shelf_life_remaining_hours": 31.0,
            "initial_quantity_kg": 1000.0,
            "current_quantity_kg": 1000.0,
            "delivered_quantity_kg": None,
            "quantity_loss_kg": 0.0,
            "unit_price_per_kg_inr": 48.0,
            "origin_farmer_location": "Thanjavur Horticultural Belt, Tamil Nadu",
            "collection_center": "Chennai Export Packhouse CC-04",
            "origin_truck_id": "TN-09-BK-9912",
            "origin_port_name": "Chennai Port Container Terminal",
            "vessel_name": "ONE HARMONY",
            "voyage_number": "VOY-2026-SG11",
            "destination_port_name": "Port of Singapore (PSA)",
            "destination_truck_id": "SG-TRUCK-88",
            "final_buyer_name": "Singapore FairPrice Logistics Hub",
            "current_multimodal_stage": "VESSEL_TRANSIT",
            "temperature_setpoint": 2.0,
            "temperature_min_limit": 1.0,
            "temperature_max_limit": 4.0,
            "target_humidity": 92.0,
            "overall_risk_score": 84,
            "risk_category": "CRITICAL",
            "risk_breakdown": {
                "weather_storm_delay_score": 35,
                "shelf_life_exhaustion_score": 38,
                "temperature_excursion_score": 5,
                "port_dwell_score": 6
            },
            "spoilage_status": "CRITICAL_SPOILAGE_RISK",
            "eta_destination_hours": 48.0, # ETA 48h > Shelf Life 31h!
            "departure_time": now - timedelta(days=3, hours=10),
            "expected_delivery_time": now + timedelta(hours=48),
            "shipment_status": "SPOILAGE_RISK_REROUTE_RECOMMENDED"
        },
        # 5. Flagship Multiple Incident & Complete Loss Investigation (1,000 kg Tomatoes)
        {
            "shipment_id": "AGRI-SHP-9905",
            "container_id": "MEDU7719203",
            "transport_mode": "MULTIMODAL (Farm + Truck + Port + Vessel + Port + Truck + Buyer)",
            "produce_name": "Premium Table Tomatoes (1,000 kg)",
            "harvest_date": (now - timedelta(days=7)).date(),
            "initial_shelf_life_hours": 120.0,
            "shelf_life_remaining_hours": 18.0,
            "initial_quantity_kg": 1000.0,
            "current_quantity_kg": 960.0, # 40 kg loss
            "delivered_quantity_kg": 960.0,
            "quantity_loss_kg": 40.0,
            "unit_price_per_kg_inr": 60.0,
            "origin_farmer_location": "Sahyadri Farms Cluster, Nashik, India",
            "collection_center": "Nashik Agri Packhouse CC-01",
            "origin_truck_id": "FTL-MH15-9905",
            "origin_port_name": "JNPT Nhava Sheva Terminal 2, Mumbai",
            "vessel_name": "MSC MEDITERRANEA",
            "voyage_number": "VOY-2026-IT05",
            "destination_port_name": "Port of Genoa Container Terminal, Italy",
            "destination_truck_id": "IT-GEN-4401",
            "final_buyer_name": "Genoa Wholesale Agromarket, Italy",
            "current_multimodal_stage": "DISPUTE_INVESTIGATION",
            "temperature_setpoint": 11.0,
            "temperature_min_limit": 10.0,
            "temperature_max_limit": 13.0,
            "target_humidity": 85.0,
            "overall_risk_score": 86,
            "risk_category": "CRITICAL",
            "risk_breakdown": {
                "quantity_discrepancy_score": 25,
                "seal_mismatch_score": 25,
                "temperature_excursion_score": 20,
                "port_dwell_delay_score": 16
            },
            "spoilage_status": "LOSS_RECORDED_INVESTIGATION_ACTIVE",
            "eta_destination_hours": 0.0, # Arrived with loss
            "departure_time": now - timedelta(days=6, hours=12),
            "expected_delivery_time": now - timedelta(hours=2),
            "actual_delivery_time": now - timedelta(hours=2),
            "shipment_status": "REQUIRES_INVESTIGATION"
        }
    ]

    for ms in multimodal_data:
        params = {
            "actual_delivery_time": None,
            **ms,
            "risk_breakdown": Json(ms.get("risk_breakdown", {}))
        }
        cur.execute("""
            INSERT INTO multimodal_shipments (
                shipment_id, container_id, transport_mode, produce_name, harvest_date,
                initial_shelf_life_hours, shelf_life_remaining_hours, initial_quantity_kg,
                current_quantity_kg, delivered_quantity_kg, quantity_loss_kg, unit_price_per_kg_inr,
                origin_farmer_location, collection_center, origin_truck_id, origin_port_name,
                vessel_name, voyage_number, destination_port_name, destination_truck_id,
                final_buyer_name, current_multimodal_stage, temperature_setpoint,
                temperature_min_limit, temperature_max_limit, target_humidity,
                overall_risk_score, risk_category, risk_breakdown, spoilage_status,
                eta_destination_hours, departure_time, expected_delivery_time,
                actual_delivery_time, shipment_status
            ) VALUES (
                %(shipment_id)s, %(container_id)s, %(transport_mode)s, %(produce_name)s, %(harvest_date)s,
                %(initial_shelf_life_hours)s, %(shelf_life_remaining_hours)s, %(initial_quantity_kg)s,
                %(current_quantity_kg)s, %(delivered_quantity_kg)s, %(quantity_loss_kg)s, %(unit_price_per_kg_inr)s,
                %(origin_farmer_location)s, %(collection_center)s, %(origin_truck_id)s, %(origin_port_name)s,
                %(vessel_name)s, %(voyage_number)s, %(destination_port_name)s, %(destination_truck_id)s,
                %(final_buyer_name)s, %(current_multimodal_stage)s, %(temperature_setpoint)s,
                %(temperature_min_limit)s, %(temperature_max_limit)s, %(target_humidity)s,
                %(overall_risk_score)s, %(risk_category)s, %(risk_breakdown)s, %(spoilage_status)s,
                %(eta_destination_hours)s, %(departure_time)s, %(expected_delivery_time)s,
                %(actual_delivery_time)s, %(shipment_status)s
            );
        """, params)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(multimodal_data)} multimodal shipments.")

    # 9. Seed Multimodal Journey Stages (Complete 7-to-9 Stage Chain)
    print("\n[STEP 9] Seeding Multimodal Journey Stages for Loss Investigation...")
    stages_data = [
        # AGRI-SHP-9905 (Flagship 1,000 kg Tomatoes Investigation)
        ("AGRI-SHP-9905", 1, "FARMER", "1. Farmer Harvest & Initial Dispatch", "Sahyadri Farms Cluster, Nashik", now - timedelta(days=6, hours=12), 1000.0, 11.5, 85.0, "CLOSED", "ON", "Farmer Suresh More", "Calibrated digital scale ticket #QC-9905; 1,000.00 kg net gross weight verified", 0.0, 0, False, "Harvested at maturity stage 3. Zero decay index.", {"gross_kg": 1020.0, "tare_kg": 20.0}),
        ("AGRI-SHP-9905", 2, "PICKUP", "2. Packhouse Reefer Truck Loading", "Nashik Packhouse CC-01", now - timedelta(days=6, hours=8), 1000.0, 11.2, 84.0, "CLOSED", "ON", "Driver Sunita Rao", "Dispatch BOL #BOL-MH15-9905; Inbound weighbridge check: 1,000.00 kg", 0.0, 0, False, "Pre-cooled reefer truck box verified at 11.0°C.", {"truck_id": "FTL-MH15-9905"}),
        ("AGRI-SHP-9905", 3, "ORIGIN_PORT", "3. Origin Port Gate-In & Customs Seal", "JNPT Nhava Sheva Terminal 2", now - timedelta(days=6, hours=4), 1000.0, 11.2, 84.0, "CLOSED", "ON", "JNPT Gate Marshal & Customs Inspector", "Port Gate-in E-Ticket #JNPT-E9905; Electronic Seal applied: #SEAL-MSC-9948", 0.0, 0, False, "Passed radiation and customs inspection. Digital seal verified intact.", {"gate_pass": "GP-JNPT-9905"}),
        ("AGRI-SHP-9905", 4, "PORT_DWELL", "4. Origin Port Reefer Yard Dwell", "JNPT Reefer Yard Stacking Grid 2", now - timedelta(days=5, hours=8), 1000.0, 11.8, 83.0, "CLOSED", "PORT_TERMINAL_GRID", "JNPT Yard Supervisor", "Yard Telemetry Logger #YRD-9905; 16-hour dwell record", 0.0, 0, True, "⚠️ 16-hour port dwell delay awaiting connecting vessel berth clearance.", {"dwell_hours": 16.0}),
        ("AGRI-SHP-9905", 5, "TRANSSHIPMENT", "5. Salalah Transshipment Hub Transfer", "Port of Salalah Transshipment Yard", now - timedelta(days=3, hours=14), 1000.0, 13.5, 78.0, "OPEN", "OFF", "Salalah Stevedore & Terminal Operator", "Discharge & Reload Manifest #SL-TRAN-9905; Crane Log", 0.0, 150, True, "⚠️ Transshipment crane transfer: Container unplugged for 2.5 hours during stack relocation.", {"unplugged_min": 150}),
        ("AGRI-SHP-9905", 6, "MARINE_JOURNEY", "6. Marine Ocean Transit (Vessel at Sea)", "Red Sea -> Strait of Sicily (MSC MEDITERRANEA)", now - timedelta(days=2, hours=6), 1000.0, 14.8, 68.0, "CLOSED", "BACKUP_GENSET", "Chief Engineer / Ocean Carrier", "AIS Vessel Position Log; Reefer Container Data Logger Log #LOG-MEDU-9905", 0.0, 210, True, "🚨 INCIDENT: Temperature excursion reached 14.8°C (above 13.0°C limit) lasting 3h 30m during auxiliary generator switch.", {"excursion_temp": 14.8, "duration_min": 210}),
        ("AGRI-SHP-9905", 7, "DESTINATION_PORT", "7. Destination Port Discharge & Seal Audit", "Port of Genoa Container Terminal, Italy", now - timedelta(hours=4), 995.0, 12.0, 72.0, "OPEN", "PORT_TERMINAL_GRID", "Customs & Port Inspector Rossi", "Port Weighbridge Ticket #GEN-WB-9905 (995 kg net); Seal Audit Log", 5.0, 0, True, "🚨 FIRST DETECTED ANOMALY (SEAL & QUANTITY): Port outturn weight 995 kg (5 kg shrinkage). Discovered Seal Mismatch: physical seal #MED-UN-0044 does not match origin dispatch seal #SEAL-MSC-9948.", {"shrinkage_kg": 5.0, "found_seal": "MED-UN-0044"}),
        ("AGRI-SHP-9905", 8, "FINAL_DELIVERY", "8. Final Buyer Receiving & Grading Inspection", "Genoa Wholesale Agromarket Dock", now - timedelta(hours=2), 960.0, 12.2, 70.0, "OPEN", "OFF", "Buyer Quality Inspector Marco Rossi", "Buyer Receiving Report #GIN-IT-9905; Damaged Produce Ticket #REJ-099; Net scale: 960.0 kg", 35.0, 0, True, "🚨 DISCREPANCY FLAGGED: Final usable produce weight 960.00 kg (40.0 kg total deficit vs 1,000 kg harvest). 35.0 kg graded unsellable due to thermal decay/softening.", {"usable_kg": 960.0, "damaged_kg": 35.0, "total_loss_kg": 40.0}),

        # AGRI-SHP-0001 (Pristine Scenario)
        ("AGRI-SHP-0001", 1, "FARMER", "1. Farmer Harvest & Grading", "Sahyadri Farms Cluster, Nashik", now - timedelta(days=6, hours=4), 1000.0, 12.0, 85.0, "CLOSED", "ON", "Farmer Dnyaneshwar Patil", "Farm Gate QC Certificate #QC-MNG-101; 1,000 kg Alphonso Mangoes Grade A", 0.0, 0, False, "Harvested at maturity stage 3.", {}),
        ("AGRI-SHP-0001", 2, "PICKUP", "2. Reefer Truck Dispatch", "Nashik Packhouse CC-02", now - timedelta(days=5, hours=18), 1000.0, 11.5, 84.0, "CLOSED", "ON", "Logistics Driver Amit Shinde", "Truck BOL-MH15-8821; Pre-cool telemetry verified", 0.0, 0, False, "Pallet transfer into reefer box", {}),
        ("AGRI-SHP-0001", 3, "ORIGIN_PORT", "3. Origin Port Gate-In", "JNPT Nhava Sheva Terminal 4", now - timedelta(days=4, hours=22), 998.0, 11.8, 83.0, "OPEN", "ON", "JNPT Port Customs Authority", "Gate In E-Ticket #JNPT-A104; 2 kg phytosanitary sample", 2.0, 10, False, "Phytosanitary laboratory clearance passed", {}),
        ("AGRI-SHP-0001", 4, "CONTAINER_LOADING", "4. Container Stuffing & CA Atmosphere", "JNPT Reefer Yard", now - timedelta(days=4, hours=10), 998.0, 4.0, 80.0, "CLOSED", "ON", "Maersk Marine Technical Crew", "CA Atmosphere Seal #SEAL-MSK-0199; O2/CO2 calibrated", 0.0, 0, False, "Controlled Atmosphere reefer set to 4.0°C", {}),
        ("AGRI-SHP-0001", 5, "MARINE_JOURNEY", "5. Ocean Transit (Red Sea Northbound)", "Red Sea Central Channel", now - timedelta(minutes=5), 998.0, 4.2, 78.0, "CLOSED", "ON", "MV AGRI STAR Navigation Officer", "Satellite Telemetry Stream; Zero excursion alarms", 0.0, 0, False, "Pristine voyage telemetry, thermal stability 99.4%", {})
    ]

    for st in stages_data:
        cur.execute("""
            INSERT INTO multimodal_journey_stages (
                shipment_id, stage_order, stage_key, stage_name, stage_location,
                timestamp_recorded, recorded_quantity_kg, recorded_temp_c,
                recorded_humidity_pct, door_status, refrigeration_status,
                responsible_party, evidence_available, discrepancy_kg,
                temp_excursion_min, incident_flag, incident_summary, data_payload
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            st[0], st[1], st[2], st[3], st[4], st[5], st[6], st[7], st[8],
            st[9], st[10], st[11], st[12], st[13], st[14], st[15], st[16], Json(st[17])
        ))
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(stages_data)} journey stages.")

    # 10. Seed Port Handover Events
    print("\n[STEP 10] Seeding Port Handover Events...")
    handovers_data = [
        ("MSKU1234567", "AGRI-SHP-0001", "IN-NSA", "JNPT Nhava Sheva Terminal 4", "PORT_ARRIVAL", "Container Freight Station (CFS)", 0.0, 8.0, "LOW", "CLEARED", 11.8, "PORT_TERMINAL_GRID", now - timedelta(days=4, hours=22), "JNPT Gate Marshal", True, "Inbound truck gated into terminal smoothly"),
        ("MSKU1234567", "AGRI-SHP-0001", "IN-NSA", "JNPT Nhava Sheva Terminal 4", "REEFER_PLUG_IN", "Reefer Stacking Grid Block 4B", 4.2, 8.0, "LOW", "CLEARED", 4.0, "PORT_TERMINAL_GRID", now - timedelta(days=4, hours=18), "Port Electrical Lead", True, "Connected to shore reefer power; pre-cooling steady"),
        ("MSKU1234567", "AGRI-SHP-0001", "IN-NSA", "JNPT Nhava Sheva Terminal 4", "CUSTOMS_INSPECTION", "Customs Inspection Bay 2", 1.5, 8.0, "LOW", "CLEARED", 4.1, "PORT_TERMINAL_GRID", now - timedelta(days=4, hours=12), "Customs Appraiser", True, "Phytosanitary seal verified intact"),
        ("MSKU1234567", "AGRI-SHP-0001", "IN-NSA", "JNPT Nhava Sheva Terminal 4", "VESSEL_DEPARTED", "Main Navigational Channel", 0.0, 8.0, "LOW", "CLEARED", 4.0, "VESSEL_AUX_POWER", now - timedelta(days=4, hours=6), "Harbor Pilot Officer", True, "Vessel unmoored and departed on schedule"),

        # HAPAG3948123 (Port Dwell Delay Scenario)
        ("HAPAG3948123", "AGRI-SHP-5503", "IN-MUN", "Mundra Port Terminal", "PORT_ARRIVAL", "Mundra Gate 1", 0.0, 8.0, "LOW", "CLEARED", 12.0, "PORT_TERMINAL_GRID", now - timedelta(days=1, hours=8), "Mundra Gate Lead", True, "Gated in on schedule"),
        ("HAPAG3948123", "AGRI-SHP-5503", "AE-JEA", "Port of Jebel Ali Terminal 2", "BERTH_CONGESTION_WAIT", "Jebel Ali Anchorage", 22.0, 8.0, "HIGH", "PENDING_BERTH", 11.8, "VESSEL_AUX_POWER", now - timedelta(hours=4), "DP World Berthing Officer", True, "⚠️ Berth congestion delay: 22 hours dwell time logged (14h delay vs 8h baseline). Consumed 34% remaining shelf life."),

        # MEDU7719203 (Port Handover & Seal Audit)
        ("MEDU7719203", "AGRI-SHP-9905", "IN-NSA", "JNPT Nhava Sheva Terminal 2", "PORT_ARRIVAL", "Main Gate", 0.0, 8.0, "MEDIUM", "CLEARED", 11.2, "PORT_TERMINAL_GRID", now - timedelta(days=6, hours=4), "JNPT Inbound Marshal", True, "Truck arrival logged with 1,000 kg net produce"),
        ("MEDU7719203", "AGRI-SHP-9905", "IN-NSA", "JNPT Nhava Sheva Terminal 2", "REEFER_YARD_DWELL", "Reefer Grid Block 2", 16.0, 8.0, "HIGH", "CLEARED", 11.8, "PORT_TERMINAL_GRID", now - timedelta(days=5, hours=8), "Terminal Operator", True, "Yard dwell delayed by 8 hours awaiting vessel call"),
        ("MEDU7719203", "AGRI-SHP-9905", "IT-GOA", "Port of Genoa Terminal", "DISCHARGE_SEAL_AUDIT", "Genoa Gantry Quay 3", 4.0, 8.0, "LOW", "AUDIT_FLAGGED", 12.0, "PORT_TERMINAL_GRID", now - timedelta(hours=4), "Genoa Port Authority", True, "🚨 Container discharged. Physical seal mismatch detected (#MED-UN-0044 vs #SEAL-MSC-9948).")
    ]

    for ho in handovers_data:
        cur.execute("""
            INSERT INTO port_handover_events (
                container_id, shipment_id, port_code, port_name, event_type,
                terminal_name, dwell_time_hours, expected_dwell_hours, congestion_level, inspection_result,
                recorded_temp_c, power_source, event_timestamp, operator_name, verified, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, ho)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(handovers_data)} port handover events.")

    # 11. Seed Marine Alternative Buyers (Sell Before Spoilage)
    print("\n[STEP 11] Seeding Marine Alternative Buyers for Sell Before Spoilage...")
    cur.execute("DELETE FROM marine_alternative_buyers;")

    alt_buyers = [
        ("ALT-BUYER-01", "Jebel Ali Fresh Port Terminal Wholesale Hub", "DP World Cold Hub, Jebel Ali Freezone", "Dubai / Jebel Ali Port", 12.0, 6.5, 500.0, 62.0, 24.0, "Port Cold Storage Wholesaler", "Tariq Mansoor", "+971 4 881 2299", 98),
        ("ALT-BUYER-02", "Salalah Fresh Agro Processing & Puree Corp", "Salalah Port Industrial Freezone", "Port of Salalah, Oman", 28.0, 15.0, 300.0, 58.0, 36.0, "Industrial Puree & Sauce Processor", "Ahmed Al-Shanfari", "+968 23 219 400", 94),
        ("ALT-BUYER-03", "Gulf Fresh Supermarkets Logistics Hub", "Al Aweer Central Fruits Market, Dubai", "Dubai Central Market", 35.0, 19.0, 200.0, 65.0, 48.0, "Retail Supermarket Chain Hub", "Rashid Bin Khalid", "+971 4 333 4567", 92),
        ("ALT-BUYER-04", "Red Sea Agritrade Cold Storage Terminal", "Jeddah Islamic Port North Terminal", "Jeddah Port, Saudi Arabia", 18.0, 9.7, 450.0, 60.0, 30.0, "Regional Cold Storage Distributor", "Omar Al-Ghamdi", "+966 12 647 8899", 91),
        ("ALT-BUYER-05", "Port Said Express Agro Distribution", "Port Said East Port Terminal", "Port Said, Egypt", 14.0, 7.5, 350.0, 55.0, 28.0, "Mediterranean Transit Distributor", "Hassan Mahmoud", "+20 66 373 1122", 89),
        ("ALT-BUYER-06", "Singapore Jurong Fresh Logistics Hub", "Jurong Port Cold Storage Terminal", "Singapore Jurong Port", 8.0, 4.3, 600.0, 52.0, 18.0, "Southeast Asia Import Distributor", "Tan Wei Ming", "+65 6265 1122", 96),
        ("ALT-BUYER-07", "Pasir Panjang Agro Hub & Supermarket Wholesale", "Pasir Panjang Wholesale Centre", "Singapore", 12.0, 6.5, 400.0, 54.0, 24.0, "Fresh Supermarket Logistics Co-Op", "Lim Keng Huat", "+65 6775 8899", 93)
    ]

    for ab in alt_buyers:
        cur.execute("""
            INSERT INTO marine_alternative_buyers (
                buyer_id, buyer_name, location_name, port_or_city, distance_km,
                distance_nmi, demand_quantity_kg, offered_price_per_kg_inr,
                delivery_deadline_hours, buyer_type, contact_person, contact_phone,
                match_compatibility_score
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, ab)
    conn.commit()
    print(f"  [SUCCESS] Inserted {len(alt_buyers)} marine alternative buyers.")

    cur.close()
    conn.close()
    print("\n" + "=" * 80)
    print(" ALL MARINE & MULTIMODAL INTELLIGENCE MIGRATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_migration_and_seed()
