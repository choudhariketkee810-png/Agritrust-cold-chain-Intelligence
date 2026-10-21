import os
import psycopg2
from psycopg2.extras import Json
import json
from datetime import datetime, timedelta
from auth import hash_password

def migrate_and_seed():
    print("=" * 65)
    print("AGRITRUST: DATABASE MIGRATION & ROLE SEEDING")
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
    schema_path = os.path.join(os.path.dirname(__file__), "agritrust_roles_schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_commands = f.read()
    
    cur.execute(sql_commands)
    conn.commit()
    print("[OK] Schema migration script executed successfully.")

    # 2. Seed Default Accounts for all 5 Roles
    users_data = [
        (
            "usr_admin_01",
            "admin@agritrust.io",
            hash_password("AdminSecret2026!"),
            "Vikram Malhotra",
            "ADMIN",
            "+91 98200 11223",
            "AGRITrust Platform Governance",
            True,
            True,
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        ),
        (
            "usr_farmer_01",
            "farmer@agritrust.io",
            hash_password("Password123!"),
            "Ramesh Patil",
            "FARMER",
            "+91 98220 54321",
            "Patil Agri Farms & Orchards",
            True,
            True,
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        ),
        (
            "usr_logistics_01",
            "logistics@agritrust.io",
            hash_password("Password123!"),
            "Rajesh Gaikwad",
            "LOGISTICS",
            "+91 99230 67890",
            "Cold Chain Logistics Express Pvt Ltd",
            True,
            True,
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        ),
        (
            "usr_coldstorage_01",
            "coldstorage@agritrust.io",
            hash_password("Password123!"),
            "Sanjay Kadam",
            "COLD_STORAGE",
            "+91 97650 12345",
            "MahaCold Agro Infrastructure",
            True,
            True,
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
        ),
        (
            "usr_buyer_01",
            "buyer@agritrust.io",
            hash_password("Password123!"),
            "Ananya Deshmukh",
            "BUYER",
            "+91 98210 98765",
            "FreshMart Agro Retailers India",
            True,
            True,
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        )
    ]

    for u in users_data:
        cur.execute("""
            INSERT INTO users (user_id, email, password_hash, full_name, role, phone, company_name, is_verified, is_active, avatar_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                phone = EXCLUDED.phone,
                company_name = EXCLUDED.company_name,
                is_verified = EXCLUDED.is_verified,
                is_active = EXCLUDED.is_active,
                avatar_url = EXCLUDED.avatar_url;
        """, u)
    conn.commit()
    print("[OK] Seeded 5 standard demo user accounts for all roles.")

    # 3. Seed Farmer Farms
    farms_data = [
        (
            "FARM-101",
            "usr_farmer_01",
            "Sahyadri Valley Orchards",
            "Plot 42, Dindori Road, Dindori",
            "Nashik",
            "Maharashtra",
            15.5,
            ["Mango", "Grapes", "Pomegranate"],
            "Rich Black Loam",
            "Automated Drip + Solar Borewell",
            True
        ),
        (
            "FARM-102",
            "usr_farmer_01",
            "Godavari River Agro Estate",
            "Gat No 118, Niphad Highway",
            "Nashik",
            "Maharashtra",
            8.0,
            ["Table Grapes", "Tomatoes", "Capsicum"],
            "Alluvial Red Loam",
            "Canal + Micro Sprinklers",
            False
        )
    ]

    for f in farms_data:
        cur.execute("""
            INSERT INTO farmer_farms (farm_id, farmer_id, farm_name, location, district, state, acreage, primary_crops, soil_type, water_source, organic_certified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (farm_id) DO UPDATE SET
                farm_name = EXCLUDED.farm_name,
                location = EXCLUDED.location,
                district = EXCLUDED.district,
                acreage = EXCLUDED.acreage,
                organic_certified = EXCLUDED.organic_certified;
        """, f)
    conn.commit()
    print("[OK] Seeded farmer farms.")

    # 4. Seed Produce Listings
    listings_data = [
        (
            "PROD-101",
            "usr_farmer_01",
            "FARM-101",
            "Mango",
            "Ratnagiri Alphonso (Hapus)",
            datetime.now().date() - timedelta(days=2),
            datetime.now().date() + timedelta(days=1),
            1000.0,
            250.0,
            180.0,
            10.0,
            13.0,
            "Grade A (Export Quality)",
            16.5,
            74.5,
            "Harvested at optimal 85% maturity index. Pre-conditioned at 12°C. Zero pesticide residue.",
            Json([
                "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500",
                "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=500"
            ]),
            "AVAILABLE"
        ),
        (
            "PROD-102",
            "usr_farmer_01",
            "FARM-102",
            "Grapes",
            "Thompson Seedless (White)",
            datetime.now().date() - timedelta(days=1),
            datetime.now().date() + timedelta(days=3),
            2500.0,
            2500.0,
            110.0,
            0.5,
            2.5,
            "Grade A (Export Quality)",
            18.2,
            82.0,
            "Crisp berry firmness (>18mm dia). Pre-cooled down to 2°C with SO2 sulfur pads.",
            Json([
                "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500"
            ]),
            "AVAILABLE"
        ),
        (
            "PROD-103",
            "usr_farmer_01",
            "FARM-101",
            "Pomegranate",
            "Bhagwa Ruby Red",
            datetime.now().date() - timedelta(days=3),
            datetime.now().date() + timedelta(days=5),
            1500.0,
            1500.0,
            140.0,
            5.0,
            7.0,
            "Grade A (Domestic Premium)",
            15.0,
            78.0,
            "Deep red arils, uniform size (>300g per fruit). Hydro-cooled and packed in ventilated crates.",
            Json([
                "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500"
            ]),
            "AVAILABLE"
        )
    ]

    for l in listings_data:
        cur.execute("""
            INSERT INTO produce_listings (listing_id, farmer_id, farm_id, crop_name, variety, harvest_date, expected_dispatch_date, total_quantity_kg, available_quantity_kg, unit_price_per_kg, target_temp_min, target_temp_max, quality_grade, brix_level, moisture_percent, inspection_notes, photo_urls, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (listing_id) DO UPDATE SET
                crop_name = EXCLUDED.crop_name,
                variety = EXCLUDED.variety,
                total_quantity_kg = EXCLUDED.total_quantity_kg,
                available_quantity_kg = EXCLUDED.available_quantity_kg,
                unit_price_per_kg = EXCLUDED.unit_price_per_kg,
                target_temp_min = EXCLUDED.target_temp_min,
                target_temp_max = EXCLUDED.target_temp_max,
                inspection_notes = EXCLUDED.inspection_notes,
                status = EXCLUDED.status;
        """, l)
    conn.commit()
    print("[OK] Seeded produce listings.")

    # 5. Seed Cold Storage Facilities & Chambers
    facilities_data = [
        (
            "CSF-101",
            "usr_coldstorage_01",
            "MahaCold Multi-Chamber Agro Hub",
            "MIDC Phase 2, Pimpalgaon Baswant",
            "Nashik",
            "Maharashtra",
            "+91 97650 12345",
            "ops@mahacold.in",
            Json(["Reefer CA", "Cold Room", "Pre-cooling Tunnel", "Blast Freezer"]),
            500.0,
            320.0,
            180.0,
            True
        ),
        (
            "CSF-102",
            "usr_coldstorage_01",
            "Sahyadri Fresh Cold Logistics Hub",
            "Gat No 88, Mumbai-Agra National Highway, Ambad",
            "Nashik",
            "Maharashtra",
            "+91 98230 45678",
            "contact@sahyadricold.com",
            Json(["Controlled Atmosphere", "Pre-cooling", "Sorting & Packing Line"]),
            750.0,
            480.0,
            160.0,
            True
        )
    ]

    for fac in facilities_data:
        cur.execute("""
            INSERT INTO cold_storage_facilities (facility_id, user_id, facility_name, location, district, state, contact_phone, contact_email, storage_types, total_capacity_mt, available_capacity_mt, rate_per_mt_day, is_verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (facility_id) DO UPDATE SET
                facility_name = EXCLUDED.facility_name,
                total_capacity_mt = EXCLUDED.total_capacity_mt,
                available_capacity_mt = EXCLUDED.available_capacity_mt,
                rate_per_mt_day = EXCLUDED.rate_per_mt_day;
        """, fac)

    chambers_data = [
        ("CHM-01", "CSF-101", "Chamber 1 — Tropical Fruit (Mango / Papaya)", 100.0, 45.0, 11.4, 10.0, 13.0, 85.0, ["Mango", "Papaya", "Guava"], "ACTIVE"),
        ("CHM-02", "CSF-101", "Chamber 2 — Deep Chill (Grapes / Berries)", 150.0, 60.0, 1.2, 0.5, 2.5, 92.0, ["Grapes", "Strawberries", "Blueberries"], "ACTIVE"),
        ("CHM-03", "CSF-101", "Chamber 3 — Sub-Tropical (Pomegranate / Citrus)", 150.0, 75.0, 5.8, 5.0, 7.0, 88.0, ["Pomegranate", "Orange", "Lemon"], "ACTIVE"),
        ("CHM-04", "CSF-101", "Chamber 4 — Pre-Cooling Fast Intake Tunnel", 100.0, 0.0, 4.0, 2.0, 6.0, 80.0, ["All Perishables"], "ACTIVE"),
        ("CHM-11", "CSF-102", "Unit A — CA Long Duration Room", 350.0, 150.0, 1.0, 0.0, 2.0, 94.0, ["Grapes", "Apples"], "ACTIVE"),
        ("CHM-12", "CSF-102", "Unit B — Reefer General Room", 400.0, 120.0, 10.8, 10.0, 14.0, 86.0, ["Mangoes", "Vegetables"], "ACTIVE")
    ]

    for chm in chambers_data:
        cur.execute("""
            INSERT INTO cold_storage_chambers (chamber_id, facility_id, chamber_name, capacity_mt, occupied_mt, current_temperature, target_temp_min, target_temp_max, current_humidity, compatible_produce, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (chamber_id) DO UPDATE SET
                chamber_name = EXCLUDED.chamber_name,
                capacity_mt = EXCLUDED.capacity_mt,
                occupied_mt = EXCLUDED.occupied_mt,
                current_temperature = EXCLUDED.current_temperature,
                target_temp_min = EXCLUDED.target_temp_min,
                target_temp_max = EXCLUDED.target_temp_max,
                current_humidity = EXCLUDED.current_humidity,
                status = EXCLUDED.status;
        """, chm)
    conn.commit()
    print("[OK] Seeded cold storage facilities & chambers.")

    # 6. Seed Logistics Profiles, Vehicles & Drivers
    cur.execute("""
        INSERT INTO logistics_profiles (profile_id, user_id, company_name, fleet_size, license_number, service_regions, rating, insurance_policy_number, is_verified)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            fleet_size = EXCLUDED.fleet_size,
            license_number = EXCLUDED.license_number,
            rating = EXCLUDED.rating;
    """, (
        "LOG-PROF-01",
        "usr_logistics_01",
        "Cold Chain Logistics Express Pvt Ltd",
        16,
        "MH-LOG-2024-88992",
        ["Maharashtra", "Gujarat", "Goa", "Karnataka", "Delhi-NCR"],
        4.88,
        "ICICI-LOMBARD-CARGO-7762",
        True
    ))

    drivers_data = [
        ("DRV-01", "usr_logistics_01", "Ramesh Shinde", "+91 98221 11223", "DL-MH15-2018-00921", "FTL-V001", "ON_DUTY"),
        ("DRV-02", "usr_logistics_01", "Suresh Baburao Kale", "+91 98222 33445", "DL-MH15-2019-04412", "FTL-V002", "AVAILABLE"),
        ("DRV-03", "usr_logistics_01", "Vijay More", "+91 98223 55667", "DL-MH12-2020-09871", "FTL-V003", "AVAILABLE"),
        ("DRV-04", "usr_logistics_01", "Santosh Jagtap", "+91 98224 77889", "DL-MH14-2017-06123", "FTL-V004", "OFF_DUTY")
    ]

    for d in drivers_data:
        cur.execute("""
            INSERT INTO logistics_drivers (driver_id, logistics_user_id, driver_name, phone, license_number, assigned_vehicle_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (driver_id) DO UPDATE SET
                driver_name = EXCLUDED.driver_name,
                phone = EXCLUDED.phone,
                assigned_vehicle_id = EXCLUDED.assigned_vehicle_id,
                status = EXCLUDED.status;
        """, d)
    
    # Ensure existing vehicles table has records
    vehicles_data = [
        ("FTL-V001", "MH-15-AB-1234", "REEFER_HEAVY_10T", 5000, "ON", "ACTIVE"),
        ("FTL-V002", "MH-15-CD-5678", "REEFER_MEDIUM_5T", 3500, "ON", "ACTIVE"),
        ("FTL-V003", "MH-12-EF-9012", "REEFER_VAN_2T", 2000, "STANDBY", "ACTIVE"),
        ("FTL-V004", "MH-14-GH-3456", "REEFER_CONTAINER_20T", 12000, "ON", "ACTIVE")
    ]
    for v in vehicles_data:
        cur.execute("""
            INSERT INTO vehicles (vehicle_id, vehicle_number, vehicle_type, capacity_kg, refrigeration_status, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (vehicle_id) DO UPDATE SET
                vehicle_number = EXCLUDED.vehicle_number,
                vehicle_type = EXCLUDED.vehicle_type,
                capacity_kg = EXCLUDED.capacity_kg,
                refrigeration_status = EXCLUDED.refrigeration_status,
                status = EXCLUDED.status;
        """, v)
    conn.commit()
    print("[OK] Seeded logistics profile, drivers, and vehicles.")

    # 7. Seed Cold Storage Bookings
    bookings_data = [
        (
            "CSB-5001",
            "CSF-101",
            "CHM-01",
            "usr_farmer_01",
            "Mango (Alphonso)",
            5.0,
            datetime.now().date() - timedelta(days=3),
            10,
            "INTAKE_COMPLETED",
            11.2,
            "Grade A (Intact)",
            datetime.now().date() + timedelta(days=7),
            9000.0,
            "Pre-cooled at 11.2°C upon arrival. Stored on wooden pallets in Chamber 1."
        ),
        (
            "CSB-5002",
            "CSF-101",
            "CHM-03",
            "usr_farmer_01",
            "Pomegranate (Bhagwa)",
            8.0,
            datetime.now().date() + timedelta(days=1),
            14,
            "REQUESTED",
            None,
            None,
            datetime.now().date() + timedelta(days=15),
            20160.0,
            "Requested storage booking for upcoming harvest batch."
        )
    ]

    for b in bookings_data:
        cur.execute("""
            INSERT INTO storage_bookings (booking_id, facility_id, chamber_id, farmer_id, produce_name, quantity_mt, requested_intake_date, duration_days, status, intake_temperature, intake_quality_grade, dispatch_date, estimated_cost, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (booking_id) DO UPDATE SET
                status = EXCLUDED.status,
                intake_temperature = EXCLUDED.intake_temperature,
                intake_quality_grade = EXCLUDED.intake_quality_grade,
                notes = EXCLUDED.notes;
        """, b)
    conn.commit()
    print("[OK] Seeded cold storage bookings.")

    # 8. Seed Buyer Orders & Connect with Shipments
    orders_data = [
        (
            "ORD-9001",
            "usr_buyer_01",
            "PROD-101",
            "usr_farmer_01",
            "SHP-0001",
            "Mango (Ratnagiri Alphonso)",
            1000.0,
            180.0,
            180000.0,
            "SHIPPED",
            "ESCROW_LOCKED",
            "FreshMart Central Distribution Center, Sector 19, Vashi, Navi Mumbai 400705",
            datetime.now().date() + timedelta(days=1),
            "Requires continuous temperature verification certificate upon delivery dock inspection."
        ),
        (
            "ORD-9002",
            "usr_buyer_01",
            "PROD-102",
            "usr_farmer_01",
            None,
            "Grapes (Thompson Seedless)",
            500.0,
            110.0,
            55000.0,
            "CONFIRMED",
            "ESCROW_LOCKED",
            "FreshMart Express Hub, Andheri East, Mumbai 400069",
            datetime.now().date() + timedelta(days=3),
            "Booking cold transport dispatch for weekend distribution."
        )
    ]

    for o in orders_data:
        cur.execute("""
            INSERT INTO buyer_orders (order_id, buyer_id, listing_id, farmer_id, shipment_id, produce_name, quantity_kg, unit_price, total_amount, order_status, payment_status, delivery_address, required_delivery_date, buyer_notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (order_id) DO UPDATE SET
                order_status = EXCLUDED.order_status,
                payment_status = EXCLUDED.payment_status,
                shipment_id = EXCLUDED.shipment_id;
        """, o)
    conn.commit()
    print("[OK] Seeded buyer orders.")

    # 9. Update Shipments table with Role Links
    cur.execute("""
        UPDATE shipments 
        SET farmer_id = 'usr_farmer_01', 
            buyer_id = 'usr_buyer_01', 
            logistics_id = 'usr_logistics_01', 
            cold_storage_id = 'CSF-101',
            qr_code_hash = 'AGRI-SHP0001-VERIFIED-HASH-2026'
        WHERE shipment_id = 'SHP-0001';
    """)
    conn.commit()
    print("[OK] Updated existing shipment SHP-0001 with role linkages.")

    # 10. Seed Disputes & AI Evidence Analysis
    disputes_data = [
        (
            "DSP-7001",
            "SHP-0001",
            "ORD-9001",
            "usr_buyer_01",
            "BUYER",
            "LOGISTICS",
            "TEMPERATURE_EXCURSION",
            25000.0,
            "Received shipment had 50 kg cargo damage and thermal excursion above 14°C at destination dock. Discrepancy logged between dispatched Grade A (750kg) and received Grade A (600kg).",
            Json([
                "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500"
            ]),
            "AI EVIDENCE SUMMARY: Telemetry records indicate the reefer compartment temperature rose to 15.8°C at 14:22 UTC during transit along Mumbai-Nashik highway for a duration of 38 minutes with door sensor closed. Thermal excursion matches the localized spoilage pattern reported at destination inspection dock. Discrepancy: Dispatched 1000 kg (Grade A: 750kg, Grade B: 250kg) vs Received 900 kg (Grade A: 600kg, Grade B: 250kg, Damaged: 50kg). Claimed shortage: 100 kg total.",
            85,
            "Admin under investigation. Carrier requested to submit GPS compressor log. Proposed 50% carrier insurance settlement.",
            12500.0,
            "LOGISTICS",
            "usr_admin_01",
            "UNDER_REVIEW"
        )
    ]

    for d in disputes_data:
        cur.execute("""
            INSERT INTO disputes (dispute_id, shipment_id, order_id, raised_by_user_id, raised_by_role, against_role, dispute_category, claim_amount, description, evidence_urls, ai_evidence_summary, ai_risk_score, admin_resolution, settlement_amount, settlement_party, resolved_by_admin_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (dispute_id) DO UPDATE SET
                description = EXCLUDED.description,
                ai_evidence_summary = EXCLUDED.ai_evidence_summary,
                status = EXCLUDED.status,
                admin_resolution = EXCLUDED.admin_resolution;
        """, d)
    conn.commit()
    print("[OK] Seeded dispute and AI evidence analysis.")

    # 11. Seed Audit Logs
    audit_events = [
        ("usr_admin_01", "ADMIN", "SYSTEM_INITIALIZE", "SYSTEM", "AGRITRUST_CORE", Json({"action": "Platform initialized with 5 role subsystems", "version": "2.4.0"})),
        ("usr_farmer_01", "FARMER", "FARM_REGISTERED", "FARM", "FARM-101", Json({"farm_name": "Sahyadri Valley Orchards", "acreage": 15.5})),
        ("usr_farmer_01", "FARMER", "PRODUCE_LISTED", "LISTING", "PROD-101", Json({"crop": "Mango", "quantity_kg": 1000, "price_per_kg": 180})),
        ("usr_logistics_01", "LOGISTICS", "VEHICLE_ASSIGNED", "VEHICLE", "FTL-V001", Json({"driver": "Ramesh Shinde", "shipment_id": "SHP-0001"})),
        ("usr_buyer_01", "BUYER", "PURCHASE_ORDER_PLACED", "ORDER", "ORD-9001", Json({"amount": 180000, "escrow_status": "ESCROW_LOCKED"})),
        ("usr_buyer_01", "BUYER", "DISPUTE_RAISED", "DISPUTE", "DSP-7001", Json({"claim": 25000, "reason": "Temperature excursion damage"}))
    ]

    for a in audit_events:
        cur.execute("""
            INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, details)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, a)
    conn.commit()
    print("[OK] Seeded audit log events.")

    cur.close()
    conn.close()
    print("\n" + "=" * 65)
    print("MIGRATION & SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    migrate_and_seed()
