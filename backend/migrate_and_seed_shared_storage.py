"""
AGRITrust: Migration and Seed Script for Shared Cold Storage & Micro-Cold-Chain
Applies DDL schema and provisions demo scenario data (Section 18).
All demo records are clearly labelled as 'DEMO DATA'.
"""

import os
import json
import psycopg2
from psycopg2.extras import Json
from datetime import datetime, date, timedelta

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", 5432)),
    "database": os.environ.get("DB_NAME", "ftl_cold_chain"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", "1234")
}

def run_migration():
    print("[MIGRATION] Applying agritrust_shared_storage_schema.sql...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    with open(os.path.join(os.path.dirname(__file__), "agritrust_shared_storage_schema.sql"), "r", encoding="utf-8") as f:
        sql = f.read()

    cur.execute(sql)
    conn.commit()
    print("[MIGRATION] Schema applied successfully.")
    cur.close()
    conn.close()

def seed_demo_scenario():
    print("[SEED] Seeding Section 18 Shared Cold Storage Demo Scenario...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 1. Ensure Demo Users exist
    demo_users = [
        ("usr_farmer_01", "farmer@agritrust.io", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.d/3Bw7U0fF9m.", "Ramesh Patil (Farmer 1)", "FARMER", "+91 98220 54321", "Patil Agro Farms (DEMO DATA)"),
        ("usr_farmer_02", "farmer2@agritrust.io", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.d/3Bw7U0fF9m.", "Suresh Shinde (Farmer 2)", "FARMER", "+91 98220 54322", "Shinde Horticulture (DEMO DATA)"),
        ("usr_farmer_03", "farmer3@agritrust.io", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.d/3Bw7U0fF9m.", "Ganesh Jadhav (Farmer 3)", "FARMER", "+91 98220 54323", "Jadhav Orchards (DEMO DATA)"),
        ("usr_coldstorage_01", "coldstorage@agritrust.io", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.d/3Bw7U0fF9m.", "Sanjay Kadam (Facility Owner)", "COLD_STORAGE", "+91 98220 99881", "Sahyadri Cold Chain Logistics (DEMO DATA)"),
        ("usr_logistics_01", "logistics@agritrust.io", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.d/3Bw7U0fF9m.", "Rajesh Gaikwad (Logistics Ops)", "LOGISTICS", "+91 98220 77665", "MahaReefer Express (DEMO DATA)")
    ]

    for u in demo_users:
        cur.execute("""
            INSERT INTO users (user_id, email, password_hash, full_name, role, phone, company_name, is_verified, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, TRUE)
            ON CONFLICT (user_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone,
                company_name = EXCLUDED.company_name;
        """, u)

    # 2. Seed Cold Storage A (Sahyadri Cold Hub A)
    cur.execute("""
        INSERT INTO cold_storage_facilities (
            facility_id, user_id, facility_name, location, district, state,
            contact_phone, contact_email, storage_types, total_capacity_mt,
            available_capacity_mt, rate_per_mt_day, is_verified, operating_status, is_demo
        ) VALUES (
            'CSF-DEMO-A', 'usr_coldstorage_01', 'Sahyadri Cold Hub A (DEMO DATA)',
            'Plot 42, MIDC Agro Zone, Dindori Road, Nashik', 'Nashik', 'Maharashtra',
            '+91 98220 99881', 'facility.sahyadri@agritrust.io',
            '["Shared Micro-Chamber", "Reefer CA", "Pre-cooling Dock"]'::jsonb,
            20.0, 10.0, 180.0, TRUE, 'OPERATIONAL', TRUE
        ) ON CONFLICT (facility_id) DO UPDATE SET
            facility_name = EXCLUDED.facility_name,
            total_capacity_mt = EXCLUDED.total_capacity_mt,
            available_capacity_mt = EXCLUDED.available_capacity_mt,
            rate_per_mt_day = EXCLUDED.rate_per_mt_day,
            operating_status = EXCLUDED.operating_status,
            is_demo = TRUE;
    """)

    # Seed Cold Storage B (Incompatible Demo Facility for Testing)
    cur.execute("""
        INSERT INTO cold_storage_facilities (
            facility_id, user_id, facility_name, location, district, state,
            contact_phone, contact_email, storage_types, total_capacity_mt,
            available_capacity_mt, rate_per_mt_day, is_verified, operating_status, is_demo
        ) VALUES (
            'CSF-DEMO-B', 'usr_coldstorage_01', 'Godavari Deep Freeze Hub (DEMO DATA)',
            'Agro Tech Park, Ozar, Nashik', 'Nashik', 'Maharashtra',
            '+91 98220 99882', 'godavari.freeze@agritrust.io',
            '["Deep Freeze", "Frozen Meat & Ice Cream"]'::jsonb,
            15.0, 1.0, 240.0, TRUE, 'OPERATIONAL', TRUE
        ) ON CONFLICT (facility_id) DO UPDATE SET
            facility_name = EXCLUDED.facility_name,
            total_capacity_mt = EXCLUDED.total_capacity_mt,
            available_capacity_mt = EXCLUDED.available_capacity_mt,
            rate_per_mt_day = EXCLUDED.rate_per_mt_day,
            operating_status = EXCLUDED.operating_status,
            is_demo = TRUE;
    """)

    # 3. Seed Chambers for Facility A
    # Chamber 1: 10 MT Capacity, 10-13°C, Tomatoes compatible
    cur.execute("""
        INSERT INTO cold_storage_chambers (
            chamber_id, facility_id, chamber_name, capacity_mt, occupied_mt,
            current_temperature, target_temp_min, target_temp_max,
            current_humidity, humidity_min, humidity_max, rate_per_mt_day,
            compatible_produce, status, is_demo
        ) VALUES (
            'CHM-DEMO-A1', 'CSF-DEMO-A', 'Chamber 1 — Solanaceous & Tropical (DEMO DATA)',
            10.0, 10.0, 11.4, 10.0, 13.0,
            88.0, 80.0, 95.0, 180.0,
            ARRAY['Tomatoes', 'Mango', 'Papaya', 'Capsicum', 'Brinjal'],
            'ACTIVE', TRUE
        ) ON CONFLICT (chamber_id) DO UPDATE SET
            chamber_name = EXCLUDED.chamber_name,
            capacity_mt = EXCLUDED.capacity_mt,
            occupied_mt = EXCLUDED.occupied_mt,
            current_temperature = EXCLUDED.current_temperature,
            target_temp_min = EXCLUDED.target_temp_min,
            target_temp_max = EXCLUDED.target_temp_max,
            current_humidity = EXCLUDED.current_humidity,
            compatible_produce = EXCLUDED.compatible_produce,
            status = EXCLUDED.status,
            is_demo = TRUE;
    """)

    # Chamber 2: 10 MT Capacity, 2-5°C (Grapes / Berries)
    cur.execute("""
        INSERT INTO cold_storage_chambers (
            chamber_id, facility_id, chamber_name, capacity_mt, occupied_mt,
            current_temperature, target_temp_min, target_temp_max,
            current_humidity, humidity_min, humidity_max, rate_per_mt_day,
            compatible_produce, status, is_demo
        ) VALUES (
            'CHM-DEMO-A2', 'CSF-DEMO-A', 'Chamber 2 — Deep Chill Viticulture (DEMO DATA)',
            10.0, 5.0, 3.2, 2.0, 5.0,
            92.0, 85.0, 95.0, 220.0,
            ARRAY['Grapes', 'Pomegranate', 'Strawberries', 'Apples'],
            'ACTIVE', TRUE
        ) ON CONFLICT (chamber_id) DO UPDATE SET
            chamber_name = EXCLUDED.chamber_name,
            capacity_mt = EXCLUDED.capacity_mt,
            occupied_mt = EXCLUDED.occupied_mt,
            current_temperature = EXCLUDED.current_temperature,
            target_temp_min = EXCLUDED.target_temp_min,
            target_temp_max = EXCLUDED.target_temp_max,
            compatible_produce = EXCLUDED.compatible_produce,
            status = EXCLUDED.status,
            is_demo = TRUE;
    """)

    # Incompatible Chamber for Facility B: 4-8°C
    cur.execute("""
        INSERT INTO cold_storage_chambers (
            chamber_id, facility_id, chamber_name, capacity_mt, occupied_mt,
            current_temperature, target_temp_min, target_temp_max,
            current_humidity, humidity_min, humidity_max, rate_per_mt_day,
            compatible_produce, status, is_demo
        ) VALUES (
            'CHM-DEMO-B1', 'CSF-DEMO-B', 'Chamber B1 — Low Temp Dairy & Root (DEMO DATA)',
            15.0, 14.0, 5.5, 4.0, 8.0,
            75.0, 70.0, 85.0, 240.0,
            ARRAY['Potatoes', 'Carrots', 'Dairy', 'Processed Cheese'],
            'ACTIVE', TRUE
        ) ON CONFLICT (chamber_id) DO UPDATE SET
            capacity_mt = EXCLUDED.capacity_mt,
            occupied_mt = EXCLUDED.occupied_mt,
            target_temp_min = EXCLUDED.target_temp_min,
            target_temp_max = EXCLUDED.target_temp_max,
            compatible_produce = EXCLUDED.compatible_produce,
            is_demo = TRUE;
    """)

    # 4. Clean previous demo shared storage bookings & inventory for idempotency
    cur.execute("""
        DELETE FROM transport_cost_allocations WHERE plan_id LIKE 'PLAN-DEMO-%';
        DELETE FROM consolidated_transport_items WHERE plan_id LIKE 'PLAN-DEMO-%';
        DELETE FROM consolidated_transport_plans WHERE plan_id LIKE 'PLAN-DEMO-%';
        DELETE FROM storage_checkout_records WHERE inventory_id LIKE 'INV-DEMO-%';
        DELETE FROM storage_intake_records WHERE inventory_id LIKE 'INV-DEMO-%';
        DELETE FROM storage_inventory WHERE inventory_id LIKE 'INV-DEMO-%';
        DELETE FROM storage_bookings WHERE booking_id LIKE 'BK-DEMO-%';
    """)

    # 5. Create the 3 Demo Bookings (Section 18: 2 MT, 3 MT, 5 MT = 10 MT total in Chamber 1)
    bookings_data = [
        ('BK-DEMO-101', 'CSF-DEMO-A', 'CHM-DEMO-A1', 'usr_farmer_01', 'Tomatoes', 'Hybrid Table Red', 2.0, 10.0, 13.0, date.today(), 3, 1080.0, 'Pre-condition at 12°C. Stack on breathable plastic pallets.', 'INTAKE_COMPLETED', 11.2, 'Grade A (Intact)'),
        ('BK-DEMO-102', 'CSF-DEMO-A', 'CHM-DEMO-A1', 'usr_farmer_02', 'Tomatoes', 'Roma Processing', 3.0, 10.0, 13.0, date.today(), 3, 1620.0, 'Standard crates. Maintain 85% humidity.', 'INTAKE_COMPLETED', 11.5, 'Grade A (Intact)'),
        ('BK-DEMO-103', 'CSF-DEMO-A', 'CHM-DEMO-A1', 'usr_farmer_03', 'Tomatoes', 'Beefsteak Premium', 5.0, 10.0, 13.0, date.today(), 3, 2700.0, 'Export quality packing. Fragile skin handling.', 'INTAKE_COMPLETED', 11.1, 'Grade A (Export Ready)')
    ]

    for b in bookings_data:
        cur.execute("""
            INSERT INTO storage_bookings (
                booking_id, facility_id, chamber_id, farmer_id, produce_name, variety,
                quantity_mt, target_temp_min, target_temp_max, requested_intake_date,
                duration_days, estimated_cost, handling_requirements, status,
                intake_temperature, intake_quality_grade, is_demo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE);
        """, b)

    # 6. Create Separate Farmer Inventory Ownership Records (Section 6 & 18)
    inventory_data = [
        ('INV-DEMO-001', 'BK-DEMO-101', 'usr_farmer_01', 'CSF-DEMO-A', 'CHM-DEMO-A1', 'Tomatoes', 'Hybrid Table Red', 2.0, 2.0, 'Grade A (Intact)', 11.2, json.dumps(["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500"]), 'Farmer 1 - 2.0 MT separate custody tag #AGRI-OWN-F1-001. Pallet rows A1-A2.'),
        ('INV-DEMO-002', 'BK-DEMO-102', 'usr_farmer_02', 'CSF-DEMO-A', 'CHM-DEMO-A1', 'Tomatoes', 'Roma Processing', 3.0, 3.0, 'Grade A (Intact)', 11.5, json.dumps(["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500"]), 'Farmer 2 - 3.0 MT separate custody tag #AGRI-OWN-F2-002. Pallet rows A3-A5.'),
        ('INV-DEMO-003', 'BK-DEMO-103', 'usr_farmer_03', 'CSF-DEMO-A', 'CHM-DEMO-A1', 'Tomatoes', 'Beefsteak Premium', 5.0, 5.0, 'Grade A (Export Ready)', 11.1, json.dumps(["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500"]), 'Farmer 3 - 5.0 MT separate custody tag #AGRI-OWN-F3-003. Pallet rows A6-A10.')
    ]

    for inv in inventory_data:
        cur.execute("""
            INSERT INTO storage_inventory (
                inventory_id, booking_id, farmer_id, facility_id, chamber_id,
                produce_name, variety, allocated_quantity_mt, current_quantity_mt,
                initial_quality_grade, current_quality_grade, intake_temperature,
                photo_urls, handling_notes, status, is_demo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE', TRUE);
        """, (inv[0], inv[1], inv[2], inv[3], inv[4], inv[5], inv[6], inv[7], inv[8], inv[9], inv[9], inv[10], inv[11], inv[12]))

        # Create corresponding immutable intake records
        cur.execute("""
            INSERT INTO storage_intake_records (
                intake_id, inventory_id, booking_id, farmer_id, facility_id, chamber_id,
                received_quantity_mt, intake_temperature, quality_grade, inspector_name,
                photo_urls, notes, intake_time
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, 'K. S. Patil (Certified Inspector)',
                '["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500"]'::jsonb,
                %s, CURRENT_TIMESTAMP - INTERVAL '2 hours'
            );
        """, (f"INT-{inv[0]}", inv[0], inv[1], inv[2], inv[3], inv[4], inv[7], inv[10], inv[9], f"Intake verified. Produce pre-cooled and tagged for {inv[2]}."))

    # 7. Create Demo Consolidated Transport Plan (Section 7, 8, 9 & 18)
    cur.execute("""
        INSERT INTO consolidated_transport_plans (
            plan_id, logistics_user_id, vehicle_id, driver_id, origin_hub,
            destination_hub, target_temp_min, target_temp_max,
            total_vehicle_capacity_mt, total_consolidated_mt, route_summary,
            estimated_total_cost, pickup_window_start, pickup_window_end,
            delivery_deadline, status, approval_notes, is_demo
        ) VALUES (
            'PLAN-DEMO-1001', 'usr_logistics_01', 'FTL-V001', 'DRV-01',
            'Sahyadri Cold Hub A (MIDC Nashik)',
            'APMC Terminal & FreshMart Vashi Hub, Navi Mumbai',
            10.0, 13.0, 12.0, 10.0,
            'Nashik Hub Consolidation Dock -> Kasara Bypass -> Thane Ring Road -> Vashi APMC Terminal (Total: 165 km)',
            14500.0, CURRENT_TIMESTAMP + INTERVAL '12 hours', CURRENT_TIMESTAMP + INTERVAL '14 hours',
            CURRENT_TIMESTAMP + INTERVAL '20 hours', 'AWAITING_APPROVAL',
            'Compatible thermal requirements (10-13°C). 10 MT consolidated load fits 12 MT Reefer vehicle FTL-V001.',
            TRUE
        );
    """)

    # 8. Create Consolidated Transport Items (Individual farmer parcels)
    items_data = [
        ('ITEM-DEMO-001', 'PLAN-DEMO-1001', 'usr_farmer_01', 'BK-DEMO-101', 'INV-DEMO-001', 'Tomatoes', 'Hybrid Table Red', 2.0, 'Sahyadri Cold Hub A (Chamber 1)', 'Vashi APMC Bay 4', 2900.0),
        ('ITEM-DEMO-002', 'PLAN-DEMO-1001', 'usr_farmer_02', 'BK-DEMO-102', 'INV-DEMO-002', 'Tomatoes', 'Roma Processing', 3.0, 'Sahyadri Cold Hub A (Chamber 1)', 'Vashi APMC Bay 5', 4350.0),
        ('ITEM-DEMO-003', 'PLAN-DEMO-1001', 'usr_farmer_03', 'BK-DEMO-103', 'INV-DEMO-003', 'Tomatoes', 'Beefsteak Premium', 5.0, 'Sahyadri Cold Hub A (Chamber 1)', 'FreshMart Central Dock Vashi', 7250.0)
    ]

    for item in items_data:
        cur.execute("""
            INSERT INTO consolidated_transport_items (
                item_id, plan_id, farmer_id, booking_id, inventory_id,
                produce_name, variety, quantity_mt, pickup_location,
                destination_location, estimated_cost_share, item_status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PLANNED');
        """, item)

        # Create corresponding cost share allocation
        cur.execute("""
            INSERT INTO transport_cost_allocations (
                allocation_id, plan_id, farmer_id, quantity_mt, distance_km,
                handling_factor, base_share_amount, final_share_amount, status
            ) VALUES (
                %s, %s, %s, %s, 165.0, 1.0, %s, %s, 'ESTIMATED'
            );
        """, (f"COST-{item[0]}", item[1], item[2], item[7], item[10], item[10]))

    conn.commit()
    print("[SEED] Demo scenario seeded successfully.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    run_migration()
    seed_demo_scenario()
