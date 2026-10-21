"""
AGRITrust — Mandatory Physical Consignment Verification Migration & Seeder
Database: ftl_cold_chain
Seeds:
- Verification Officers (Sunil Shinde, Priya Sharma)
- Standard Accounts (Admin, Farmer, Logistics, Cold Storage, Buyer, Verification Team)
- Consignment Requests across all lifecycle stages:
  PENDING_VERIFICATION, INSPECTION_SCHEDULED, UNDER_INSPECTION, APPROVED,
  REQUIRES_CORRECTION, REJECTED, BOOKING_CONFIRMED, READY_FOR_DISPATCH, IN_TRANSIT, DELIVERED
- Detailed Physical Inspection Reports with 8-Point Checklists, Discrepancies, and Sign-offs
- Full Tamper-Evident Status History Audit Trails
- Dispatch-Readiness Check Records
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from datetime import datetime, date, timedelta
import uuid

# Import password hasher from auth module
from auth import hash_password

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        database=os.environ.get("DB_NAME", "ftl_cold_chain"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "1234")
    )

def run_migration_and_seed():
    print("=" * 80)
    print(" AGRITRUST — MANDATORY PHYSICAL VERIFICATION WORKFLOW MIGRATION & SEED")
    print("=" * 80)

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Run DDL Schema
    print("\n[STEP 1] Applying Physical Verification Schema DDL...")
    with open("agritrust_verification_schema.sql", "r", encoding="utf-8") as f:
        schema_sql = f.read()
    cur.execute(schema_sql)
    conn.commit()
    print("  [SUCCESS] Tables verification_officers, consignment_requests, consignment_inspections,")
    print("            consignment_status_history, dispatch_readiness_checks created/verified.")

    # 2. Seed Users for All 6 Roles (Preserving Existing & Adding Verification Officers)
    print("\n[STEP 2] Seeding Standard Role Accounts & Verification Officers...")
    
    users_data = [
        {
            "user_id": "usr_admin_01",
            "email": "admin@agritrust.io",
            "password": "AdminSecret2026!",
            "full_name": "Vikram Malhotra",
            "role": "ADMIN",
            "phone": "+91 98200 11223",
            "company_name": "AGRITrust Platform Governance"
        },
        {
            "user_id": "usr_farmer_01",
            "email": "farmer@agritrust.io",
            "password": "Password123!",
            "full_name": "Ramesh Patil",
            "role": "FARMER",
            "phone": "+91 98220 54321",
            "company_name": "Sahyadri Agro Orchards & Producer Co."
        },
        {
            "user_id": "usr_logistics_01",
            "email": "logistics@agritrust.io",
            "password": "Password123!",
            "full_name": "Rajesh Gaikwad",
            "role": "LOGISTICS",
            "phone": "+91 98221 99887",
            "company_name": "Cold Chain Express & Multi-Modal Fleet"
        },
        {
            "user_id": "usr_cold_01",
            "email": "coldstorage@agritrust.io",
            "password": "Password123!",
            "full_name": "Sanjay Kadam",
            "role": "COLD_STORAGE",
            "phone": "+91 98222 44556",
            "company_name": "MahaCold Agro Infrastructure"
        },
        {
            "user_id": "usr_buyer_01",
            "email": "buyer@agritrust.io",
            "password": "Password123!",
            "full_name": "Ananya Deshmukh",
            "role": "BUYER",
            "phone": "+91 98223 77889",
            "company_name": "FreshMart Agro Retailers"
        },
        {
            "user_id": "usr_verif_01",
            "email": "verification@agritrust.io",
            "password": "VerificationOfficer2026!",
            "full_name": "Sunil Shinde",
            "role": "VERIFICATION_TEAM",
            "phone": "+91 98230 11990",
            "company_name": "AGRITrust Physical Inspection Unit"
        },
        {
            "user_id": "usr_verif_02",
            "email": "verification2@agritrust.io",
            "password": "VerificationOfficer2026!",
            "full_name": "Priya Sharma",
            "role": "VERIFICATION_TEAM",
            "phone": "+91 98230 22881",
            "company_name": "AGRITrust Physical Inspection Unit"
        }
    ]

    for u in users_data:
        pwd_hash = hash_password(u["password"])
        cur.execute("""
            INSERT INTO users (user_id, email, password_hash, full_name, role, phone, company_name, is_verified, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, TRUE)
            ON CONFLICT (email) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                phone = EXCLUDED.phone,
                company_name = EXCLUDED.company_name;
        """, (u["user_id"], u["email"], pwd_hash, u["full_name"], u["role"], u["phone"], u["company_name"]))

    # 3. Seed Verification Officers in verification_officers table
    print("\n[STEP 3] Seeding Verification Officers Registry...")
    officers_data = [
        {
            "officer_id": "OFF-101",
            "user_id": "usr_verif_01",
            "badge_number": "AGRI-INSP-0441",
            "full_name": "Sunil Shinde",
            "phone": "+91 98230 11990",
            "email": "verification@agritrust.io",
            "assigned_region": "Western Agro Corridor (Nashik / Ahmednagar)",
            "station_location": "Nashik Sahyadri Hub Quality Dock",
            "specialization": "Perishables, Cold-Chain & Export Grade Certification",
            "availability_status": "AVAILABLE",
            "active_assignments_count": 2,
            "total_inspections_completed": 148,
            "approval_rate_pct": 91.80,
            "avg_turnaround_hours": 2.20
        },
        {
            "officer_id": "OFF-102",
            "user_id": "usr_verif_02",
            "badge_number": "AGRI-INSP-0782",
            "full_name": "Priya Sharma",
            "phone": "+91 98230 22881",
            "email": "verification2@agritrust.io",
            "assigned_region": "Mumbai Port & Coastal Agri Belt",
            "station_location": "JNPT Port Terminal Inspection Center",
            "specialization": "Marine Reefer Containers & International Phytosanitary",
            "availability_status": "ON_INSPECTION",
            "active_assignments_count": 1,
            "total_inspections_completed": 112,
            "approval_rate_pct": 88.50,
            "avg_turnaround_hours": 2.60
        }
    ]

    for off in officers_data:
        cur.execute("""
            INSERT INTO verification_officers (
                officer_id, user_id, badge_number, full_name, phone, email,
                assigned_region, station_location, specialization, availability_status,
                active_assignments_count, total_inspections_completed, approval_rate_pct,
                avg_turnaround_hours, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            ON CONFLICT (officer_id) DO UPDATE SET
                badge_number = EXCLUDED.badge_number,
                full_name = EXCLUDED.full_name,
                assigned_region = EXCLUDED.assigned_region,
                availability_status = EXCLUDED.availability_status;
        """, (
            off["officer_id"], off["user_id"], off["badge_number"], off["full_name"],
            off["phone"], off["email"], off["assigned_region"], off["station_location"],
            off["specialization"], off["availability_status"], off["active_assignments_count"],
            off["total_inspections_completed"], off["approval_rate_pct"], off["avg_turnaround_hours"]
        ))
    conn.commit()

    # 4. Seed Consignment Requests Across All Lifecycle States
    print("\n[STEP 4] Seeding Consignment Requests & Physical Inspections...")
    
    now = datetime.now()

    consignments_data = [
        # 1. PENDING_VERIFICATION (Fresh request from Farmer)
        {
            "consignment_id": "REQ-2026-001",
            "consignment_reference": "CR-NSK-2026-001",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Patil Farm Gate #3, Dindori Road, Nashik",
            "pickup_pincode": "422001",
            "pickup_city": "Nashik",
            "destination_location": "FreshMart Central Distribution Hub, Vashi APMC, Navi Mumbai",
            "destination_pincode": "400707",
            "destination_city": "Navi Mumbai",
            "product_category": "Fresh Fruits",
            "product_name": "Alphonso Mango",
            "variety": "Ratnagiri/Devgad Graft",
            "material_description": "Export-grade mature Alphonso mangoes, freshly harvested, packed in 5-ply CFB cartons with foam liners.",
            "declared_quantity_kg": 2500.0,
            "declared_package_count": 250,
            "packaging_type": "5-Ply Ventilated Corrugated Cartons",
            "packaging_requirements": "10 kg per carton with ethylene scavenging sachets",
            "storage_requirements": "Maintain pre-cooled temperature between 10°C and 13°C",
            "requires_temperature_control": True,
            "target_temp_min": 10.0,
            "target_temp_max": 13.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": (now + timedelta(days=2)).date(),
            "urgency_level": "STANDARD",
            "declared_cargo_value_inr": 450000.0,
            "customer_photos": [
                "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600",
                "https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=600"
            ],
            "supporting_documents": [
                {"name": "APMC_Harvest_Declaration_001.pdf", "type": "HARVEST_CERTIFICATE", "url": "/docs/apmc_001.pdf"},
                {"name": "Pesticide_Residue_Lab_Report.pdf", "type": "LAB_TEST", "url": "/docs/lab_001.pdf"}
            ],
            "customer_notes": "Harvested early morning at 85% maturity index. Requesting prompt physical inspection.",
            "verification_status": "PENDING_VERIFICATION",
            "assigned_officer_id": None,
            "assigned_officer_name": None,
            "scheduled_inspection_time": None,
            "verification_reference_no": None,
            "verified_at": None,
            "verified_quantity_kg": None,
            "verified_quality_grade": None,
            "verified_temperature": None
        },

        # 2. INSPECTION_SCHEDULED (Assigned to Sunil Shinde)
        {
            "consignment_id": "REQ-2026-002",
            "consignment_reference": "CR-NSK-2026-002",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Sahyadri Packhouse Dock 2, Nashik Agro SEZ",
            "pickup_pincode": "422001",
            "pickup_city": "Nashik",
            "destination_location": "Indira Gandhi International Cargo Terminal (CELEBI), New Delhi",
            "destination_pincode": "110037",
            "destination_city": "Delhi",
            "product_category": "Fresh Fruits",
            "product_name": "Thompson Seedless Export Grapes",
            "variety": "Thompson Seedless (GlobalGAP Certified)",
            "material_description": "Cold-stored pre-cooled export grapes in 500g punnets, pre-conditioned at 1.5°C.",
            "declared_quantity_kg": 4500.0,
            "declared_package_count": 900,
            "packaging_type": "500g Plastic Punnets in 5kg Master Cartons with SO2 Pads",
            "packaging_requirements": "Pre-cooled master cartons with dual SO2 generator sheets",
            "storage_requirements": "Deep chill storage at 0.5°C to 2.0°C, 90% RH",
            "requires_temperature_control": True,
            "target_temp_min": 0.5,
            "target_temp_max": 2.5,
            "preferred_transport_mode": "AIR",
            "expected_pickup_date": (now + timedelta(days=1)).date(),
            "urgency_level": "EXPRESS",
            "declared_cargo_value_inr": 850000.0,
            "customer_photos": [
                "https://images.unsplash.com/photo-1596363505729-4190a9506133?w=600"
            ],
            "supporting_documents": [
                {"name": "GlobalGAP_Certificate_2026.pdf", "type": "GLOBAL_GAP", "url": "/docs/ggap_002.pdf"},
                {"name": "Phytosanitary_Pre_Inspection.pdf", "type": "PHYTOSANITARY", "url": "/docs/phyto_002.pdf"}
            ],
            "customer_notes": "Urgent air-cargo dispatch intended for Middle East export. Scheduled inspection today 14:00.",
            "verification_status": "INSPECTION_SCHEDULED",
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde (AGRI-INSP-0441)",
            "scheduled_inspection_time": now + timedelta(hours=3),
            "verification_reference_no": None,
            "verified_at": None,
            "verified_quantity_kg": None,
            "verified_quality_grade": None,
            "verified_temperature": None
        },

        # 3. UNDER_INSPECTION (Officer Priya actively on site)
        {
            "consignment_id": "REQ-2026-003",
            "consignment_reference": "CR-SLP-2026-003",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Solapur Agro Collection Center #1, Pandharpur Road",
            "pickup_pincode": "411001",
            "pickup_city": "Solapur / Pune",
            "destination_location": "DP World London Gateway Seaport Dock, United Kingdom",
            "destination_pincode": "300004",
            "destination_city": "London",
            "product_category": "Fresh Fruits",
            "product_name": "Bhagwa Pomegranate",
            "variety": "Bhagwa Export Arils",
            "material_description": "Deep red Bhagwa pomegranates, individual foam-net wrapped, size 250g-300g per fruit.",
            "declared_quantity_kg": 18000.0,
            "declared_package_count": 3600,
            "packaging_type": "40ft Reefer Container Palletized Master Cartons",
            "packaging_requirements": "Fumigated wooden Euro-pallets with corner board protection and strapping",
            "storage_requirements": "Controlled atmosphere reefer at 6.0°C, 90% RH",
            "requires_temperature_control": True,
            "target_temp_min": 5.0,
            "target_temp_max": 7.0,
            "preferred_transport_mode": "MARINE",
            "expected_pickup_date": (now + timedelta(days=3)).date(),
            "urgency_level": "STANDARD",
            "declared_cargo_value_inr": 2800000.0,
            "customer_photos": [
                "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600"
            ],
            "supporting_documents": [
                {"name": "APEDA_Export_Registration.pdf", "type": "APEDA_EXPORT", "url": "/docs/apeda_003.pdf"}
            ],
            "customer_notes": "Officer Priya Sharma currently on dock verifying pallet weights and pulp temperatures.",
            "verification_status": "UNDER_INSPECTION",
            "assigned_officer_id": "usr_verif_02",
            "assigned_officer_name": "Priya Sharma (AGRI-INSP-0782)",
            "scheduled_inspection_time": now - timedelta(hours=1),
            "verification_reference_no": None,
            "verified_at": None,
            "verified_quantity_kg": None,
            "verified_quality_grade": None,
            "verified_temperature": None
        },

        # 4. APPROVED (VRF-2026-8839 - Fully inspected & verified, ready for 3-Mode Booking)
        {
            "consignment_id": "REQ-2026-004",
            "consignment_reference": "CR-NSK-2026-004",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Sahyadri Farmer Producer Co., Dindori Gate 1, Nashik",
            "pickup_pincode": "422001",
            "pickup_city": "Nashik",
            "destination_location": "Delhi Central Cold Distribution Hub, Azadpur, New Delhi",
            "destination_pincode": "110037",
            "destination_city": "Delhi",
            "product_category": "Fresh Fruits",
            "product_name": "Alphonso Mango (Export Grade A)",
            "variety": "Devgad Geographical Indication (GI)",
            "material_description": "Premium GI-tagged Alphonso Mangoes, verified harvest maturity index 88%, uniform sizing.",
            "declared_quantity_kg": 3500.0,
            "declared_package_count": 350,
            "packaging_type": "Export CFB Cartons (10kg net)",
            "packaging_requirements": "Ventilated cartons with tamper-evident security labels",
            "storage_requirements": "Pre-cooled at 11.5°C before truck loading",
            "requires_temperature_control": True,
            "target_temp_min": 10.0,
            "target_temp_max": 13.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": (now + timedelta(days=1)).date(),
            "urgency_level": "STANDARD",
            "declared_cargo_value_inr": 630000.0,
            "customer_photos": [
                "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600"
            ],
            "supporting_documents": [
                {"name": "GI_Certification_Devgad_004.pdf", "type": "GI_TAG", "url": "/docs/gi_004.pdf"}
            ],
            "customer_notes": "Physical verification approved by Officer Sunil Shinde. Unlocked for carrier selection.",
            "verification_status": "APPROVED",
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde (AGRI-INSP-0441)",
            "scheduled_inspection_time": now - timedelta(hours=4),
            "verification_reference_no": "VRF-2026-8839",
            "verified_at": now - timedelta(hours=2),
            "verified_quantity_kg": 3480.0,
            "verified_quality_grade": "Grade A (Export Certified GI)",
            "verified_temperature": 11.2,
            "inspection_decision_notes": "All 8 physical checkpoints verified. Actual net weight 3,480 kg (calibrated digital scale #3). Pulp temp 11.2°C. Zero fungal blemish. Suitable for Road, Air or Marine transport."
        },

        # 5. REQUIRES_CORRECTION (Discrepancy found, requires action before re-approval)
        {
            "consignment_id": "REQ-2026-005",
            "consignment_reference": "CR-MHB-2026-005",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Mahabaleshwar Berry Co-op Dock, Satara Road",
            "pickup_pincode": "411001",
            "pickup_city": "Mahabaleshwar / Pune",
            "destination_location": "BOM Air Cargo Terminal, Mumbai",
            "destination_pincode": "400001",
            "destination_city": "Mumbai",
            "product_category": "Berries",
            "product_name": "Fresh Sweet Strawberries",
            "variety": "Winter Dawn Export Grade",
            "material_description": "Delicate fresh strawberries in 250g clear clamshells.",
            "declared_quantity_kg": 1200.0,
            "declared_package_count": 4800,
            "packaging_type": "250g Clamshells in Corrugated Trays",
            "packaging_requirements": "Requires bubble-wrap top padding and tamper-evident band",
            "storage_requirements": "Continuous cold chain at 1.0°C to 3.0°C",
            "requires_temperature_control": True,
            "target_temp_min": 1.0,
            "target_temp_max": 3.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": (now + timedelta(days=1)).date(),
            "urgency_level": "EXPRESS",
            "declared_cargo_value_inr": 360000.0,
            "customer_photos": [
                "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600"
            ],
            "supporting_documents": [],
            "customer_notes": "Discrepancy reported by inspector: outer carton tamper-evident bands missing on 120 cartons.",
            "verification_status": "REQUIRES_CORRECTION",
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde (AGRI-INSP-0441)",
            "scheduled_inspection_time": now - timedelta(hours=6),
            "verification_reference_no": None,
            "verified_at": now - timedelta(hours=4),
            "verified_quantity_kg": 1140.0,
            "verified_quality_grade": "Grade B (Tamper Seal Deficiency)",
            "verified_temperature": 4.8,
            "required_corrections": "1. Re-apply mandatory tamper-evident security holographic seals on 120 master cartons.\n2. Re-condition batch in pre-cooling chamber to reduce pulp temp from 4.8°C down to <= 3.0°C before reinspection.",
            "inspection_decision_notes": "Pulp temperature (4.8°C) exceeds max limit of 3.0°C. 120 master cartons lack security seals. Dispatch blocked pending corrective action & reinspection."
        },

        # 6. REJECTED (High contamination & thermal abuse, cannot proceed)
        {
            "consignment_id": "REQ-2026-006",
            "consignment_reference": "CR-SNG-2026-006",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Sangamner Rural Farm Depot, Gate 4",
            "pickup_pincode": "422001",
            "pickup_city": "Sangamner / Nashik",
            "destination_location": "APMC Market Vashi, Mumbai",
            "destination_pincode": "400707",
            "destination_city": "Navi Mumbai",
            "product_category": "Vegetables",
            "product_name": "Roma Tomatoes (Bulk)",
            "variety": "Roma Red Field Crop",
            "material_description": "Bulk tomatoes in wooden crates.",
            "declared_quantity_kg": 5000.0,
            "declared_package_count": 250,
            "packaging_type": "Rough Wooden Crates (Unventilated)",
            "packaging_requirements": "Standard food-grade crates",
            "storage_requirements": "Ambient / Pre-cooled",
            "requires_temperature_control": True,
            "target_temp_min": 10.0,
            "target_temp_max": 14.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": now.date(),
            "urgency_level": "STANDARD",
            "declared_cargo_value_inr": 125000.0,
            "customer_photos": [
                "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600"
            ],
            "supporting_documents": [],
            "customer_notes": "Rejected due to fungal spoilage and severe temperature abuse at farm gate.",
            "verification_status": "REJECTED",
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde (AGRI-INSP-0441)",
            "scheduled_inspection_time": now - timedelta(hours=8),
            "verification_reference_no": None,
            "verified_at": now - timedelta(hours=6),
            "verified_quantity_kg": 4200.0,
            "verified_quality_grade": "REJECTED (Severe Spoilage)",
            "verified_temperature": 18.5,
            "rejection_reason": "Physical inspection detected extensive botrytis fungal contamination (approx 28% batch volume), severe mechanical bruising in unpadded wooden crates, and pulp temperature of 18.5°C (violates cold-chain threshold). Unfit for commercial cold-chain transport.",
            "inspection_decision_notes": "Permanent rejection. Cargo does not satisfy minimum food safety and transport integrity standards. Customer must safely dispose or re-sort batch."
        },

        # 7. BOOKING_CONFIRMED (VRF-2026-7412 - Approved, Booked by Customer on Road Reefer)
        {
            "consignment_id": "REQ-2026-007",
            "consignment_reference": "CR-PMP-2026-007",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Pimpalgaon Baswant Packhouse Hub, Nashik",
            "pickup_pincode": "422001",
            "pickup_city": "Nashik",
            "destination_location": "Kolkata Central Perishable Cargo Terminal, West Bengal",
            "destination_pincode": "700001",
            "destination_city": "Kolkata",
            "product_category": "Vegetables",
            "product_name": "Red Onion (Export Quality)",
            "variety": "Nashik Red Export Grade 1",
            "material_description": "Cured red onions, dry outer skins, uniform 55mm+ diameter, packed in 25kg Leno mesh bags.",
            "declared_quantity_kg": 15000.0,
            "declared_package_count": 600,
            "packaging_type": "25kg Leno Mesh Ventilated Bags",
            "packaging_requirements": "Palletized with breathable stretch film",
            "storage_requirements": "Dry ventilated cold storage at 2.0°C to 5.0°C, 65% RH",
            "requires_temperature_control": True,
            "target_temp_min": 2.0,
            "target_temp_max": 5.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": (now + timedelta(days=1)).date(),
            "urgency_level": "STANDARD",
            "declared_cargo_value_inr": 525000.0,
            "customer_photos": ["https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600"],
            "supporting_documents": [],
            "customer_notes": "Verified (VRF-2026-7412) and booked via Multi-Route Engine with Cold Chain Express.",
            "verification_status": "BOOKING_CONFIRMED",
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde (AGRI-INSP-0441)",
            "scheduled_inspection_time": now - timedelta(days=1),
            "verification_reference_no": "VRF-2026-7412",
            "verified_at": now - timedelta(hours=18),
            "verified_quantity_kg": 15000.0,
            "verified_quality_grade": "Grade A Export Cured",
            "verified_temperature": 3.8,
            "booking_id": "BKG-2026-ONION-01",
            "selected_transport_mode": "ROAD",
            "carrier_id": "usr_logistics_01",
            "carrier_name": "Cold Chain Express & Multi-Modal Fleet",
            "assigned_vehicle_or_vessel": "MH-15-AB-1234 (Reefer 16T)",
            "inspection_decision_notes": "100% compliant. Mesh bags properly sealed, zero sprouting or rot. Approved for multi-modal road transit."
        },

        # 8. READY_FOR_DISPATCH (VRF-2026-9201 - Logistics accepted, 5 dispatch checks passed)
        {
            "consignment_id": "REQ-2026-008",
            "consignment_reference": "CR-NSK-2026-008",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Patil Orchards Cold Store Dock, Nashik",
            "pickup_pincode": "422001",
            "pickup_city": "Nashik",
            "destination_location": "Mumbai Port JNPT Terminal 4, Navi Mumbai",
            "destination_pincode": "400707",
            "destination_city": "Navi Mumbai",
            "product_category": "Fresh Fruits",
            "product_name": "Alphonso Mango Export Lot 9",
            "variety": "Alphonso Export GI",
            "material_description": "Export mangoes for Middle East maritime vessel connection.",
            "declared_quantity_kg": 5000.0,
            "declared_package_count": 500,
            "packaging_type": "CFB Export Cartons with Digital Temp Logger",
            "packaging_requirements": "Tamper-evident strap and barcode labels",
            "storage_requirements": "Pre-cooled to 11.0°C",
            "requires_temperature_control": True,
            "target_temp_min": 10.0,
            "target_temp_max": 13.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": now.date(),
            "urgency_level": "EXPRESS",
            "declared_cargo_value_inr": 900000.0,
            "customer_photos": ["https://images.unsplash.com/photo-1553279768-865429fa0078?w=600"],
            "supporting_documents": [],
            "customer_notes": "Logistics accepted, vehicle MH-15-XY-9988 docked and pre-cooled to 11.2°C. Ready for physical dispatch.",
            "verification_status": "READY_FOR_DISPATCH",
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde (AGRI-INSP-0441)",
            "scheduled_inspection_time": now - timedelta(days=1),
            "verification_reference_no": "VRF-2026-9201",
            "verified_at": now - timedelta(hours=14),
            "verified_quantity_kg": 5000.0,
            "verified_quality_grade": "Grade A Export GI Certified",
            "verified_temperature": 11.0,
            "booking_id": "BKG-2026-MANGO-08",
            "selected_transport_mode": "ROAD",
            "carrier_id": "usr_logistics_01",
            "carrier_name": "Cold Chain Express & Multi-Modal Fleet",
            "assigned_vehicle_or_vessel": "MH-15-XY-9988 (Reefer 6T)",
            "inspection_decision_notes": "Full physical inspection approved. Net weight 5,000 kg. Digital loggers active."
        },

        # 9. IN_TRANSIT (VRF-2026-5120 - Active Marine Reefer Container in Arabian Sea)
        {
            "consignment_id": "REQ-2026-009",
            "consignment_reference": "CR-NSA-2026-009",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "JNPT Nhava Sheva Terminal 4, Navi Mumbai",
            "pickup_pincode": "400707",
            "pickup_city": "Navi Mumbai",
            "destination_location": "Port of Rotterdam ECT Delta Terminal, Netherlands",
            "destination_pincode": "300002",
            "destination_city": "Rotterdam",
            "product_category": "Fresh Fruits",
            "product_name": "Nagpur Mandarin Oranges (Reefer Container)",
            "variety": "Nagpur Orange Export Grade",
            "material_description": "Export citrus packed in 40ft High Cube controlled atmosphere reefer container.",
            "declared_quantity_kg": 22000.0,
            "declared_package_count": 2200,
            "packaging_type": "40ft Reefer Container (MSKU-782190-4)",
            "packaging_requirements": "Controlled Atmosphere, CA Nitrogen Flush, Digital Seal #AGRI-SEAL-9901",
            "storage_requirements": "Set point 4.0°C, 85% RH",
            "requires_temperature_control": True,
            "target_temp_min": 3.0,
            "target_temp_max": 6.0,
            "preferred_transport_mode": "MARINE",
            "expected_pickup_date": (now - timedelta(days=4)).date(),
            "urgency_level": "STANDARD",
            "declared_cargo_value_inr": 3300000.0,
            "customer_photos": ["https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600"],
            "supporting_documents": [],
            "customer_notes": "Vessel MV AGRI STAR underway in Arabian Sea. AIS live stream active.",
            "verification_status": "IN_TRANSIT",
            "assigned_officer_id": "usr_verif_02",
            "assigned_officer_name": "Priya Sharma (AGRI-INSP-0782)",
            "scheduled_inspection_time": now - timedelta(days=5),
            "verification_reference_no": "VRF-2026-5120",
            "verified_at": now - timedelta(days=5),
            "verified_quantity_kg": 22000.0,
            "verified_quality_grade": "Grade A Marine Export Certified",
            "verified_temperature": 4.2,
            "booking_id": "BKG-2026-MARINE-09",
            "selected_transport_mode": "MARINE",
            "carrier_id": "usr_logistics_01",
            "carrier_name": "Maersk Line / Cold Chain Express",
            "assigned_vehicle_or_vessel": "MV AGRI STAR (Voyage VOY-2026-EU04)",
            "shipment_id": "SHP-MARINE-001",
            "inspection_decision_notes": "Container pre-trip inspection (PTI) verified. Digital seal AGRI-SEAL-9901 locked. Reefer power operational at 4.2°C."
        },

        # 10. DELIVERED (VRF-2026-3390 - Fully received and verified by buyer)
        {
            "consignment_id": "REQ-2026-010",
            "consignment_reference": "CR-BOM-2026-010",
            "customer_id": "usr_farmer_01",
            "customer_name": "Ramesh Patil",
            "customer_phone": "+91 98220 54321",
            "customer_email": "farmer@agritrust.io",
            "pickup_location": "Sahyadri Orchards Gate 2, Nashik",
            "pickup_pincode": "422001",
            "pickup_city": "Nashik",
            "destination_location": "FreshMart Flagship Receiving Dock, Vashi, Navi Mumbai",
            "destination_pincode": "400707",
            "destination_city": "Navi Mumbai",
            "product_category": "Fresh Fruits",
            "product_name": "Table Grapes (Sonaka Variety)",
            "variety": "Sonaka Seedless",
            "material_description": "Crisp sweet Sonaka table grapes in 500g punnets.",
            "declared_quantity_kg": 2000.0,
            "declared_package_count": 400,
            "packaging_type": "500g Punnets in 5kg Master Boxes",
            "packaging_requirements": "Food grade punnets with cushion pads",
            "storage_requirements": "Pre-cooled at 1.5°C",
            "requires_temperature_control": True,
            "target_temp_min": 1.0,
            "target_temp_max": 3.0,
            "preferred_transport_mode": "ROAD",
            "expected_pickup_date": (now - timedelta(days=2)).date(),
            "urgency_level": "STANDARD",
            "declared_cargo_value_inr": 380000.0,
            "customer_photos": ["https://images.unsplash.com/photo-1596363505729-4190a9506133?w=600"],
            "supporting_documents": [],
            "customer_notes": "Delivered in full integrity. Buyer confirmed 100% quantity and quality match.",
            "verification_status": "DELIVERED",
            "assigned_officer_id": "usr_verif_01",
            "assigned_officer_name": "Sunil Shinde (AGRI-INSP-0441)",
            "scheduled_inspection_time": now - timedelta(days=3),
            "verification_reference_no": "VRF-2026-3390",
            "verified_at": now - timedelta(days=3),
            "verified_quantity_kg": 2000.0,
            "verified_quality_grade": "Grade A Export Quality",
            "verified_temperature": 1.8,
            "booking_id": "BKG-2026-GRAPES-10",
            "selected_transport_mode": "ROAD",
            "carrier_id": "usr_logistics_01",
            "carrier_name": "Cold Chain Express",
            "assigned_vehicle_or_vessel": "MH-15-AB-1234",
            "shipment_id": "SHP-0001",
            "inspection_decision_notes": "Physical verification approved. Receiving dock confirmed zero transit damage and stable 1.8°C thermal log."
        }
    ]

    for c in consignments_data:
        cur.execute("""
            INSERT INTO consignment_requests (
                consignment_id, consignment_reference, customer_id, customer_name, customer_phone,
                customer_email, customer_role, pickup_location, pickup_pincode, pickup_city, pickup_state,
                destination_location, destination_pincode, destination_city, destination_state,
                product_category, product_name, variety, material_description, declared_quantity_kg,
                declared_package_count, packaging_type, packaging_requirements, storage_requirements,
                requires_temperature_control, target_temp_min, target_temp_max, preferred_transport_mode,
                expected_pickup_date, urgency_level, declared_cargo_value_inr, customer_photos,
                supporting_documents, customer_notes, verification_status, assigned_officer_id,
                assigned_officer_name, scheduled_inspection_time, verification_reference_no,
                verified_at, verified_quantity_kg, verified_quality_grade, verified_temperature,
                inspection_decision_notes, rejection_reason, required_corrections, booking_id,
                selected_transport_mode, carrier_id, carrier_name, assigned_vehicle_or_vessel,
                shipment_id, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (consignment_id) DO UPDATE SET
                verification_status = EXCLUDED.verification_status,
                assigned_officer_id = EXCLUDED.assigned_officer_id,
                assigned_officer_name = EXCLUDED.assigned_officer_name,
                verification_reference_no = EXCLUDED.verification_reference_no,
                verified_at = EXCLUDED.verified_at,
                verified_quantity_kg = EXCLUDED.verified_quantity_kg,
                verified_quality_grade = EXCLUDED.verified_quality_grade,
                verified_temperature = EXCLUDED.verified_temperature,
                inspection_decision_notes = EXCLUDED.inspection_decision_notes,
                rejection_reason = EXCLUDED.rejection_reason,
                required_corrections = EXCLUDED.required_corrections;
        """, (
            c["consignment_id"], c["consignment_reference"], c["customer_id"], c["customer_name"],
            c["customer_phone"], c["customer_email"], "FARMER", c["pickup_location"],
            c["pickup_pincode"], c["pickup_city"], "Maharashtra", c["destination_location"],
            c["destination_pincode"], c["destination_city"], "Maharashtra" if "Mumbai" in c["destination_city"] else ("Delhi" if "Delhi" in c["destination_city"] else "International"),
            c["product_category"], c["product_name"], c["variety"], c["material_description"],
            c["declared_quantity_kg"], c["declared_package_count"], c["packaging_type"],
            c["packaging_requirements"], c["storage_requirements"], c["requires_temperature_control"],
            c["target_temp_min"], c["target_temp_max"], c["preferred_transport_mode"],
            c["expected_pickup_date"], c["urgency_level"], c["declared_cargo_value_inr"],
            Json(c["customer_photos"]), Json(c["supporting_documents"]), c["customer_notes"],
            c["verification_status"], c["assigned_officer_id"], c["assigned_officer_name"],
            c["scheduled_inspection_time"], c["verification_reference_no"], c["verified_at"],
            c["verified_quantity_kg"], c["verified_quality_grade"], c["verified_temperature"],
            c.get("inspection_decision_notes"), c.get("rejection_reason"), c.get("required_corrections"),
            c.get("booking_id"), c.get("selected_transport_mode"), c.get("carrier_id"),
            c.get("carrier_name"), c.get("assigned_vehicle_or_vessel"), c.get("shipment_id"),
            now - timedelta(days=2), now
        ))
    conn.commit()

    # 5. Seed Physical Inspection Records in consignment_inspections
    print("\n[STEP 5] Seeding Physical Inspection Checklists & Reports...")
    inspections_data = [
        # Inspection for REQ-2026-004 (APPROVED)
        {
            "inspection_id": "INSP-2026-004-1",
            "consignment_id": "REQ-2026-004",
            "inspection_number": 1,
            "is_reinspection": False,
            "officer_id": "usr_verif_01",
            "officer_name": "Sunil Shinde",
            "officer_badge": "AGRI-INSP-0441",
            "inspection_location": "Sahyadri Farmer Producer Co., Dindori Gate 1, Nashik",
            "inspection_facility_type": "Certified Packhouse Dock #1",
            "inspection_started_at": now - timedelta(hours=3),
            "inspection_completed_at": now - timedelta(hours=2),
            "actual_material_condition_verified": True,
            "actual_weight_verified": True,
            "visible_damage_detected": False,
            "contamination_spoilage_detected": False,
            "packaging_labelling_compliant": True,
            "temp_within_required_range": True,
            "supporting_docs_verified": True,
            "transport_mode_suitability_confirmed": True,
            "declared_quantity_kg": 3500.0,
            "verified_quantity_kg": 3480.0,
            "quantity_discrepancy_kg": -20.0,
            "measured_temperature": 11.2,
            "measured_humidity": 84.5,
            "measured_brix_level": 17.2,
            "verified_quality_grade": "Grade A (Export Certified GI)",
            "verified_packaging_condition": "5-ply ventilated CFB export cartons with food-grade dividers, tamper-evident security holographic tape",
            "evaluated_mode": "ROAD",
            "mode_suitability_result": "SUITABLE_AS_REQUESTED",
            "mode_suitability_notes": "Pulp temperature pre-cooled at 11.2°C meets reefer transport parameters. Cartons are stackable up to 8 high.",
            "discrepancies_found": [
                {"item": "Net Weight", "declared": "3,500 kg", "verified": "3,480 kg", "variance": "-20 kg (-0.57%)", "status": "WITHIN_TOLERANCE", "notes": "Normal moisture evaporation loss post-harvest."}
            ],
            "corrective_actions_required": None,
            "officer_evidence_photos": [
                "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800",
                "https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800"
            ],
            "inspection_result": "APPROVED",
            "officer_remarks": "Batch passes all physical verification checkpoints. Produce is firm, golden-yellow blush, zero pest or decay. Calibration cert on digital scale checked. Generated Verification Ref VRF-2026-8839.",
            "verification_reference_no": "VRF-2026-8839"
        },

        # Inspection for REQ-2026-005 (REQUIRES_CORRECTION)
        {
            "inspection_id": "INSP-2026-005-1",
            "consignment_id": "REQ-2026-005",
            "inspection_number": 1,
            "is_reinspection": False,
            "officer_id": "usr_verif_01",
            "officer_name": "Sunil Shinde",
            "officer_badge": "AGRI-INSP-0441",
            "inspection_location": "Mahabaleshwar Berry Co-op Dock, Satara Road",
            "inspection_facility_type": "Primary Collection Center",
            "inspection_started_at": now - timedelta(hours=5),
            "inspection_completed_at": now - timedelta(hours=4),
            "actual_material_condition_verified": True,
            "actual_weight_verified": True,
            "visible_damage_detected": False,
            "contamination_spoilage_detected": False,
            "packaging_labelling_compliant": False,
            "temp_within_required_range": False,
            "supporting_docs_verified": True,
            "transport_mode_suitability_confirmed": False,
            "declared_quantity_kg": 1200.0,
            "verified_quantity_kg": 1140.0,
            "quantity_discrepancy_kg": -60.0,
            "measured_temperature": 4.8,
            "measured_humidity": 78.0,
            "measured_brix_level": 9.2,
            "verified_quality_grade": "Grade B (Deficient Packaging & Temp)",
            "verified_packaging_condition": "Clamshells intact but 120 master cartons lack mandatory tamper-evident security tape",
            "evaluated_mode": "ROAD",
            "mode_suitability_result": "CONDITIONALLY_UNSUITABLE",
            "mode_suitability_notes": "Pulp temperature is 4.8°C (target bracket 1.0°C - 3.0°C). Risk of condensation and mold during transit if dispatched without pre-cooling.",
            "discrepancies_found": [
                {"item": "Pulp Temperature", "declared": "2.0°C", "verified": "4.8°C", "variance": "+2.8°C (High)", "status": "NON_COMPLIANT", "notes": "Pulp temperature exceeds critical safety ceiling of 3.0°C."},
                {"item": "Security Labeling", "declared": "Sealed Cartons", "verified": "Unsealed", "variance": "120 boxes unsealed", "status": "NON_COMPLIANT", "notes": "Missing tamper-evident security bands."}
            ],
            "corrective_actions_required": "1. Return batch to pre-cooling blast chamber until pulp core temperature reaches <= 2.5°C.\n2. Apply serial-numbered tamper-evident holographic bands on all 120 unsealed master cartons.\n3. Request reinspection upon completion.",
            "officer_evidence_photos": [
                "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800"
            ],
            "inspection_result": "REQUIRES_CORRECTION",
            "officer_remarks": "Discrepancies identified. Dispatch blocked. Reinspection required once corrective actions are implemented.",
            "verification_reference_no": None
        },

        # Inspection for REQ-2026-006 (REJECTED)
        {
            "inspection_id": "INSP-2026-006-1",
            "consignment_id": "REQ-2026-006",
            "inspection_number": 1,
            "is_reinspection": False,
            "officer_id": "usr_verif_01",
            "officer_name": "Sunil Shinde",
            "officer_badge": "AGRI-INSP-0441",
            "inspection_location": "Sangamner Rural Farm Depot, Gate 4",
            "inspection_facility_type": "Field Collection Center",
            "inspection_started_at": now - timedelta(hours=7),
            "inspection_completed_at": now - timedelta(hours=6),
            "actual_material_condition_verified": True,
            "actual_weight_verified": True,
            "visible_damage_detected": True,
            "contamination_spoilage_detected": True,
            "packaging_labelling_compliant": False,
            "temp_within_required_range": False,
            "supporting_docs_verified": False,
            "transport_mode_suitability_confirmed": False,
            "declared_quantity_kg": 5000.0,
            "verified_quantity_kg": 4200.0,
            "quantity_discrepancy_kg": -800.0,
            "measured_temperature": 18.5,
            "measured_humidity": 62.0,
            "measured_brix_level": 4.1,
            "verified_quality_grade": "REJECTED (Spoiled / Contaminated)",
            "verified_packaging_condition": "Unventilated, splintered rough wooden crates without liner protection",
            "evaluated_mode": "ROAD",
            "mode_suitability_result": "UNSUITABLE",
            "mode_suitability_notes": "Active rot and fungal mycelium present. Cargo will completely spoil within 12 hours of reefer enclosure.",
            "discrepancies_found": [
                {"item": "Produce Condition", "declared": "Fresh Sound Tomatoes", "verified": "28% Botrytis Fungal Rot", "variance": "Severe Spoilage", "status": "CRITICAL_FAILURE", "notes": "Active rot and soft watery lesions across all examined crates."},
                {"item": "Holding Temperature", "declared": "12.0°C", "verified": "18.5°C", "variance": "+6.5°C", "status": "CRITICAL_FAILURE", "notes": "Extreme thermal abuse in direct sunlight."}
            ],
            "corrective_actions_required": "Consignment cannot be salvaged for commercial transport. Dispose of contaminated material in accordance with APMC bio-waste guidelines.",
            "officer_evidence_photos": [
                "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800"
            ],
            "inspection_result": "REJECTED",
            "officer_remarks": "Formal rejection issued. Physical inspection confirms severe cargo compromise. Transport booking and dispatch permanently barred.",
            "verification_reference_no": None
        }
    ]

    for insp in inspections_data:
        cur.execute("""
            INSERT INTO consignment_inspections (
                inspection_id, consignment_id, inspection_number, is_reinspection,
                officer_id, officer_name, officer_badge, inspection_location,
                inspection_facility_type, inspection_started_at, inspection_completed_at,
                actual_material_condition_verified, actual_weight_verified, visible_damage_detected,
                contamination_spoilage_detected, packaging_labelling_compliant, temp_within_required_range,
                supporting_docs_verified, transport_mode_suitability_confirmed, declared_quantity_kg,
                verified_quantity_kg, quantity_discrepancy_kg, measured_temperature, measured_humidity,
                measured_brix_level, verified_quality_grade, verified_packaging_condition,
                evaluated_mode, mode_suitability_result, mode_suitability_notes,
                discrepancies_found, corrective_actions_required, officer_evidence_photos,
                inspection_result, officer_remarks, verification_reference_no, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (inspection_id) DO UPDATE SET
                inspection_result = EXCLUDED.inspection_result,
                officer_remarks = EXCLUDED.officer_remarks,
                verification_reference_no = EXCLUDED.verification_reference_no;
        """, (
            insp["inspection_id"], insp["consignment_id"], insp["inspection_number"],
            insp["is_reinspection"], insp["officer_id"], insp["officer_name"],
            insp["officer_badge"], insp["inspection_location"], insp["inspection_facility_type"],
            insp["inspection_started_at"], insp["inspection_completed_at"],
            insp["actual_material_condition_verified"], insp["actual_weight_verified"],
            insp["visible_damage_detected"], insp["contamination_spoilage_detected"],
            insp["packaging_labelling_compliant"], insp["temp_within_required_range"],
            insp["supporting_docs_verified"], insp["transport_mode_suitability_confirmed"],
            insp["declared_quantity_kg"], insp["verified_quantity_kg"], insp["quantity_discrepancy_kg"],
            insp["measured_temperature"], insp["measured_humidity"], insp["measured_brix_level"],
            insp["verified_quality_grade"], insp["verified_packaging_condition"],
            insp["evaluated_mode"], insp["mode_suitability_result"], insp["mode_suitability_notes"],
            Json(insp["discrepancies_found"]), insp["corrective_actions_required"],
            Json(insp["officer_evidence_photos"]), insp["inspection_result"],
            insp["officer_remarks"], insp["verification_reference_no"], now - timedelta(hours=2)
        ))
    conn.commit()

    # 6. Seed Consignment Status History for Audit Trail
    print("\n[STEP 6] Seeding Tamper-Evident Status History Audit...")
    history_events = [
        ("REQ-2026-004", "REQUEST_CREATED", "PENDING_VERIFICATION", "usr_farmer_01", "Ramesh Patil", "FARMER", "Consignment Request Created", "Farmer submitted consignment request for 3,500 kg Alphonso Mango."),
        ("REQ-2026-004", "PENDING_VERIFICATION", "INSPECTION_SCHEDULED", "usr_admin_01", "Vikram Malhotra", "ADMIN", "Officer Assigned", "Admin assigned Officer Sunil Shinde (AGRI-INSP-0441) based on Nashik packhouse location."),
        ("REQ-2026-004", "INSPECTION_SCHEDULED", "UNDER_INSPECTION", "usr_verif_01", "Sunil Shinde", "VERIFICATION_TEAM", "Physical Inspection Started", "Officer commenced on-dock inspection, scale calibration and pulp temp checks."),
        ("REQ-2026-004", "UNDER_INSPECTION", "APPROVED", "usr_verif_01", "Sunil Shinde", "VERIFICATION_TEAM", "Physical Inspection Approved (VRF-2026-8839)", "All 8 checkpoints passed. Net weight 3,480 kg, temp 11.2°C. Verified reference VRF-2026-8839 issued."),
        
        ("REQ-2026-005", "REQUEST_CREATED", "PENDING_VERIFICATION", "usr_farmer_01", "Ramesh Patil", "FARMER", "Consignment Request Created", "Farmer submitted strawberry consignment request."),
        ("REQ-2026-005", "PENDING_VERIFICATION", "UNDER_INSPECTION", "usr_verif_01", "Sunil Shinde", "VERIFICATION_TEAM", "Physical Inspection Started", "Officer arrived on site."),
        ("REQ-2026-005", "UNDER_INSPECTION", "REQUIRES_CORRECTION", "usr_verif_01", "Sunil Shinde", "VERIFICATION_TEAM", "Corrections Mandated", "Discrepancy in temperature (+2.8°C) and unsealed cartons. Reinspection required."),

        ("REQ-2026-006", "REQUEST_CREATED", "PENDING_VERIFICATION", "usr_farmer_01", "Ramesh Patil", "FARMER", "Consignment Request Created", "Tomato consignment submitted."),
        ("REQ-2026-006", "PENDING_VERIFICATION", "REJECTED", "usr_verif_01", "Sunil Shinde", "VERIFICATION_TEAM", "Consignment Rejected", "Severe rot and temperature abuse (18.5°C). Barred from dispatch."),

        ("REQ-2026-008", "APPROVED", "BOOKING_CONFIRMED", "usr_farmer_01", "Ramesh Patil", "FARMER", "Transportation Booked", "Customer booked Reefer Truck MH-15-XY-9988 using verified reference VRF-2026-9201."),
        ("REQ-2026-008", "BOOKING_CONFIRMED", "LOGISTICS_ACCEPTED", "usr_logistics_01", "Rajesh Gaikwad", "LOGISTICS", "Logistics Accepted", "Logistics confirmed vehicle availability and pre-cooling."),
        ("REQ-2026-008", "LOGISTICS_ACCEPTED", "READY_FOR_DISPATCH", "usr_logistics_01", "Rajesh Gaikwad", "LOGISTICS", "Dispatch Readiness Verified", "All 5 pre-dispatch checks passed.")
    ]

    for h in history_events:
        cur.execute("""
            INSERT INTO consignment_status_history (
                consignment_id, from_status, to_status, changed_by_user_id,
                changed_by_user_name, changed_by_role, action_title, notes, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], now - timedelta(hours=5)))
    conn.commit()

    # 7. Seed Dispatch Readiness Checks
    print("\n[STEP 7] Seeding Dispatch-Readiness Checklist Records...")
    cur.execute("""
        INSERT INTO dispatch_readiness_checks (
            check_id, consignment_id, shipment_id, logistics_user_id,
            check_physical_verification_approved, check_booking_confirmed,
            check_verified_quantity_matched, check_packaging_docs_compliant,
            check_transport_capacity_ready, all_checks_passed,
            verified_ref_number_checked, assigned_vehicle_number,
            pre_cooling_temp_c, odometer_km, seal_number, carrier_operator_notes, evaluated_at
        ) VALUES (
            'CHK-2026-008', 'REQ-2026-008', 'SHP-2026-008', 'usr_logistics_01',
            TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
            'VRF-2026-9201', 'MH-15-XY-9988', 11.2, 48200, 'SEAL-MH15-8831',
            'All 5 pre-dispatch checks verified. Driver equipped with digital thermometer and emergency contact list.',
            %s
        ) ON CONFLICT (check_id) DO NOTHING;
    """, (now - timedelta(hours=1),))
    conn.commit()

    conn.close()
    print("\n" + "=" * 80)
    print(" [SUCCESS] PHYSICAL VERIFICATION WORKFLOW DATABASE MIGRATION & SEED COMPLETE!")
    print("=" * 80)

if __name__ == "__main__":
    run_migration_and_seed()
