"""
AGRITrust — Multi-Modal Logistics Planning Migration and Seeder
Populates initial tables:
- pincode_directory
- ports_airports_registry
- transport_rate_cards
- carrier_services
- Sample shipment_quotes and route_options
- Sample multimodal_bookings and route_segments
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
    print(" AGRITRUST — MULTI-MODAL LOGISTICS INTELLIGENCE (ROAD + MARINE + AIR) SEED")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Apply DDL Schema
    print("\n[STEP 1] Applying Multi-Modal Planning DDL Schema...")
    with open("agritrust_multimodal_planning_schema.sql", "r") as f:
        schema_sql = f.read()
    cur.execute(schema_sql)
    conn.commit()
    print("  [SUCCESS] Tables pincode_directory, ports_airports_registry, transport_rate_cards,")
    print("            carrier_services, shipment_quotes, route_options, multimodal_bookings,")
    print("            route_segments verified and ready.")

    now = datetime.now()

    # 2. Seed Pincode Directory
    print("\n[STEP 2] Seeding Major PIN Codes and Logistics Hubs...")
    from multimodal_cost_engine import PINCODE_REGISTRY, PORTS_REGISTRY, AIRPORTS_REGISTRY

    cur.execute("DELETE FROM pincode_directory;")
    for pin, data in PINCODE_REGISTRY.items():
        cur.execute("""
            INSERT INTO pincode_directory (
                pincode, city, state, country, latitude, longitude,
                is_coastal, nearest_port_id, distance_to_port_km,
                nearest_airport_id, distance_to_airport_km
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (pincode) DO UPDATE SET
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude;
        """, (
            pin, data["city"], data["state"], "India" if int(pin) > 100000 else "International",
            data["lat"], data["lon"], data["is_coastal"],
            data.get("nearest_port"), data.get("port_dist_km", 0.0),
            data.get("nearest_airport"), data.get("airport_dist_km", 0.0)
        ))
    conn.commit()
    print(f"  [SUCCESS] Seeded {len(PINCODE_REGISTRY)} PIN code hubs.")

    # 3. Seed Ports & Airports Registry
    print("\n[STEP 3] Seeding Ports and Cargo Airports Registry...")
    cur.execute("DELETE FROM ports_airports_registry;")
    for port_id, p in PORTS_REGISTRY.items():
        cur.execute("""
            INSERT INTO ports_airports_registry (
                facility_id, facility_type, name, code, city, state_or_country,
                latitude, longitude, has_cold_storage, cold_storage_capacity_cbm,
                active_reefer_plug_points, supports_envirotainer, terminal_handling_base_rate
            ) VALUES (%s, 'PORT', %s, %s, %s, %s, %s, %s, TRUE, 8500.0, 450, TRUE, %s)
            ON CONFLICT (facility_id) DO NOTHING;
        """, (
            port_id, p["name"], p["code"], p["city"], p["state"],
            p["lat"], p["lon"], p["thc_rate"]
        ))

    for air_id, a in AIRPORTS_REGISTRY.items():
        cur.execute("""
            INSERT INTO ports_airports_registry (
                facility_id, facility_type, name, code, city, state_or_country,
                latitude, longitude, has_cold_storage, cold_storage_capacity_cbm,
                active_reefer_plug_points, supports_envirotainer, terminal_handling_base_rate
            ) VALUES (%s, 'AIRPORT', %s, %s, %s, %s, %s, %s, TRUE, 3200.0, 120, TRUE, %s)
            ON CONFLICT (facility_id) DO NOTHING;
        """, (
            air_id, a["name"], a["code"], a["city"], a["city"],
            a["lat"], a["lon"], a["cth_rate_per_kg"] * 500
        ))
    conn.commit()
    print(f"  [SUCCESS] Seeded {len(PORTS_REGISTRY)} Seaports and {len(AIRPORTS_REGISTRY)} Cargo Airports.")

    # 4. Seed Configurable Transport Rate Cards
    print("\n[STEP 4] Seeding Configurable Transport Rate Cards...")
    cur.execute("DELETE FROM transport_rate_cards;")
    rate_cards = [
        # ROAD
        ("RATE-ROAD-REEFER-STD", "ROAD", "ROAD_REEFER_STANDARD", "Standard Highway Cold-Chain Reefer", "Temperature-controlled road transport with continuous GPS and thermal monitoring.", 100, 16000, 54.0, 3500.0, 35.0, 38.0, 450.0, 450.0, 25.0, 10.0, 3.80, 0.35, 18.0, 0.1050, 45.0, 0.0),
        ("RATE-ROAD-DRY-STD", "ROAD", "ROAD_DRY_TRUCK_STANDARD", "General Purpose Road Freight", "Standard ambient truck fleet for non-perishable agricultural and industrial cargo.", 50, 18000, 36.0, 2000.0, 28.0, 30.0, 400.0, 350.0, 0.0, 8.0, 3.20, 0.20, 18.0, 0.1050, 48.0, 0.0),
        
        # MARINE
        ("RATE-MARINE-REEFER-20FT", "MARINE", "MARINE_REEFER_20FT", "20ft ISO Controlled Atmosphere Reefer", "Nautical container transport with active power plug-in, nitrogen injection, and sea telemetry.", 500, 20000, 34.0, 15000.0, 42.0, 44.0, 380.0, 5200.0, 30.0, 12.0, 0.0, 0.30, 18.0, 0.0180, 35.0, 0.0),
        ("RATE-MARINE-REEFER-40HC", "MARINE", "MARINE_REEFER_40HC", "40ft High-Cube Smart Reefer", "Maximum capacity marine reefer for high-volume perishables and ocean export.", 1000, 26000, 48.0, 22000.0, 50.0, 52.0, 380.0, 6800.0, 30.0, 12.0, 0.0, 0.30, 18.0, 0.0180, 35.0, 0.0),
        ("RATE-MARINE-DRY-20FT", "MARINE", "MARINE_DRY_20FT", "20ft General Purpose Dry Ocean Container", "Bulk maritime container freight for non-temperature sensitive goods.", 500, 21500, 22.0, 10000.0, 35.0, 38.0, 350.0, 4000.0, 0.0, 10.0, 0.0, 0.15, 18.0, 0.0180, 35.0, 0.0),

        # AIR
        ("RATE-AIR-PERISHABLE-COOL", "AIR", "AIR_PERISHABLE_COOL_DOLLY", "Priority Air Cargo with Active Cool Dolly", "Fastest air cargo routing with pharma-grade cool dolly and tarmac thermal protection.", 10, 25000, 48.0, 4500.0, 48.0, 50.0, 650.0, 1200.0, 35.0, 15.0, 0.0, 0.20, 18.0, 0.5800, 780.0, 5000.0),
        ("RATE-AIR-GENERAL-STD", "AIR", "AIR_GENERAL_CARGO_STD", "Standard Priority Air Freight", "Scheduled aviation cargo service for high-value urgent parcels and consignments.", 10, 25000, 38.0, 3500.0, 40.0, 42.0, 550.0, 1000.0, 0.0, 14.0, 0.0, 0.15, 18.0, 0.5800, 780.0, 5000.0)
    ]

    for rc in rate_cards:
        cur.execute("""
            INSERT INTO transport_rate_cards (
                rate_id, mode, service_code, service_name, description,
                min_weight_kg, max_weight_kg, base_freight_per_km_or_kg, minimum_charge,
                first_mile_rate_per_km, last_mile_rate_per_km, loading_unloading_rate_per_tonne,
                handling_doc_charge, cold_chain_surcharge_pct, fuel_surcharge_pct,
                toll_rate_per_km, insurance_rate_pct, tax_rate_pct, emissions_co2_kg_per_tonne_km,
                average_speed_kmh, volumetric_divisor
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (service_code) DO NOTHING;
        """, rc)
    conn.commit()
    print(f"  [SUCCESS] Seeded {len(rate_cards)} configurable transport rate cards.")

    # 5. Seed Carrier Services
    print("\n[STEP 5] Seeding Verified Carrier Services...")
    cur.execute("DELETE FROM carrier_services;")
    carriers = [
        ("CARRIER-ROAD-01", "AGRITrust Express Reefer Fleet", "ROAD", "COLD_CHAIN_SPECIALIST", json.dumps(["Tata 407 Reefer", "Eicher Pro 8T Reefer", "BharatBenz 16T Multi-Temp"]), 98, 98.4, True, "dispatch@agritrust-logistics.in", "+91 98220 11223"),
        ("CARRIER-ROAD-02", "Western Agro Transporters", "ROAD", "STANDARD", json.dumps(["Mahindra Bolero LCV", "Tata 1109 14ft", "Ashok Leyland 20ft"]), 94, 95.0, False, "ops@westernagrotrans.com", "+91 98450 33445"),
        ("CARRIER-MARINE-01", "Maersk Line Cold Chain Services", "MARINE", "COLD_CHAIN_SPECIALIST", json.dumps(["20ft Reefer", "40ft High Cube Reefer"]), 97, 96.8, True, "reefer-india@maersk.com", "+91 22 6678 9000"),
        ("CARRIER-MARINE-02", "CMA CGM Maritime Logistics", "MARINE", "STANDARD", json.dumps(["20ft Dry GP", "40ft Dry GP", "40ft Reefer"]), 95, 94.5, True, "mumbai@cma-cgm.com", "+91 22 6123 4567"),
        ("CARRIER-AIR-01", "Air India Cargo Perishable Express", "AIR", "COLD_CHAIN_SPECIALIST", json.dumps(["Boeing 777-300ER Belly", "Airbus A321 Freighter (Active Cool)"]), 99, 99.1, True, "perishables@airindiacargo.in", "+91 11 2565 2000"),
        ("CARRIER-AIR-02", "IndiGo CarGo 6E Priority", "AIR", "EXPRESS", json.dumps(["Airbus A321F Dedicated Freighter"]), 96, 97.2, False, "cargo@goindigo.in", "+91 124 617 3838")
    ]

    for c in carriers:
        cur.execute("""
            INSERT INTO carrier_services (
                carrier_id, carrier_name, mode, service_tier, vehicle_or_vessel_types,
                reliability_score, on_time_performance_pct, cold_chain_certified,
                contact_email, contact_phone
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (carrier_id) DO NOTHING;
        """, c)
    conn.commit()
    print(f"  [SUCCESS] Seeded {len(carriers)} verified carrier services.")

    # 6. Seed Sample Multi-Route Quotes & Active Bookings
    print("\n[STEP 6] Seeding Initial Multimodal Quotes and Demo Bookings...")
    from multimodal_cost_engine import plan_and_compare_all_routes

    # Scenario 1: Nashik to Delhi (Farm to Retailer - Road vs Marine vs Air)
    res1 = plan_and_compare_all_routes(
        pickup_pincode="422001",
        pickup_location="Nashik Sahyadri Farm Hub",
        destination_pincode="110037",
        destination_location="Delhi Central Cold Distribution Hub",
        cargo_weight_kg=4500.0,
        cargo_type="Fresh Organic Table Grapes",
        cargo_volume_cbm=18.0,
        is_perishable=True,
        shelf_life_days=14.0,
        urgency_level="STANDARD",
        temperature_requirement="Chilled (2°C to 6°C)",
        temp_min_c=2.0,
        temp_max_c=6.0,
        insurance_preference="COMPREHENSIVE",
        declared_cargo_value_inr=540000.0,
        priority_preference="BALANCED",
        user_id="usr_logistics_01",
        user_role="LOGISTICS"
    )

    cur.execute("""
        INSERT INTO shipment_quotes (
            quote_id, quote_reference, user_id, user_role,
            pickup_pincode, pickup_location, destination_pincode, destination_location,
            cargo_weight_kg, cargo_type, cargo_volume_cbm, is_perishable, shelf_life_days,
            urgency_level, temperature_requirement, temp_min_c, temp_max_c,
            insurance_preference, declared_cargo_value_inr, priority_preference, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE')
        ON CONFLICT (quote_id) DO NOTHING;
    """, (
        res1["quote_id"], res1["quote_reference"], "usr_logistics_01", "LOGISTICS",
        "422001", "Nashik Sahyadri Farm Hub", "110037", "Delhi Central Cold Distribution Hub",
        4500.0, "Fresh Organic Table Grapes", 18.0, True, 14.0,
        "STANDARD", "Chilled (2°C to 6°C)", 2.0, 6.0,
        "COMPREHENSIVE", 540000.0, "BALANCED"
    ))

    for mode, opt in res1["routes"].items():
        opt_id = f"OPT-{res1['quote_id']}-{mode}"
        cur.execute("""
            INSERT INTO route_options (
                option_id, quote_id, mode, mode_title, is_feasible, infeasibility_reason,
                carrier_name, vehicle_or_vessel_desc, total_estimated_cost_inr,
                estimated_transit_hours, estimated_delivery_time, total_distance_km,
                actual_weight_kg, volumetric_weight_kg, chargeable_weight_kg,
                origin_facility_name, destination_facility_name, cost_breakdown,
                co2_emissions_kg, cold_chain_rating, perishability_risk_level,
                shelf_life_depletion_pct, ai_recommendation_badges,
                ai_recommendation_score, ai_reasoning_summary, route_waypoints,
                data_source
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (option_id) DO NOTHING;
        """, (
            opt_id, res1["quote_id"], mode, opt["mode_title"], opt["is_feasible"], opt["infeasibility_reason"],
            opt["carrier_name"], opt["vehicle_or_vessel_desc"], opt["total_estimated_cost_inr"],
            opt["estimated_transit_hours"], opt["estimated_delivery_time"], opt["total_distance_km"],
            opt["actual_weight_kg"], opt["volumetric_weight_kg"], opt["chargeable_weight_kg"],
            opt["origin_facility_name"], opt["destination_facility_name"], Json(opt["cost_breakdown"]),
            opt["co2_emissions_kg"], opt["cold_chain_rating"], opt["perishability_risk_level"],
            opt["shelf_life_depletion_pct"], Json(opt["ai_recommendation_badges"]),
            opt["ai_recommendation_score"], opt["ai_reasoning_summary"], Json(opt["route_waypoints"]),
            opt["data_source"]
        ))

    # Seed Sample Booking for Road Route
    booking_id = "BKG-MM-2026-001"
    shipment_id = "SHP-MM-ROAD-001"
    cur.execute("""
        INSERT INTO multimodal_bookings (
            booking_id, booking_reference, shipment_id, quote_id, user_id,
            selected_mode, carrier_name, service_type, produce_name, cargo_weight_kg,
            pickup_pincode, pickup_location, destination_pincode, destination_location,
            total_amount_inr, cost_breakdown, booking_status, payment_status,
            temp_setpoint_c, temp_min_c, temp_max_c, target_humidity_pct,
            sender_name, sender_phone, receiver_name, receiver_phone,
            estimated_departure_time, estimated_delivery_time, current_segment_index,
            current_status_summary
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (booking_id) DO NOTHING;
    """, (
        booking_id, "AGRI-BKG-889012", shipment_id, res1["quote_id"], "usr_logistics_01",
        "ROAD", "AGRITrust Express Reefer Fleet", "Eicher Pro Reefer Truck (8.0 MT Controlled Temp)",
        "Fresh Organic Table Grapes", 4500.0,
        "422001", "Nashik Sahyadri Farm Hub", "110037", "Delhi Central Cold Distribution Hub",
        res1["routes"]["ROAD"]["total_estimated_cost_inr"], Json(res1["routes"]["ROAD"]["cost_breakdown"]),
        "IN_TRANSIT", "ESCROW_HELD",
        4.0, 2.0, 6.0, 85.0,
        "Sahyadri Farmer Producer Co.", "+91 98220 54321",
        "Delhi Fresh Agro Mart Retail Hub", "+91 98110 98765",
        now - timedelta(hours=8), now + timedelta(hours=22), 2,
        "Vehicle en route on NH48 corridor. Temperature stable at 4.1°C."
    ))

    # Seed Segments for Road Booking
    cur.execute("""
        INSERT INTO route_segments (
            segment_id, booking_id, shipment_id, segment_order, segment_type,
            segment_title, origin_point, destination_point, distance_km,
            estimated_duration_hours, segment_status, carrier_operator,
            vehicle_or_vessel_identifier, custody_holder, temp_setpoint_c,
            current_temp_c, humidity_pct, departure_time, arrival_time
        ) VALUES 
        ('SEG-001-1', %s, %s, 1, 'FIRST_MILE_ROAD', 'Farm Gate Loading & Pre-Cooling Intake', 'Nashik Packhouse CC-02', 'Nashik Highway Hub', 25.0, 2.0, 'COMPLETED', 'AGRITrust Local Shuttle', 'MH-15-EG-4412', 'Farmer Producer Co-op', 4.0, 4.2, 86.0, %s, %s),
        ('SEG-001-2', %s, %s, 2, 'LONG_HAUL_ROAD', 'Interstate Highway Cold-Chain Transit', 'Nashik Highway Hub', 'Delhi Central Logistics Dock', 1340.0, 26.0, 'ACTIVE', 'AGRITrust Express Reefer Fleet', 'MH-15-TR-8821 (Reefer 8T)', 'Logistics Fleet Driver R. Patil', 4.0, 4.1, 84.0, %s, %s),
        ('SEG-001-3', %s, %s, 3, 'LAST_MILE_ROAD', 'Final Delivery Dock Discharge & Quality QC', 'Delhi Central Logistics Dock', 'Delhi Retail Mart Receiving Dock', 18.0, 2.0, 'PENDING', 'AGRITrust Express Reefer Fleet', 'MH-15-TR-8821', 'Delhi Retail Mart Dock Supervisor', 4.0, 4.0, 85.0, %s, %s)
        ON CONFLICT (segment_id) DO NOTHING;
    """, (
        booking_id, shipment_id, now - timedelta(hours=10), now - timedelta(hours=8),
        booking_id, shipment_id, now - timedelta(hours=8), now + timedelta(hours=18),
        booking_id, shipment_id, now + timedelta(hours=18), now + timedelta(hours=20)
    ))

    # Also register in existing `shipments` table so legacy views and QR codes work seamlessly
    cur.execute("""
        INSERT INTO shipments (
            shipment_id, vehicle_id, product_name, origin, destination,
            target_temp_min, target_temp_max, shipment_status, departure_time,
            expected_delivery_time, farmer_id, buyer_id, logistics_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (shipment_id) DO UPDATE SET
            shipment_status = EXCLUDED.shipment_status;
    """, (
        shipment_id, "FTL-V001", "Fresh Organic Table Grapes",
        "Nashik Sahyadri Farm Hub", "Delhi Central Cold Distribution Hub",
        2.0, 6.0, "IN_TRANSIT", now - timedelta(hours=8), now + timedelta(hours=22),
        "usr_farmer_01", "usr_buyer_01", "usr_logistics_01"
    ))

    # Scenario 2: Nashik to Rotterdam Export (Marine Reefer Container Booking)
    res2 = plan_and_compare_all_routes(
        pickup_pincode="422001",
        pickup_location="Nashik Packhouse CC-02",
        destination_pincode="300002",
        destination_location="EuroFresh Logistics BV, Rotterdam",
        cargo_weight_kg=18500.0,
        cargo_type="Alphonso & Kesar Export Mangoes",
        cargo_volume_cbm=54.0,
        is_perishable=True,
        shelf_life_days=30.0,
        urgency_level="STANDARD",
        temperature_requirement="Controlled Atmosphere (8°C to 12°C)",
        temp_min_c=8.0,
        temp_max_c=12.0,
        insurance_preference="COMPREHENSIVE",
        declared_cargo_value_inr=2200000.0,
        priority_preference="COST",
        user_id="usr_farmer_01",
        user_role="FARMER"
    )

    cur.execute("""
        INSERT INTO shipment_quotes (
            quote_id, quote_reference, user_id, user_role,
            pickup_pincode, pickup_location, destination_pincode, destination_location,
            cargo_weight_kg, cargo_type, cargo_volume_cbm, is_perishable, shelf_life_days,
            urgency_level, temperature_requirement, temp_min_c, temp_max_c,
            insurance_preference, declared_cargo_value_inr, priority_preference, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE')
        ON CONFLICT (quote_id) DO NOTHING;
    """, (
        res2["quote_id"], res2["quote_reference"], "usr_farmer_01", "FARMER",
        "422001", "Nashik Packhouse CC-02", "300002", "EuroFresh Logistics BV, Rotterdam",
        18500.0, "Alphonso & Kesar Export Mangoes", 54.0, True, 30.0,
        "STANDARD", "Controlled Atmosphere (8°C to 12°C)", 8.0, 12.0,
        "COMPREHENSIVE", 2200000.0, "COST"
    ))

    for mode, opt in res2["routes"].items():
        opt_id = f"OPT-{res2['quote_id']}-{mode}"
        cur.execute("""
            INSERT INTO route_options (
                option_id, quote_id, mode, mode_title, is_feasible, infeasibility_reason,
                carrier_name, vehicle_or_vessel_desc, total_estimated_cost_inr,
                estimated_transit_hours, estimated_delivery_time, total_distance_km,
                actual_weight_kg, volumetric_weight_kg, chargeable_weight_kg,
                origin_facility_name, destination_facility_name, cost_breakdown,
                co2_emissions_kg, cold_chain_rating, perishability_risk_level,
                shelf_life_depletion_pct, ai_recommendation_badges,
                ai_recommendation_score, ai_reasoning_summary, route_waypoints,
                data_source
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (option_id) DO NOTHING;
        """, (
            opt_id, res2["quote_id"], mode, opt["mode_title"], opt["is_feasible"], opt["infeasibility_reason"],
            opt["carrier_name"], opt["vehicle_or_vessel_desc"], opt["total_estimated_cost_inr"],
            opt["estimated_transit_hours"], opt["estimated_delivery_time"], opt["total_distance_km"],
            opt["actual_weight_kg"], opt["volumetric_weight_kg"], opt["chargeable_weight_kg"],
            opt["origin_facility_name"], opt["destination_facility_name"], Json(opt["cost_breakdown"]),
            opt["co2_emissions_kg"], opt["cold_chain_rating"], opt["perishability_risk_level"],
            opt["shelf_life_depletion_pct"], Json(opt["ai_recommendation_badges"]),
            opt["ai_recommendation_score"], opt["ai_reasoning_summary"], Json(opt["route_waypoints"]),
            opt["data_source"]
        ))

    # Seed Sample Booking for Marine Route
    booking_id_marine = "BKG-MM-2026-002"
    shipment_id_marine = "SHP-MM-MARINE-002"
    cur.execute("""
        INSERT INTO multimodal_bookings (
            booking_id, booking_reference, shipment_id, quote_id, user_id,
            selected_mode, carrier_name, service_type, produce_name, cargo_weight_kg,
            pickup_pincode, pickup_location, destination_pincode, destination_location,
            total_amount_inr, cost_breakdown, booking_status, payment_status,
            temp_setpoint_c, temp_min_c, temp_max_c, target_humidity_pct,
            sender_name, sender_phone, receiver_name, receiver_phone,
            estimated_departure_time, estimated_delivery_time, current_segment_index,
            current_status_summary
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (booking_id) DO NOTHING;
    """, (
        booking_id_marine, "AGRI-BKG-992144", shipment_id_marine, res2["quote_id"], "usr_farmer_01",
        "MARINE", "Maersk Line Cold Chain Services", "40-ft High Cube Smart Reefer Container",
        "Alphonso & Kesar Export Mangoes", 18500.0,
        "422001", "Nashik Packhouse CC-02", "300002", "EuroFresh Logistics BV, Rotterdam",
        res2["routes"]["MARINE"]["total_estimated_cost_inr"], Json(res2["routes"]["MARINE"]["cost_breakdown"]),
        "IN_TRANSIT", "ESCROW_HELD",
        10.0, 8.0, 12.0, 90.0,
        "Maharashtra Mango Growers Federation", "+91 98230 77889",
        "EuroFresh Logistics Import Dock, Rotterdam", "+31 10 555 7890",
        now - timedelta(days=3), now + timedelta(days=11), 3,
        "Container MSKU-908812 onboard MV AGRI STAR traversing Red Sea / Suez channel."
    ))

    # Seed Segments for Marine Booking
    cur.execute("""
        INSERT INTO route_segments (
            segment_id, booking_id, shipment_id, segment_order, segment_type,
            segment_title, origin_point, destination_point, distance_km,
            estimated_duration_hours, segment_status, carrier_operator,
            vehicle_or_vessel_identifier, custody_holder, temp_setpoint_c,
            current_temp_c, humidity_pct, departure_time, arrival_time
        ) VALUES 
        ('SEG-002-1', %s, %s, 1, 'FIRST_MILE_ROAD', 'Reefer Trailer Transport to Container Terminal', 'Nashik CC-02', 'JNPT Port CFS Gate 3', 185.0, 5.0, 'COMPLETED', 'AGRITrust Port Drayage', 'MH-04-AB-1290', 'Port Drayage Driver', 10.0, 9.8, 88.0, %s, %s),
        ('SEG-002-2', %s, %s, 2, 'PORT_STUFFING', 'Port Customs Clearance & Reefer Plug-in', 'JNPT Terminal 4', 'JNPT Berth 2 Container Yard', 2.0, 24.0, 'COMPLETED', 'JNPT Port Authorities', 'Bay 14-Reefer-Plug-08', 'Terminal Operations Supervisor', 10.0, 10.1, 89.0, %s, %s),
        ('SEG-002-3', %s, %s, 3, 'SEA_VOYAGE', 'Deep Sea Controlled Atmosphere Voyage', 'JNPT Port, Mumbai', 'Port of Rotterdam ECT Delta', 11500.0, 280.0, 'ACTIVE', 'Maersk Line', 'MV AGRI STAR (Voyage VOY-2026-EU04)', 'Chief Officer Marine Navigation', 10.0, 10.0, 90.0, %s, %s),
        ('SEG-002-4', %s, %s, 4, 'LAST_MILE_ROAD', 'European Port Discharge to EuroFresh Receiving Bay', 'Port of Rotterdam ECT', 'EuroFresh Logistics BV, Rotterdam', 45.0, 3.0, 'PENDING', 'EuroTruck Logistics BV', 'NL-BX-8812', 'EuroFresh Inbound Receiver', 10.0, 10.0, 88.0, %s, %s)
        ON CONFLICT (segment_id) DO NOTHING;
    """, (
        booking_id_marine, shipment_id_marine, now - timedelta(days=4), now - timedelta(days=3, hours=19),
        booking_id_marine, shipment_id_marine, now - timedelta(days=3, hours=19), now - timedelta(days=2, hours=19),
        booking_id_marine, shipment_id_marine, now - timedelta(days=2, hours=19), now + timedelta(days=9),
        booking_id_marine, shipment_id_marine, now + timedelta(days=9), now + timedelta(days=9, hours=4)
    ))

    # Scenario 3: Bangalore to Guwahati (Air Cargo Express Booking)
    res3 = plan_and_compare_all_routes(
        pickup_pincode="560001",
        pickup_location="Bengaluru Cold Hub (Whitefield)",
        destination_pincode="781001",
        destination_location="Guwahati High-Altitude Health Depot",
        cargo_weight_kg=850.0,
        cargo_type="Pharmaceutical Cold Vaccines & Fresh Berries",
        cargo_volume_cbm=3.8,
        package_length_cm=120.0,
        package_width_cm=100.0,
        package_height_cm=160.0,
        is_perishable=True,
        shelf_life_days=4.0,
        urgency_level="CRITICAL",
        temperature_requirement="Deep Chilled (2°C to 4°C)",
        temp_min_c=2.0,
        temp_max_c=4.0,
        insurance_preference="COMPREHENSIVE",
        declared_cargo_value_inr=1500000.0,
        priority_preference="SPEED",
        user_id="usr_buyer_01",
        user_role="BUYER"
    )

    cur.execute("""
        INSERT INTO shipment_quotes (
            quote_id, quote_reference, user_id, user_role,
            pickup_pincode, pickup_location, destination_pincode, destination_location,
            cargo_weight_kg, cargo_type, cargo_volume_cbm, is_perishable, shelf_life_days,
            urgency_level, temperature_requirement, temp_min_c, temp_max_c,
            insurance_preference, declared_cargo_value_inr, priority_preference, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE')
        ON CONFLICT (quote_id) DO NOTHING;
    """, (
        res3["quote_id"], res3["quote_reference"], "usr_buyer_01", "BUYER",
        "560001", "Bengaluru Cold Hub (Whitefield)", "781001", "Guwahati High-Altitude Health Depot",
        850.0, "Pharmaceutical Cold Vaccines & Fresh Berries", 3.8, True, 4.0,
        "CRITICAL", "Deep Chilled (2°C to 4°C)", 2.0, 4.0,
        "COMPREHENSIVE", 1500000.0, "SPEED"
    ))

    for mode, opt in res3["routes"].items():
        opt_id = f"OPT-{res3['quote_id']}-{mode}"
        cur.execute("""
            INSERT INTO route_options (
                option_id, quote_id, mode, mode_title, is_feasible, infeasibility_reason,
                carrier_name, vehicle_or_vessel_desc, total_estimated_cost_inr,
                estimated_transit_hours, estimated_delivery_time, total_distance_km,
                actual_weight_kg, volumetric_weight_kg, chargeable_weight_kg,
                origin_facility_name, destination_facility_name, cost_breakdown,
                co2_emissions_kg, cold_chain_rating, perishability_risk_level,
                shelf_life_depletion_pct, ai_recommendation_badges,
                ai_recommendation_score, ai_reasoning_summary, route_waypoints,
                data_source
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (option_id) DO NOTHING;
        """, (
            opt_id, res3["quote_id"], mode, opt["mode_title"], opt["is_feasible"], opt["infeasibility_reason"],
            opt["carrier_name"], opt["vehicle_or_vessel_desc"], opt["total_estimated_cost_inr"],
            opt["estimated_transit_hours"], opt["estimated_delivery_time"], opt["total_distance_km"],
            opt["actual_weight_kg"], opt["volumetric_weight_kg"], opt["chargeable_weight_kg"],
            opt["origin_facility_name"], opt["destination_facility_name"], Json(opt["cost_breakdown"]),
            opt["co2_emissions_kg"], opt["cold_chain_rating"], opt["perishability_risk_level"],
            opt["shelf_life_depletion_pct"], Json(opt["ai_recommendation_badges"]),
            opt["ai_recommendation_score"], opt["ai_reasoning_summary"], Json(opt["route_waypoints"]),
            opt["data_source"]
        ))

    # Seed Sample Booking for Air Route
    booking_id_air = "BKG-MM-2026-003"
    shipment_id_air = "SHP-MM-AIR-003"
    cur.execute("""
        INSERT INTO multimodal_bookings (
            booking_id, booking_reference, shipment_id, quote_id, user_id,
            selected_mode, carrier_name, service_type, produce_name, cargo_weight_kg,
            pickup_pincode, pickup_location, destination_pincode, destination_location,
            total_amount_inr, cost_breakdown, booking_status, payment_status,
            temp_setpoint_c, temp_min_c, temp_max_c, target_humidity_pct,
            sender_name, sender_phone, receiver_name, receiver_phone,
            estimated_departure_time, estimated_delivery_time, current_segment_index,
            current_status_summary
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (booking_id) DO NOTHING;
    """, (
        booking_id_air, "AGRI-BKG-771239", shipment_id_air, res3["quote_id"], "usr_buyer_01",
        "AIR", "Air India Cargo Perishable Express", "Envirotainer RKN Active Temp ULD",
        "Pharmaceutical Cold Vaccines & Fresh Berries", 850.0,
        "560001", "Bengaluru Cold Hub (Whitefield)", "781001", "Guwahati High-Altitude Health Depot",
        res3["routes"]["AIR"]["total_estimated_cost_inr"], Json(res3["routes"]["AIR"]["cost_breakdown"]),
        "IN_TRANSIT", "ESCROW_HELD",
        3.0, 2.0, 4.0, 80.0,
        "BioFresh Biotech Hub, Bengaluru", "+91 80 2841 9000",
        "Northeast Cold Health Depot, Guwahati", "+91 361 245 8890",
        now - timedelta(hours=3), now + timedelta(hours=9), 2,
        "Flight AI-772 active cruise at FL360. Envirotainer active temp verified at 2.8°C."
    ))

    # Seed Segments for Air Booking
    cur.execute("""
        INSERT INTO route_segments (
            segment_id, booking_id, shipment_id, segment_order, segment_type,
            segment_title, origin_point, destination_point, distance_km,
            estimated_duration_hours, segment_status, carrier_operator,
            vehicle_or_vessel_identifier, custody_holder, temp_setpoint_c,
            current_temp_c, humidity_pct, departure_time, arrival_time
        ) VALUES 
        ('SEG-003-1', %s, %s, 1, 'FIRST_MILE_ROAD', 'Express Temp-Controlled Van to Cargo Terminal', 'Bengaluru Whitefield Hub', 'BLR Airport Cargo Terminal 1', 35.0, 2.0, 'COMPLETED', 'AGRITrust Air Shuttle', 'KA-01-MJ-9912', 'Express Courier Handler', 3.0, 3.1, 79.0, %s, %s),
        ('SEG-003-2', %s, %s, 2, 'AIR_FLIGHT', 'Dedicated Air Cargo Flight Transit', 'Kempegowda Int. Cargo (BLR)', 'Guwahati Borjhar Airport (GAU)', 2150.0, 4.0, 'ACTIVE', 'Air India Cargo', 'Boeing 777-300ER (Flight AI-772)', 'Air India Cargo Flight Crew', 3.0, 2.8, 80.0, %s, %s),
        ('SEG-003-3', %s, %s, 3, 'LAST_MILE_ROAD', 'Priority Cold Dolly Airport Discharge to Depot', 'Guwahati Cargo Dock', 'Guwahati Health Depot Receiving Bay', 22.0, 2.0, 'PENDING', 'Guwahati Cold Express', 'AS-01-AX-3301', 'Depot Cold Storage Officer', 3.0, 3.0, 80.0, %s, %s)
        ON CONFLICT (segment_id) DO NOTHING;
    """, (
        booking_id_air, shipment_id_air, now - timedelta(hours=4), now - timedelta(hours=2),
        booking_id_air, shipment_id_air, now - timedelta(hours=2), now + timedelta(hours=2),
        booking_id_air, shipment_id_air, now + timedelta(hours=2), now + timedelta(hours=4)
    ))

    # Also register Air shipment in existing `shipments` table
    cur.execute("""
        INSERT INTO shipments (
            shipment_id, vehicle_id, product_name, origin, destination,
            target_temp_min, target_temp_max, shipment_status, departure_time,
            expected_delivery_time, farmer_id, buyer_id, logistics_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (shipment_id) DO UPDATE SET
            shipment_status = EXCLUDED.shipment_status;
    """, (
        shipment_id_air, "FTL-V002", "Pharmaceutical Cold Vaccines & Fresh Berries",
        "Bengaluru Cold Hub", "Guwahati Health Depot",
        2.0, 4.0, "IN_TRANSIT", now - timedelta(hours=3), now + timedelta(hours=9),
        "usr_farmer_01", "usr_buyer_01", "usr_logistics_01"
    ))

    conn.commit()
    conn.close()
    print("  [SUCCESS] Seeded demonstration shipment quotes, route options, bookings, and route segments.")
    print("\n" + "=" * 80)
    print(" AGRITRUST MULTI-MODAL LOGISTICS MIGRATION COMPLETE!")
    print("=" * 80)

if __name__ == "__main__":
    run_migration_and_seed()
