import os
import psycopg2
from psycopg2.extras import Json
import json
from datetime import datetime, timedelta
from auth import hash_password

def migrate_and_seed_spoilage():
    print("=" * 65)
    print("AGRITRUST: SELL BEFORE SPOILAGE SCHEMA MIGRATION & SEEDING")
    print("=" * 65)

    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        database=os.environ.get("DB_NAME", "ftl_cold_chain"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "1234")
    )
    cur = conn.cursor()

    # 1. Execute SQL Migration Schema
    schema_path = os.path.join(os.path.dirname(__file__), "agritrust_spoilage_schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_commands = f.read()
    
    cur.execute(sql_commands)
    conn.commit()
    print("[OK] Spoilage Marketplace Schema migration executed successfully.")

    # 2. Seed Dedicated Buyer Accounts for the Core Demo Scenario
    buyer_accounts = [
        (
            "usr_buyer_a",
            "buyer.thane@agritrust.io",
            hash_password("Password123!"),
            "Meera Nair (Buyer A)",
            "BUYER",
            "+91 98200 44556",
            "FreshMart Local Retail Hub — Thane",
            True,
            True,
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        ),
        (
            "usr_buyer_b",
            "buyer.kalyan@agritrust.io",
            hash_password("Password123!"),
            "Suresh Joshi (Buyer B)",
            "BUYER",
            "+91 98211 77889",
            "Kalyan Wholesale APMC Traders",
            True,
            True,
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150"
        )
    ]

    for u in buyer_accounts:
        cur.execute("""
            INSERT INTO users (user_id, email, password_hash, full_name, role, phone, company_name, is_verified, is_active, avatar_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                company_name = EXCLUDED.company_name;
        """, u)
    conn.commit()
    print("[OK] Seeded Demo Buyers: Buyer A (Thane) & Buyer B (Kalyan).")

    # 3. Seed the Core Business Demonstration Shipment (500 kg Tomatoes, 30h ETA, 36h Shelf Life)
    now = datetime.now()
    departure_time = now - timedelta(hours=6)
    eta_mumbai = now + timedelta(hours=30)

    cur.execute("""
        INSERT INTO shipments (
            shipment_id, vehicle_id, product_name, origin, destination,
            target_temp_min, target_temp_max, shipment_status, departure_time,
            expected_delivery_time, farmer_id, buyer_id, cold_storage_id, qr_code_hash
        )
        VALUES (
            'SHP-TOMATO-001', 'FTL-V001', 'Tomatoes (Hybrid Table Red)', 
            'Sahyadri Farm Gate #1, Nashik', 'APMC Main Market Terminal, Vashi, Mumbai',
            10.0, 14.0, 'IN_TRANSIT', %s, %s, 'usr_farmer_01', 'usr_buyer_01', 'CSF-101', 'AGRI-VERIFY-TOMATO-001'
        )
        ON CONFLICT (shipment_id) DO UPDATE SET
            product_name = EXCLUDED.product_name,
            shipment_status = EXCLUDED.shipment_status,
            expected_delivery_time = EXCLUDED.expected_delivery_time;
    """, (departure_time, eta_mumbai))

    # Clean up previous demo transaction records for SHP-TOMATO-001
    cur.execute("DELETE FROM shipment_allocations WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("DELETE FROM route_change_history WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("DELETE FROM redirection_requests WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("DELETE FROM marketplace_offers WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("DELETE FROM rescue_storage_requests WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("DELETE FROM receiving_records WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("DELETE FROM shipment_events WHERE shipment_id = 'SHP-TOMATO-001' AND event_type = 'SHIPMENT_REDIRECTED';")

    # Shipment Quality Baseline
    cur.execute("DELETE FROM shipment_quality WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("""
        INSERT INTO shipment_quality (
            shipment_id, grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity,
            quality_notes, recorded_by, recorded_at
        )
        VALUES (
            'SHP-TOMATO-001', 450.0, 50.0, 0.0, 500.0,
            'Inspected at harvest. Firmness 4.2 kg/cm2, brix 5.2. Pre-conditioned at 12.5°C.', 'Ramesh Patil (Farmer)', %s
        );
    """, (departure_time,))

    # 4. Seed Spoilage Risk Assessment for SHP-TOMATO-001
    factors_list = [
        "Produce type 'Tomatoes' baseline shelf life: 96.0 hrs from harvest.",
        "Elapsed transit time: 6.0 hrs on NH-3 highway.",
        "Average cargo temperature: 13.8°C with intermittent thermal spike (+1.8°C above optimal).",
        "Estimated remaining shelf life: 36.0 hrs.",
        "Original delivery ETA: 30.0 hrs (Destination: Mumbai Central APMC).",
        "Delivery safety margin: +6.0 hrs (Critically narrow against 6.0 hr safety buffer).",
        "Alert: Potential transit congestion may cause delivery to exceed the 36-hour safe shelf-life window."
    ]

    cur.execute("""
        INSERT INTO spoilage_risk_assessments (
            assessment_id, shipment_id, crop_name, estimated_shelf_life_hours, predicted_eta_hours,
            safety_buffer_hours, risk_level, confidence_score, factors, assessed_at
        )
        VALUES (
            'ASSESS-TOMATO-001', 'SHP-TOMATO-001', 'Tomatoes', 36.0, 30.0,
            6.0, 'MODERATE', 88, %s, %s
        )
        ON CONFLICT (assessment_id) DO UPDATE SET
            estimated_shelf_life_hours = EXCLUDED.estimated_shelf_life_hours,
            predicted_eta_hours = EXCLUDED.predicted_eta_hours,
            risk_level = EXCLUDED.risk_level,
            factors = EXCLUDED.factors;
    """, (Json(factors_list), now))

    # 5. Seed Real Registered Buyer Demand for Demo Matching (Buyer A & Buyer B)
    buyer_demands = [
        (
            "DEM-TOMATO-A",
            "usr_buyer_a",
            "Tomatoes",
            "Hybrid Table Red",
            300.0,
            0.0,
            38.00,
            "Grade A or Export Quality",
            "FreshMart Distribution Center, Ghodbunder Rd, Thane",
            "Thane",
            30.0,
            "TODAY",
            now.date(),
            "Urgent local demand for fresh retail crates. Pre-cooling dock open today.",
            True,
            "ACTIVE"
        ),
        (
            "DEM-TOMATO-B",
            "usr_buyer_b",
            "Tomatoes",
            "Hybrid Table Red",
            200.0,
            0.0,
            36.00,
            "Grade A or B (Good Condition)",
            "Kalyan Wholesale APMC Mandi, Gate 3, Kalyan West",
            "Kalyan",
            45.0,
            "TOMORROW",
            (now + timedelta(days=1)).date(),
            "Wholesale auction lot required for morning distribution.",
            True,
            "ACTIVE"
        ),
        (
            "DEM-MANGO-01",
            "usr_buyer_01",
            "Mango",
            "Alphonso (Hapus)",
            800.0,
            0.0,
            185.00,
            "Grade A (Export Pack)",
            "FreshMart Mega Hub, Sector 19, Vashi, Navi Mumbai",
            "Navi Mumbai",
            60.0,
            "TODAY",
            now.date(),
            "Supermarket chain fulfillment requirement.",
            False,
            "ACTIVE"
        )
    ]

    for bd in buyer_demands:
        cur.execute("""
            INSERT INTO buyer_demand (
                demand_id, buyer_id, produce_name, variety, quantity_demanded_kg, fulfilled_quantity_kg,
                offered_price_per_kg, acceptable_quality_grade, delivery_location, delivery_district,
                max_delivery_distance_km, receiving_window, required_delivery_date, notes, is_demo, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (demand_id) DO UPDATE SET
                quantity_demanded_kg = EXCLUDED.quantity_demanded_kg,
                offered_price_per_kg = EXCLUDED.offered_price_per_kg,
                status = EXCLUDED.status;
        """, bd)

    # 6. Seed In-App Marketplace Notification for Farmer
    cur.execute("DELETE FROM marketplace_notifications WHERE shipment_id = 'SHP-TOMATO-001';")
    cur.execute("""
        INSERT INTO marketplace_notifications (
            user_id, user_role, title, message, shipment_id, action_type, is_read, created_at
        )
        VALUES (
            'usr_farmer_01', 'FARMER',
            '[ALERT] Spoilage Risk Warning on Shipment #SHP-TOMATO-001',
            'Predicted delivery ETA (30.0 hrs) is approaching estimated shelf life (36.0 hrs). 2 alternative nearby buyers identified within 25 km.',
            'SHP-TOMATO-001', 'SPOILAGE_ALERT', FALSE, %s
        );
    """, (now,))

    conn.commit()
    conn.close()

    print("[OK] Seeded Core Demo Scenario: Shipment #SHP-TOMATO-001 (500 kg).")
    print("[OK] Seeded Buyer A Demand: 300 kg @ Rs. 38/kg (12 km, 1h delivery today).")
    print("[OK] Seeded Buyer B Demand: 200 kg @ Rs. 36/kg (25 km, 2h delivery tomorrow).")
    print("[OK] Seeded Spoilage Risk Assessment & Notification.")
    print("=" * 65)
    print("MIGRATION & SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    migrate_and_seed_spoilage()

