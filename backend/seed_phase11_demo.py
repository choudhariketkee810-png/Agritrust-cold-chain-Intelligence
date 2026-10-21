"""
AGRITrust - Phase 11 Demo Shipment Scenarios Seed Script
Creates 5 realistic, controlled demo shipments representing distinct cold-chain operational states:

1. AGRI-DEMO-101: NORMAL TRANSIT (Safe temperature, Reefer ON, Door CLOSED, Risk: NORMAL)
2. AGRI-DEMO-102: TEMPERATURE EXCURSION (High temp excursion, Temp Alert, Risk: HIGH/CRITICAL)
3. AGRI-DEMO-103: REFRIGERATION / DOOR EVENT (Door OPEN, Reefer OFF, Temp rise, Risk: CRITICAL)
4. AGRI-DEMO-104: SUCCESSFULLY RECEIVED (Zero discrepancy between dispatched vs received, Status: DELIVERED)
5. AGRI-DEMO-105: DISCREPANCY / INVESTIGATION (Sent-vs-received shortage & grade variance, Incident created, Investigation dossier active)
"""

import json
import urllib.request
import urllib.error
import psycopg2
from datetime import datetime, timedelta

API_BASE_URL = "http://127.0.0.1:8000"
DB_CONFIG = {
    "dbname": "ftl_cold_chain",
    "user": "postgres",
    "password": "1234",
    "host": "localhost",
    "port": 5432
}

def api_post(endpoint, payload):
    url = f"{API_BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"[API ERROR] {endpoint} returned {e.code}: {error_body}")
        raise

def api_get(endpoint):
    url = f"{API_BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={'Content-Type': 'application/json'}, method='GET')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_db():
    return psycopg2.connect(**DB_CONFIG)

def setup_demo_vehicles():
    """Ensure demo vehicles exist in vehicles table"""
    conn = get_db()
    cur = conn.cursor()
    vehicles = [
        ('FTL-V001', 'MH15AB1234', 'REEFER', 5000.0, 'ON', 'ACTIVE'),
        ('FTL-V002', 'MH12CD5678', 'REEFER', 6000.0, 'ON', 'ACTIVE'),
        ('FTL-V003', 'KA01EF9012', 'REEFER', 4500.0, 'ON', 'ACTIVE'),
        ('FTL-V004', 'MH14GH3456', 'REEFER', 5000.0, 'ON', 'ACTIVE'),
        ('FTL-V005', 'MH08IJ7890', 'REEFER', 7500.0, 'ON', 'ACTIVE'),
    ]
    for v in vehicles:
        cur.execute("""
            INSERT INTO vehicles (vehicle_id, vehicle_number, vehicle_type, capacity_kg, refrigeration_status, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (vehicle_id) DO UPDATE SET
                vehicle_number = EXCLUDED.vehicle_number,
                refrigeration_status = EXCLUDED.refrigeration_status,
                status = EXCLUDED.status;
        """, v)
    conn.commit()
    cur.close()
    conn.close()
    print("[INIT] Demo vehicles verified.")

def clean_previous_demo_data():
    """Clean only AGRI-DEMO-* records to allow safe re-seeding without touching SHP-* or AGRI-1001"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM alerts WHERE shipment_id LIKE 'AGRI-DEMO-%';
        DELETE FROM telemetry WHERE shipment_id LIKE 'AGRI-DEMO-%';
        DELETE FROM incidents WHERE shipment_id LIKE 'AGRI-DEMO-%';
        DELETE FROM receiving_records WHERE shipment_id LIKE 'AGRI-DEMO-%';
        DELETE FROM shipment_evidence WHERE shipment_id LIKE 'AGRI-DEMO-%';
        DELETE FROM shipment_events WHERE shipment_id LIKE 'AGRI-DEMO-%';
        DELETE FROM shipment_quality WHERE shipment_id LIKE 'AGRI-DEMO-%';
        DELETE FROM shipments WHERE shipment_id LIKE 'AGRI-DEMO-%';
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("[CLEAN] Cleaned existing AGRI-DEMO-* records.")

def insert_telemetry_series(shipment_id, readings):
    """Insert a sequence of chronological telemetry readings into telemetry table"""
    conn = get_db()
    cur = conn.cursor()
    for r in readings:
        cur.execute("""
            INSERT INTO telemetry (
                shipment_id, temperature, humidity, latitude, longitude,
                door_status, refrigeration_status, recorded_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            shipment_id,
            r["temperature"],
            r["humidity"],
            r.get("latitude", 19.9975),
            r.get("longitude", 73.7898),
            r.get("door_status", "CLOSED"),
            r.get("refrigeration_status", "ON"),
            r["recorded_at"]
        ))
    conn.commit()
    cur.close()
    conn.close()

def insert_alert(shipment_id, alert_type, severity, message, action, temperature, created_at, status="OPEN", resolved_at=None):
    """Insert an alert record for a demo shipment"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO alerts (
            shipment_id, alert_type, severity, message,
            recommended_action, temperature, status, created_at, resolved_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
    """, (shipment_id, alert_type, severity, message, action, temperature, status, created_at, resolved_at))
    conn.commit()
    cur.close()
    conn.close()

# -------------------------------------------------------------
# SEED 1: AGRI-DEMO-101 (NORMAL TRANSIT)
# -------------------------------------------------------------
def seed_scenario_1_normal():
    shipment_id = "AGRI-DEMO-101"
    print(f"\n---> Seeding Scenario 1: {shipment_id} (NORMAL TRANSIT)...")
    
    # 1. Create Shipment
    api_post("/shipments", {
        "shipment_id": shipment_id,
        "product_name": "Grapes (Export White)",
        "total_quantity": 1200.0,
        "grade_a_quantity": 1000.0,
        "grade_b_quantity": 200.0,
        "damaged_quantity": 0.0,
        "origin": "Nashik Cold Hub, Maharashtra",
        "destination": "Bengaluru Cold Terminal, Karnataka",
        "vehicle_id": "FTL-V001",
        "target_temp_min": 2.0,
        "target_temp_max": 5.0,
        "recorded_by": "DEMO_Farmer_Nashik",
        "quality_notes": "[DEMO DATA] Export white grapes harvested and pre-cooled to 3.0 C at farm gate."
    })
    
    # 2. Record Logistics Handover
    api_post(f"/shipments/{shipment_id}/handover", {
        "logistics_receiver": "Logistics Driver Ramesh",
        "location": "Nashik Farm Gate",
        "vehicle_id": "FTL-V001",
        "handover_temperature": 3.2,
        "handover_humidity": 85.0,
        "handover_quantity": 1200.0,
        "notes": "[DEMO DATA] Handover verified. Pre-cooling checked. Reefer operational."
    })
    
    # 3. Insert Stable In-Transit Telemetry Series (Within 2.0 C - 5.0 C)
    now = datetime.now()
    readings = []
    temps = [3.2, 3.3, 3.4, 3.5, 3.4, 3.3, 3.2, 3.3, 3.4, 3.3]
    for i, t in enumerate(temps):
        readings.append({
            "temperature": t,
            "humidity": 84.0 + (i % 3),
            "latitude": 19.9975 - (i * 0.04),
            "longitude": 73.7898 + (i * 0.03),
            "door_status": "CLOSED",
            "refrigeration_status": "ON",
            "recorded_at": (now - timedelta(minutes=(10 - i) * 5)).isoformat()
        })
    insert_telemetry_series(shipment_id, readings)
    print(f"     [OK] {shipment_id} seeded: Status=IN_TRANSIT, Temp=3.3 C, Door=CLOSED, Reefer=ON, Risk=NORMAL")

# -------------------------------------------------------------
# SEED 2: AGRI-DEMO-102 (TEMPERATURE EXCURSION)
# -------------------------------------------------------------
def seed_scenario_2_temperature_excursion():
    shipment_id = "AGRI-DEMO-102"
    print(f"\n---> Seeding Scenario 2: {shipment_id} (TEMPERATURE EXCURSION)...")
    
    # 1. Create Shipment
    api_post("/shipments", {
        "shipment_id": shipment_id,
        "product_name": "Tomato (Fresh Table)",
        "total_quantity": 1500.0,
        "grade_a_quantity": 1200.0,
        "grade_b_quantity": 300.0,
        "damaged_quantity": 0.0,
        "origin": "Pune Agro Hub, Maharashtra",
        "destination": "Delhi APMC Terminal, Azadpur",
        "vehicle_id": "FTL-V002",
        "target_temp_min": 10.0,
        "target_temp_max": 13.0,
        "recorded_by": "DEMO_Farmer_Pune",
        "quality_notes": "[DEMO DATA] Fresh vine-ripened tomatoes dispatched under controlled temperature."
    })
    
    # 2. Record Logistics Handover
    api_post(f"/shipments/{shipment_id}/handover", {
        "logistics_receiver": "Carrier Lead Anil",
        "location": "Pune Farm Hub",
        "vehicle_id": "FTL-V002",
        "handover_temperature": 11.5,
        "handover_humidity": 80.0,
        "handover_quantity": 1500.0,
        "notes": "[DEMO DATA] Consignment accepted at 11.5 C."
    })
    
    # 3. Insert Telemetry Series with High Temperature Deviation (14.5 C - 16.2 C)
    now = datetime.now()
    readings = []
    temps = [11.8, 12.5, 13.4, 14.2, 14.9, 15.4, 15.8, 16.0, 16.2, 16.1]
    for i, t in enumerate(temps):
        readings.append({
            "temperature": t,
            "humidity": 78.0,
            "latitude": 18.5204 + (i * 0.1),
            "longitude": 73.8567 + (i * 0.08),
            "door_status": "CLOSED",
            "refrigeration_status": "ON",
            "recorded_at": (now - timedelta(minutes=(10 - i) * 5)).isoformat()
        })
    insert_telemetry_series(shipment_id, readings)
    
    # 4. Insert Active Alert
    insert_alert(
        shipment_id=shipment_id,
        alert_type="HIGH_TEMPERATURE",
        severity="CRITICAL",
        message="Temperature exceeded safe range: 16.1 C (Target: 10.0 C - 13.0 C).",
        action="Inspect refrigeration compressor setpoint immediately and verify airflow.",
        temperature=16.1,
        created_at=(now - timedelta(minutes=15)).isoformat(),
        status="OPEN"
    )
    print(f"     [OK] {shipment_id} seeded: Status=IN_TRANSIT, Temp=16.1 C, Excursion Alert=ACTIVE, Risk=HIGH/CRITICAL")

# -------------------------------------------------------------
# SEED 3: AGRI-DEMO-103 (REFRIGERATION / DOOR SECURITY EVENT)
# -------------------------------------------------------------
def seed_scenario_3_reefer_door_event():
    shipment_id = "AGRI-DEMO-103"
    print(f"\n---> Seeding Scenario 3: {shipment_id} (REFRIGERATION & DOOR EVENT)...")
    
    # 1. Create Shipment
    api_post("/shipments", {
        "shipment_id": shipment_id,
        "product_name": "Mixed Vegetables (Capsicum & Beans)",
        "total_quantity": 800.0,
        "grade_a_quantity": 650.0,
        "grade_b_quantity": 150.0,
        "damaged_quantity": 0.0,
        "origin": "Bengaluru Organic Valley, Karnataka",
        "destination": "Mumbai Vashi APMC Hub, Maharashtra",
        "vehicle_id": "FTL-V003",
        "target_temp_min": 4.0,
        "target_temp_max": 8.0,
        "recorded_by": "DEMO_Farmer_Bengaluru",
        "quality_notes": "[DEMO DATA] Fresh organic farm vegetables packed in ventilated crates."
    })
    
    # 2. Record Logistics Handover
    api_post(f"/shipments/{shipment_id}/handover", {
        "logistics_receiver": "Carrier Driver Suresh",
        "location": "Bengaluru Farm Gate",
        "vehicle_id": "FTL-V003",
        "handover_temperature": 5.0,
        "handover_humidity": 88.0,
        "handover_quantity": 800.0,
        "notes": "[DEMO DATA] Loaded into Reefer unit. Seal #KA-4810 applied."
    })
    
    # 3. Insert Telemetry Series with Door OPEN and Reefer OFF
    now = datetime.now()
    readings = []
    temps = [5.2, 5.5, 6.2, 7.5, 8.6, 9.4, 10.1, 10.8, 11.2, 11.5]
    for i, t in enumerate(temps):
        readings.append({
            "temperature": t,
            "humidity": 75.0 - (i * 0.5),
            "latitude": 12.9716 + (i * 0.15),
            "longitude": 77.5946 - (i * 0.1),
            "door_status": "OPEN" if i >= 4 else "CLOSED",
            "refrigeration_status": "OFF" if i >= 4 else "ON",
            "recorded_at": (now - timedelta(minutes=(10 - i) * 5)).isoformat()
        })
    insert_telemetry_series(shipment_id, readings)
    
    # 4. Insert Active Alert
    insert_alert(
        shipment_id=shipment_id,
        alert_type="DOOR_OPEN_WARNING",
        severity="WARNING",
        message="Cargo door open in transit and refrigeration compressor inactive.",
        action="Verify cargo security seal and ensure rear doors are locked immediately.",
        temperature=11.5,
        created_at=(now - timedelta(minutes=20)).isoformat(),
        status="OPEN"
    )
    print(f"     [OK] {shipment_id} seeded: Status=IN_TRANSIT, Door=OPEN, Reefer=OFF, Temp=11.5 C, Risk=CRITICAL")

# -------------------------------------------------------------
# SEED 4: AGRI-DEMO-104 (SUCCESSFULLY RECEIVED / ZERO DISCREPANCY)
# -------------------------------------------------------------
def seed_scenario_4_successfully_received():
    shipment_id = "AGRI-DEMO-104"
    print(f"\n---> Seeding Scenario 4: {shipment_id} (SUCCESSFULLY RECEIVED)...")
    
    # 1. Create Shipment
    api_post("/shipments", {
        "shipment_id": shipment_id,
        "product_name": "Pomegranate (Bhagwa Export)",
        "total_quantity": 1000.0,
        "grade_a_quantity": 800.0,
        "grade_b_quantity": 200.0,
        "damaged_quantity": 0.0,
        "origin": "Solapur Orchard, Maharashtra",
        "destination": "Mumbai JNPT Export Terminal, Maharashtra",
        "vehicle_id": "FTL-V004",
        "target_temp_min": 5.0,
        "target_temp_max": 8.0,
        "recorded_by": "DEMO_Farmer_Solapur",
        "quality_notes": "[DEMO DATA] Export Grade Bhagwa Pomegranates sorted and packed."
    })
    
    # 2. Record Logistics Handover
    api_post(f"/shipments/{shipment_id}/handover", {
        "logistics_receiver": "Carrier Driver Vijay",
        "location": "Solapur Farm Gate",
        "vehicle_id": "FTL-V004",
        "handover_temperature": 6.0,
        "handover_humidity": 85.0,
        "handover_quantity": 1000.0,
        "notes": "[DEMO DATA] Handover completed. Reefer unit verified at 6.0 C."
    })
    
    # 3. Telemetry Series
    now = datetime.now() - timedelta(hours=2)
    readings = []
    temps = [6.0, 6.2, 6.1, 6.3, 6.2, 6.4, 6.2, 6.3]
    for i, t in enumerate(temps):
        readings.append({
            "temperature": t,
            "humidity": 84.0,
            "latitude": 17.6599 + (i * 0.1),
            "longitude": 75.9064 - (i * 0.1),
            "door_status": "CLOSED",
            "refrigeration_status": "ON",
            "recorded_at": (now + timedelta(minutes=i * 10)).isoformat()
        })
    insert_telemetry_series(shipment_id, readings)
    
    # 4. Record Buyer Receiving (Exact Match: 1000 kg, Grade A: 800 kg, Grade B: 200 kg, Damaged: 0 kg)
    api_post(f"/shipments/{shipment_id}/receive", {
        "receiver_name": "JNPT Export Inspector Sunita",
        "receiving_location": "Mumbai JNPT Export Terminal, Maharashtra",
        "received_total_quantity": 1000.0,
        "received_grade_a": 800.0,
        "received_grade_b": 200.0,
        "damaged_quantity": 0.0,
        "receiving_temperature": 6.4,
        "receiving_humidity": 82.0,
        "receiving_notes": "[DEMO DATA] Consignment accepted with zero physical or weight discrepancy. Thermal integrity maintained."
    })
    print(f"     [OK] {shipment_id} seeded: Status=DELIVERED, Discrepancy=0 kg, Status=NO_SIGNIFICANT_DISCREPANCY")

# -------------------------------------------------------------
# SEED 5: AGRI-DEMO-105 (DISCREPANCY & INVESTIGATION DOSSIER)
# -------------------------------------------------------------
def seed_scenario_5_discrepancy_investigation():
    shipment_id = "AGRI-DEMO-105"
    print(f"\n---> Seeding Scenario 5: {shipment_id} (DISCREPANCY / INVESTIGATION)...")
    
    # 1. Create Shipment
    api_post("/shipments", {
        "shipment_id": shipment_id,
        "product_name": "Alphonso Mango (Export Pack)",
        "total_quantity": 2000.0,
        "grade_a_quantity": 1600.0,
        "grade_b_quantity": 400.0,
        "damaged_quantity": 0.0,
        "origin": "Ratnagiri Orchard, Maharashtra",
        "destination": "Delhi Air Cargo Logistics Hub, IGI",
        "vehicle_id": "FTL-V005",
        "target_temp_min": 10.0,
        "target_temp_max": 13.0,
        "recorded_by": "DEMO_Farmer_Ratnagiri",
        "quality_notes": "[DEMO DATA] Premium Ratnagiri Alphonso Mangoes dispatched for air cargo export."
    })
    
    # 2. Record Logistics Handover
    api_post(f"/shipments/{shipment_id}/handover", {
        "logistics_receiver": "Logistics Officer Vikram",
        "location": "Ratnagiri Orchard Gate",
        "vehicle_id": "FTL-V005",
        "handover_temperature": 11.8,
        "handover_humidity": 82.0,
        "handover_quantity": 2000.0,
        "notes": "[DEMO DATA] Baseline dispatch signed and recorded at orchard."
    })
    
    # 3. Telemetry Series with Excursion
    now = datetime.now() - timedelta(hours=3)
    readings = []
    temps = [11.8, 12.4, 13.2, 14.1, 14.8, 14.6, 14.2, 13.9, 14.5]
    for i, t in enumerate(temps):
        readings.append({
            "temperature": t,
            "humidity": 80.0,
            "latitude": 16.9902 + (i * 0.2),
            "longitude": 73.3120 + (i * 0.1),
            "door_status": "CLOSED",
            "refrigeration_status": "ON",
            "recorded_at": (now + timedelta(minutes=i * 12)).isoformat()
        })
    insert_telemetry_series(shipment_id, readings)
    
    # 4. Insert Historical Alert
    insert_alert(
        shipment_id=shipment_id,
        alert_type="HIGH_TEMPERATURE",
        severity="CRITICAL",
        message="Temperature exceeded safe range: 14.8 C.",
        action="Check cooling unit airflow and calibrate thermostat.",
        temperature=14.8,
        created_at=(now + timedelta(minutes=48)).isoformat(),
        status="RESOLVED",
        resolved_at=(now + timedelta(minutes=96)).isoformat()
    )
    
    # 5. Record Buyer Receiving with Shortage & Grade Variance:
    # Dispatched: 2000 kg (Grade A: 1600 kg, Grade B: 400 kg)
    # Received: 1800 kg (Grade A: 1300 kg, Grade B: 400 kg, Damaged: 100 kg, Receiving Temp: 14.2 C)
    api_post(f"/shipments/{shipment_id}/receive", {
        "receiver_name": "Delhi Air Cargo Inspector Priya",
        "receiving_location": "Delhi Air Cargo Logistics Hub, IGI",
        "received_total_quantity": 1800.0,
        "received_grade_a": 1300.0,
        "received_grade_b": 400.0,
        "damaged_quantity": 100.0,
        "receiving_temperature": 14.2,
        "receiving_humidity": 81.0,
        "receiving_notes": "[DEMO DATA] Physical receipt weight differs from dispatch record by 200 kg. Grade A deficit of 300 kg and 100 kg damaged fruit recorded."
    })
    print(f"     [OK] {shipment_id} seeded: Status=DELIVERED, Discrepancy=-200 kg, Autonomous Incident=OPEN, Investigation Dossier=ACTIVE")

def verify_all_scenarios():
    """Run programmatic verification of all 5 demo scenarios"""
    print("\n======================================================================")
    print("PHASE 11 DEMO SCENARIOS VERIFICATION")
    print("======================================================================")
    
    # 1. Verify Shipments
    ship_res = api_get("/shipments")
    all_shipments = ship_res.get("data", [])
    demo_ids = [s["shipment_id"] for s in all_shipments if "DEMO" in s["shipment_id"]]
    print(f"\n1. Demo Shipments in Registry ({len(demo_ids)}): {demo_ids}")
    assert len(demo_ids) == 5, f"Expected 5 demo shipments, got {len(demo_ids)}"
    
    # 2. Verify Scenario 1 (AGRI-DEMO-101) Risk = NORMAL
    risk_1 = api_get("/shipments/AGRI-DEMO-101/risk")
    print(f"\n2. Scenario 1 (AGRI-DEMO-101 - Normal Transit):")
    print(f"   - Risk Score: {risk_1.get('risk_score')}/100")
    print(f"   - Risk Level: {risk_1.get('risk_level')}")
    assert risk_1.get("risk_level") == "NORMAL", f"Expected NORMAL, got {risk_1.get('risk_level')}"
    
    # 3. Verify Scenario 2 (AGRI-DEMO-102) Risk = HIGH/CRITICAL
    risk_2 = api_get("/shipments/AGRI-DEMO-102/risk")
    print(f"\n3. Scenario 2 (AGRI-DEMO-102 - Temp Excursion):")
    print(f"   - Risk Score: {risk_2.get('risk_score')}/100")
    print(f"   - Risk Level: {risk_2.get('risk_level')}")
    print(f"   - Reasons: {risk_2.get('risk_reasons')}")
    assert risk_2.get("risk_level") in ["HIGH", "CRITICAL"], f"Expected HIGH/CRITICAL, got {risk_2.get('risk_level')}"
    
    # 4. Verify Scenario 3 (AGRI-DEMO-103) Risk = CRITICAL
    risk_3 = api_get("/shipments/AGRI-DEMO-103/risk")
    print(f"\n4. Scenario 3 (AGRI-DEMO-103 - Reefer Off & Door Open):")
    print(f"   - Risk Score: {risk_3.get('risk_score')}/100")
    print(f"   - Risk Level: {risk_3.get('risk_level')}")
    print(f"   - Reasons: {risk_3.get('risk_reasons')}")
    assert risk_3.get("risk_level") in ["HIGH", "CRITICAL"], f"Expected HIGH/CRITICAL, got {risk_3.get('risk_level')}"
    
    # 5. Verify Scenario 4 (AGRI-DEMO-104) Comparison = NO_SIGNIFICANT_DISCREPANCY
    comp_4 = api_get("/shipments/AGRI-DEMO-104/comparison")
    print(f"\n5. Scenario 4 (AGRI-DEMO-104 - Successfully Received):")
    print(f"   - Dispatched: {comp_4['dispatched']['total_quantity']} kg")
    print(f"   - Received: {comp_4['received']['total_quantity']} kg")
    print(f"   - Difference: {comp_4['differences']['total_quantity_difference']} kg")
    print(f"   - Verdict: {comp_4['comparison_status']}")
    assert comp_4['comparison_status'] == "NO_SIGNIFICANT_DISCREPANCY"
    assert comp_4['differences']['total_quantity_difference'] == 0.0
    
    # 6. Verify Scenario 5 (AGRI-DEMO-105) Discrepancy & Investigation
    comp_5 = api_get("/shipments/AGRI-DEMO-105/comparison")
    print(f"\n6. Scenario 5 (AGRI-DEMO-105 - Discrepancy & Investigation):")
    print(f"   - Dispatched: {comp_5['dispatched']['total_quantity']} kg")
    print(f"   - Received: {comp_5['received']['total_quantity']} kg")
    print(f"   - Difference: {comp_5['differences']['total_quantity_difference']} kg")
    print(f"   - Damaged: {comp_5['differences']['damaged_quantity']} kg")
    print(f"   - Comparison Status: {comp_5['comparison_status']}")
    print(f"   - Linked Incident ID: {comp_5.get('incident', {}).get('incident_id')}")
    assert comp_5['comparison_status'] == "QUANTITY_AND_QUALITY_DISCREPANCY"
    
    inc_id = comp_5['incident']['incident_id']
    inv_5 = api_get(f"/incidents/{inc_id}/investigation")
    timeline_events = inv_5.get('unified_timeline', {}).get('events', [])
    print(f"   - Investigation Dossier Timeline Events: {len(timeline_events)}")
    print(f"   - Summary: {inv_5.get('incident', {}).get('summary')}")
    assert len(timeline_events) > 0
    
    # 7. Verify QR & Verification for Demo Shipments
    ver_1 = api_get("/verify/AGRI-DEMO-101")
    print(f"\n7. Public QR Verification (/verify/AGRI-DEMO-101):")
    print(f"   - Verified Shipment ID: {ver_1['shipment_id']}")
    print(f"   - Verified Product: {ver_1['product_name']}")
    print(f"   - Verified Baseline Qty: {ver_1['total_quantity']} kg")
    print(f"   - Verification Status: {ver_1['verification_status']}")
    assert ver_1['total_quantity'] == 1200.0
    assert ver_1['verification_status'] == "VERIFIED"

    print("\n======================================================================")
    print("ALL 5 PHASE 11 DEMO SCENARIOS SEEDED & VERIFIED WITH 100% SUCCESS!")
    print("======================================================================")

if __name__ == "__main__":
    setup_demo_vehicles()
    clean_previous_demo_data()
    seed_scenario_1_normal()
    seed_scenario_2_temperature_excursion()
    seed_scenario_3_reefer_door_event()
    seed_scenario_4_successfully_received()
    seed_scenario_5_discrepancy_investigation()
    verify_all_scenarios()
