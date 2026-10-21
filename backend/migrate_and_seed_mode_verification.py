"""
AGRITrust — Mode-Specific Dynamic Verification & Cargo Profiles Migration Script
================================================================================
Migrates the PostgreSQL schema and seeds cargo profiles, dynamic checklists,
and realistic test records for Road, Air, and Marine consignments.
"""

import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from datetime import datetime, date, timedelta
from dynamic_verification_engine import BUILTIN_CARGO_PROFILES

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        database=os.environ.get("DB_NAME", "ftl_cold_chain"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "1234")
    )

def run_migration():
    print("=" * 70)
    print("AGRITRUST: MIGRATING DYNAMIC VERIFICATION & CARGO PROFILES SCHEMA")
    print("=" * 70)

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Execute DDL from SQL file
    sql_path = os.path.join(os.path.dirname(__file__), "agritrust_mode_verification_schema.sql")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_ddl = f.read()

    cur.execute(sql_ddl)
    conn.commit()
    print("[OK] DDL Migration executed successfully.")

    # 2. Seed Cargo Profiles
    print("\nSeeding 6 Standard Cargo Profiles...")
    for profile_id, p in BUILTIN_CARGO_PROFILES.items():
        cur.execute("""
            INSERT INTO cargo_profiles (
                profile_id, profile_code, category_name, display_title, description,
                requires_temperature_control, default_temp_min, default_temp_max,
                critical_temp_breach_min, critical_temp_breach_max, default_humidity_min,
                default_humidity_max, typical_shelf_life_days, max_acceptable_transit_days,
                packaging_specifications, required_documents, allowed_modes,
                mandatory_checklist_keys, risk_indicators, is_active, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP
            )
            ON CONFLICT (profile_id) DO UPDATE SET
                display_title = EXCLUDED.display_title,
                description = EXCLUDED.description,
                requires_temperature_control = EXCLUDED.requires_temperature_control,
                default_temp_min = EXCLUDED.default_temp_min,
                default_temp_max = EXCLUDED.default_temp_max,
                critical_temp_breach_min = EXCLUDED.critical_temp_breach_min,
                critical_temp_breach_max = EXCLUDED.critical_temp_breach_max,
                typical_shelf_life_days = EXCLUDED.typical_shelf_life_days,
                packaging_specifications = EXCLUDED.packaging_specifications,
                required_documents = EXCLUDED.required_documents,
                allowed_modes = EXCLUDED.allowed_modes,
                mandatory_checklist_keys = EXCLUDED.mandatory_checklist_keys,
                risk_indicators = EXCLUDED.risk_indicators,
                updated_at = CURRENT_TIMESTAMP;
        """, (
            profile_id, p["profile_code"], p["category_name"], p["display_title"], p["description"],
            p["requires_temperature_control"], p["default_temp_min"], p["default_temp_max"],
            p["critical_temp_breach_min"], p["critical_temp_breach_max"], p["default_humidity_min"],
            p["default_humidity_max"], p["typical_shelf_life_days"], p["max_acceptable_transit_days"],
            p["packaging_specifications"], Json(p["required_documents"]), Json(p["allowed_modes"]),
            Json(p["mandatory_checklist_keys"]), Json(p["risk_indicators"])
        ))
        print(f"  ✓ Seeded Profile: {p['profile_code']} ({p['display_title']})")

    conn.commit()

    # 3. Update existing consignments with default dimensions & profiles
    print("\nUpdating existing consignments with cargo profile linkage...")
    cur.execute("""
        UPDATE consignment_requests
        SET cargo_profile_id = CASE
            WHEN product_category ILIKE '%Vegetable%' OR product_category ILIKE '%Fruit%' OR product_category ILIKE '%Mango%' THEN 'CP_FRESH_PRODUCE'
            WHEN product_category ILIKE '%Pharma%' OR product_category ILIKE '%Vaccine%' THEN 'CP_PHARMA'
            WHEN product_category ILIKE '%Frozen%' THEN 'CP_FROZEN_FOOD'
            WHEN product_category ILIKE '%Dairy%' OR product_category ILIKE '%Meat%' OR product_category ILIKE '%Fish%' THEN 'CP_CHILLED_FOOD'
            WHEN product_category ILIKE '%Grain%' OR product_category ILIKE '%Rice%' OR product_category ILIKE '%Spice%' THEN 'CP_DRY_GOODS'
            ELSE 'CP_FRESH_PRODUCE'
        END,
        package_dimensions_cm = COALESCE(package_dimensions_cm, '{"length": 60.0, "width": 40.0, "height": 30.0}'::jsonb),
        volumetric_weight_kg = COALESCE(volumetric_weight_kg, (60.0 * 40.0 * 30.0 / 6000.0) * COALESCE(declared_package_count, 100)),
        shelf_life_days = COALESCE(shelf_life_days, 14);
    """)
    conn.commit()
    print("✓ Updated existing consignments with dimensional data.")

    # 4. Seed Dedicated Mode-Specific Consignments (Road, Air, Marine)
    print("\nSeeding Dedicated Mode-Specific Consignments (Road, Air, Marine)...")

    demo_mode_consignments = [
        {
            "consignment_id": "REQ-2026-ROAD-01",
            "consignment_reference": "CR-422-0941-ROAD",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Sahyadri Agro Park, Dindori Road, Nashik",
            "pickup_pincode": "422001",
            "pickup_city": "Nashik",
            "pickup_state": "Maharashtra",
            "destination_location": "Vashi APMC Market, Turbhe, Navi Mumbai",
            "destination_pincode": "400705",
            "destination_city": "Navi Mumbai",
            "destination_state": "Maharashtra",
            "product_category": "Fresh Fruits & Vegetables",
            "product_name": "Alphonso Mangoes (Export Batch)",
            "variety": "Ratnagiri Alphonso GI-Tagged",
            "material_description": "Export grade pre-cooled Alphonso mangoes in 4-kg ventilated cartons.",
            "declared_quantity_kg": 4000.0,
            "declared_package_count": 1000,
            "packaging_type": "Ventilated Corrugated Boxes (CFB)",
            "requires_temperature_control": True,
            "target_temp_min": 10.0,
            "target_temp_max": 13.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": date.today() + timedelta(days=1),
            "declared_cargo_value_inr": 850000.0,
            "verification_status": "APPROVED",
            "cargo_profile_id": "CP_FRESH_PRODUCE",
            "shelf_life_days": 12,
            "package_dimensions_cm": {"length": 40.0, "width": 30.0, "height": 15.0},
            "volumetric_weight_kg": 3000.0,
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde",
            "verification_reference_no": "VRF-202610-RD01",
            "verified_quantity_kg": 3980.0,
            "verified_temperature": 11.2,
            "mode_inspection_data": {
                "vehicle_type": "24ft Reefer Container Truck",
                "vehicle_registration_no": "MH-15-EG-4829",
                "permitted_payload_kg": 8500.0,
                "reefer_unit_make_model": "Thermo King T-1080R",
                "reefer_operating_status": "OPERATIONAL",
                "pre_cooling_duration_mins": 90,
                "pre_cooling_temp_achieved_c": 10.8,
                "air_circulation_clearance_cm": 18.0,
                "bolt_seal_number": "SL-MH-2026-99182",
                "gps_tracker_imei": "865492049102847"
            }
        },
        {
            "consignment_id": "REQ-2026-AIR-02",
            "consignment_reference": "CR-411-0942-AIR",
            "customer_id": "usr_farmer_01",
            "customer_name": "Serum BioLogistics / Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Hinjawadi Biotech Hub, Phase 2, Pune",
            "pickup_pincode": "411057",
            "pickup_city": "Pune",
            "pickup_state": "Maharashtra",
            "destination_location": "Dubai Healthcare City / DXB Cargo Village",
            "destination_pincode": "300001",
            "destination_city": "Dubai (Jebel Ali / DXB)",
            "destination_state": "United Arab Emirates",
            "product_category": "Pharmaceuticals & Biologics",
            "product_name": "Recombinant Human Insulin & Bio-Vaccines",
            "variety": "GDP Certified Cold-Chain Vials",
            "material_description": "Validated passive VIP thermal shippers containing serialized biological insulin.",
            "declared_quantity_kg": 1200.0,
            "declared_package_count": 80,
            "packaging_type": "Vacuum Insulated Panels (VIP Shippers)",
            "requires_temperature_control": True,
            "target_temp_min": 2.0,
            "target_temp_max": 8.0,
            "preferred_transport_mode": "AIR",
            "expected_pickup_date": date.today() + timedelta(days=1),
            "declared_cargo_value_inr": 4800000.0,
            "verification_status": "APPROVED",
            "cargo_profile_id": "CP_PHARMA",
            "shelf_life_days": 90,
            "package_dimensions_cm": {"length": 55.0, "width": 45.0, "height": 40.0},
            "volumetric_weight_kg": 1320.0,
            "assigned_officer_id": "usr_verif_02",
            "assigned_officer_name": "Priya Deshmukh",
            "verification_reference_no": "VRF-202610-AIR02",
            "verified_quantity_kg": 1200.0,
            "verified_temperature": 4.5,
            "mode_inspection_data": {
                "airline_carrier": "Emirates SkyCargo / Air India Cargo",
                "airline_acceptance_status": "ACCEPTED",
                "awb_number": "176-94820194",
                "chargeable_weight_kg": 1320.0,
                "origin_airport_cold_room": "BOM Cargo Terminal 2 Cold Room A",
                "destination_airport_cold_room": "DXB SkyPharma Cold Hub",
                "iata_handling_labels": ["PERISHABLE", "KEEP_COLD_2_TO_8", "THIS_WAY_UP"],
                "gdp_data_logger_verified": True
            }
        },
        {
            "consignment_id": "REQ-2026-MAR-03",
            "consignment_reference": "CR-422-0943-MAR",
            "customer_id": "usr_farmer_01",
            "customer_name": "Sahyadri Grape Exporters",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Pimpalgaon Grape Packhouse, Lasalgaon, Nashik",
            "pickup_pincode": "422209",
            "pickup_city": "Nashik",
            "pickup_state": "Maharashtra",
            "destination_location": "Port of Rotterdam ECT Delta Terminal, Netherlands",
            "destination_pincode": "300002",
            "destination_city": "Rotterdam (Port / Schiphol)",
            "destination_state": "Netherlands",
            "product_category": "Fresh Fruits & Vegetables",
            "product_name": "Thompson Seedless Export Table Grapes",
            "variety": "GlobalG.A.P. Certified Class 1 Grapes",
            "material_description": "40ft High Cube Reefer Container loaded with 5-kg punnets and SO2 grape guard sheets.",
            "declared_quantity_kg": 18500.0,
            "declared_package_count": 3700,
            "packaging_type": "5-kg Punnets with SO2 Generator Sheets in Reefer Crates",
            "requires_temperature_control": True,
            "target_temp_min": 0.0,
            "target_temp_max": 2.0,
            "preferred_transport_mode": "MARINE",
            "expected_pickup_date": date.today() + timedelta(days=2),
            "declared_cargo_value_inr": 3200000.0,
            "verification_status": "APPROVED",
            "cargo_profile_id": "CP_FRESH_PRODUCE",
            "shelf_life_days": 35,
            "package_dimensions_cm": {"length": 50.0, "width": 30.0, "height": 12.0},
            "volumetric_weight_kg": 11100.0,
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde",
            "verification_reference_no": "VRF-202610-MAR03",
            "verified_quantity_kg": 18450.0,
            "verified_temperature": 0.8,
            "mode_inspection_data": {
                "container_number": "MSCU 894102-4",
                "container_type": "40ft High Cube ISO Reefer Container",
                "csc_plate_valid": True,
                "reefer_unit_make_model": "Carrier Transicold PrimeLINE",
                "setpoint_temp_c": 0.5,
                "ventilation_setting_cbm_hr": 15.0,
                "humidity_setpoint_pct": 90.0,
                "iso_bolt_seal_number": "ISO-17712-H-894102",
                "origin_port": "JNPT Nhava Sheva Terminal 4",
                "destination_port": "Port of Rotterdam ECT Delta Terminal",
                "shipping_line_vessel": "MSC OSCAR / Voyage 2610W"
            }
        }
    ]

    for item in demo_mode_consignments:
        cur.execute("""
            INSERT INTO consignment_requests (
                consignment_id, consignment_reference, customer_id, customer_name, customer_phone,
                customer_email, pickup_location, pickup_pincode, pickup_city, pickup_state,
                destination_location, destination_pincode, destination_city, destination_state,
                product_category, product_name, variety, material_description, declared_quantity_kg,
                declared_package_count, packaging_type, requires_temperature_control, target_temp_min,
                target_temp_max, preferred_transport_mode, expected_pickup_date, declared_cargo_value_inr,
                verification_status, cargo_profile_id, shelf_life_days, package_dimensions_cm,
                volumetric_weight_kg, assigned_officer_id, assigned_officer_name,
                verification_reference_no, verified_quantity_kg, verified_temperature,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT (consignment_id) DO UPDATE SET
                preferred_transport_mode = EXCLUDED.preferred_transport_mode,
                cargo_profile_id = EXCLUDED.cargo_profile_id,
                package_dimensions_cm = EXCLUDED.package_dimensions_cm,
                volumetric_weight_kg = EXCLUDED.volumetric_weight_kg,
                shelf_life_days = EXCLUDED.shelf_life_days,
                verification_status = EXCLUDED.verification_status,
                verification_reference_no = EXCLUDED.verification_reference_no,
                verified_quantity_kg = EXCLUDED.verified_quantity_kg,
                verified_temperature = EXCLUDED.verified_temperature;
        """, (
            item["consignment_id"], item["consignment_reference"], item["customer_id"],
            item["customer_name"], item["customer_phone"], item["customer_email"],
            item["pickup_location"], item["pickup_pincode"], item["pickup_city"], item["pickup_state"],
            item["destination_location"], item["destination_pincode"], item["destination_city"], item["destination_state"],
            item["product_category"], item["product_name"], item["variety"], item["material_description"],
            item["declared_quantity_kg"], item["declared_package_count"], item["packaging_type"],
            item["requires_temperature_control"], item["target_temp_min"], item["target_temp_max"],
            item["preferred_transport_mode"], item["expected_pickup_date"], item["declared_cargo_value_inr"],
            item["verification_status"], item["cargo_profile_id"], item["shelf_life_days"],
            Json(item["package_dimensions_cm"]), item["volumetric_weight_kg"],
            item["assigned_officer_id"], item["assigned_officer_name"],
            item["verification_reference_no"], item["verified_quantity_kg"], item["verified_temperature"]
        ))

        # Insert detailed physical inspection record
        cur.execute("""
            INSERT INTO consignment_inspections (
                inspection_id, consignment_id, inspection_number, is_reinspection, officer_id,
                officer_name, officer_badge, inspection_location, inspection_facility_type,
                declared_quantity_kg, verified_quantity_kg, measured_temperature, evaluated_mode,
                mode_suitability_result, mode_suitability_notes, inspection_result, officer_remarks,
                verification_reference_no, mode_inspection_data, decision_score, created_at
            ) VALUES (
                %s, %s, 1, FALSE, %s, %s, 'AGRI-INSP-0441', %s, 'APEDA Approved Cold Chain Hub',
                %s, %s, %s, %s, 'SUITABLE_AS_REQUESTED', 'Full mode equipment and cargo parameters verified.',
                'APPROVED', 'Passed all physical checklist parameters and mode safety checks.',
                %s, %s, 98.5, CURRENT_TIMESTAMP
            )
            ON CONFLICT (inspection_id) DO UPDATE SET
                mode_inspection_data = EXCLUDED.mode_inspection_data,
                decision_score = EXCLUDED.decision_score;
        """, (
            f"INSP-{item['consignment_id']}-1", item["consignment_id"], item["assigned_officer_id"],
            item["assigned_officer_name"], item["pickup_location"], item["declared_quantity_kg"],
            item["verified_quantity_kg"], item["verified_temperature"], item["preferred_transport_mode"],
            item["verification_reference_no"], Json(item["mode_inspection_data"])
        ))
        print(f"  ✓ Seeded Mode Consignment: {item['consignment_id']} ({item['preferred_transport_mode']}) - {item['product_name']}")

    conn.commit()
    conn.close()
    print("\n" + "=" * 70)
    print("MIGRATION & SEEDING COMPLETED SUCCESSFULLY (100%)")
    print("=" * 70)

if __name__ == "__main__":
    run_migration()
