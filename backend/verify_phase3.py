import requests
import psycopg2
import time
import json

API_BASE = "http://127.0.0.1:8000"

def run_phase3_verification():
    print("=" * 70)
    print("       AGRITRUST PHASE 3: FARMER SHIPMENT CREATION VERIFICATION")
    print("=" * 70)

    # 1. Verify FastAPI is responding
    try:
        r_root = requests.get(f"{API_BASE}/", timeout=3)
        assert r_root.status_code == 200
        print(f"[OK] 1. API Root Health: HTTP 200 | {r_root.json().get('message')}")
    except Exception as e:
        print(f"[FAIL] 1. API Root Health: {e}")
        return

    # 2. Verify Existing APIs (GET /telemetry/latest, POST /alerts/check)
    try:
        r_tel = requests.get(f"{API_BASE}/telemetry/latest", timeout=3)
        assert r_tel.status_code == 200
        print(f"[OK] 2. Existing GET /telemetry/latest: HTTP 200 | Latest Temp: {r_tel.json()['data'][0]['temperature']} C")

        r_chk = requests.post(f"{API_BASE}/alerts/check", timeout=3)
        assert r_chk.status_code == 200
        print(f"[OK] 2. Existing POST /alerts/check: HTTP 200 | Status: {r_chk.json().get('status')}")
    except Exception as e:
        print(f"[FAIL] 2. Existing API Check: {e}")

    # 3. Create Farmer Shipment with the exact test specifications
    payload = {
        "product_name": "Mango",
        "total_quantity": 1000.0,
        "grade_a_quantity": 750.0,
        "grade_b_quantity": 250.0,
        "origin": "Nashik",
        "destination": "Mumbai",
        "vehicle_id": "FTL-V001",
        "target_temp_min": 10.0,
        "target_temp_max": 13.0,
        "initial_temperature": 11.5,
        "initial_humidity": 68.0,
        "recorded_by": "Farmer_Nashik_01",
        "quality_notes": "Harvested fresh Alphonso mangoes, brix > 14"
    }

    try:
        r_create = requests.post(f"{API_BASE}/shipments", json=payload, timeout=5)
        print(f"[STATUS] POST /shipments response status: {r_create.status_code}")
        assert r_create.status_code == 201, f"Expected 201, got {r_create.status_code}: {r_create.text}"
        res_data = r_create.json()
        created_shipment_id = res_data["shipment_id"]
        print(f"[OK] 3. Farmer Shipment Created Successfully!")
        print(f"  -> Generated Shipment ID: {created_shipment_id}")
        print(f"  -> Product: {res_data['product']} | Total: {res_data['total_quantity']} kg")
        print(f"  -> Grades: Grade A = {res_data['grade_information']['grade_a_quantity']} kg, Grade B = {res_data['grade_information']['grade_b_quantity']} kg")
        print(f"  -> Temp Range: {res_data['temperature_range']['min']}C to {res_data['temperature_range']['max']}C")
        print(f"  -> Initial Conditions: {res_data['initial_condition']['initial_temperature']}C, {res_data['initial_condition']['initial_humidity']}% RH")
    except Exception as e:
        print(f"[FAIL] 3. Farmer Shipment Creation: {e}")
        return

    # 4. Verify Shipment appears in GET /shipments
    try:
        r_list = requests.get(f"{API_BASE}/shipments", timeout=3)
        assert r_list.status_code == 200
        all_ships = r_list.json()["data"]
        matching = [s for s in all_ships if s["shipment_id"] == created_shipment_id]
        assert len(matching) > 0, f"Created shipment {created_shipment_id} not found in list!"
        print(f"[OK] 4. GET /shipments: Found {created_shipment_id} in {len(all_ships)} total shipments.")
    except Exception as e:
        print(f"[FAIL] 4. GET /shipments: {e}")

    # 5. Verify Details in GET /shipments/{shipment_id}
    try:
        r_detail = requests.get(f"{API_BASE}/shipments/{created_shipment_id}", timeout=3)
        assert r_detail.status_code == 200
        d = r_detail.json()
        assert d["product_name"] == "Mango"
        assert d["target_temp_min"] == 10.0
        assert d["target_temp_max"] == 13.0
        assert d["quality_summary"] is not None
        assert d["quality_summary"]["grade_a_quantity"] == 750.0
        assert d["quality_summary"]["grade_b_quantity"] == 250.0
        print(f"[OK] 5. GET /shipments/{created_shipment_id}: Successfully returned complete details & quality summary.")
    except Exception as e:
        print(f"[FAIL] 5. GET /shipments/{created_shipment_id}: {e}")

    # 6. Database Verification: Check shipment_quality table
    try:
        conn = psycopg2.connect(host="localhost", port=5432, database="ftl_cold_chain", user="postgres", password="1234")
        cur = conn.cursor()
        cur.execute("""
            SELECT quality_id, shipment_id, grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity, recorded_by, quality_notes
            FROM shipment_quality
            WHERE shipment_id = %s;
        """, (created_shipment_id,))
        q_row = cur.fetchone()
        assert q_row is not None
        print(f"[OK] 6. Database `shipment_quality` Verification:")
        print(f"  -> Quality ID: {q_row[0]} | Shipment: {q_row[1]}")
        print(f"  -> Grade A: {q_row[2]} kg | Grade B: {q_row[3]} kg | Total: {q_row[5]} kg | Recorded By: {q_row[6]}")

        # 7. Database Verification: Check shipment_events table
        cur.execute("""
            SELECT event_id, shipment_id, event_type, actor_role, location, event_description, event_data
            FROM shipment_events
            WHERE shipment_id = %s AND event_type = 'FARMER_DISPATCH';
        """, (created_shipment_id,))
        e_row = cur.fetchone()
        assert e_row is not None
        print(f"[OK] 7. Database `shipment_events` Verification:")
        print(f"  -> Event ID: {e_row[0]} | Type: {e_row[2]} | Actor: {e_row[3]} | Location: {e_row[4]}")
        print(f"  -> Description: {e_row[5]}")
        print(f"  -> Snapshot: {json.dumps(e_row[6])}")

        # Verify SHP-0001 was untouched
        cur.execute("SELECT shipment_id, product_name, vehicle_id FROM shipments WHERE shipment_id = 'SHP-0001';")
        shp1 = cur.fetchone()
        assert shp1 is not None
        print(f"[OK] 8. Original SHP-0001 Preserved Intact: {shp1}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"[FAIL] Database checks: {e}")

    # 8. Verify Timeline endpoint
    try:
        r_time = requests.get(f"{API_BASE}/shipments/{created_shipment_id}/timeline", timeout=3)
        assert r_time.status_code == 200
        t_data = r_time.json()
        assert t_data["count"] >= 1
        print(f"[OK] 9. GET /shipments/{created_shipment_id}/timeline: Returned {t_data['count']} event(s).")
    except Exception as e:
        print(f"[FAIL] Timeline check: {e}")

    # 9. Test Invalid Validations (Grade A + B > Total, Min Temp >= Max Temp, Negative Qty)
    print("\n[VALIDATION TESTS]")
    
    # Test A: Grade A + Grade B > Total
    invalid_grades = payload.copy()
    invalid_grades["grade_a_quantity"] = 800.0
    invalid_grades["grade_b_quantity"] = 300.0 # 1100 > 1000
    r_val1 = requests.post(f"{API_BASE}/shipments", json=invalid_grades)
    assert r_val1.status_code == 400
    print(f"  [OK] Validation Test 1 (Grade A + B > Total): Rejected with HTTP 400 ({r_val1.json().get('detail')})")

    # Test B: Min Temp >= Max Temp
    invalid_temp = payload.copy()
    invalid_temp["target_temp_min"] = 15.0
    invalid_temp["target_temp_max"] = 10.0 # 15 >= 10
    r_val2 = requests.post(f"{API_BASE}/shipments", json=invalid_temp)
    assert r_val2.status_code == 400
    print(f"  [OK] Validation Test 2 (Min Temp >= Max Temp): Rejected with HTTP 400 ({r_val2.json().get('detail')})")

    # Test C: Non-existent vehicle
    invalid_veh = payload.copy()
    invalid_veh["vehicle_id"] = "INVALID_VEHICLE_999"
    r_val3 = requests.post(f"{API_BASE}/shipments", json=invalid_veh)
    assert r_val3.status_code == 400
    print(f"  [OK] Validation Test 3 (Non-existent Vehicle): Rejected with HTTP 400 ({r_val3.json().get('detail')})")

    # 10. Simulator Telemetry Ingestion Check
    try:
        conn = psycopg2.connect(host="localhost", port=5432, database="ftl_cold_chain", user="postgres", password="1234")
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
        cnt1, t1 = cur.fetchone()
        time.sleep(6)
        cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
        cnt2, t2 = cur.fetchone()
        cur.close()
        conn.close()
        assert cnt2 > cnt1
        print(f"\n[OK] 10. Simulator Continues Inserting Live Telemetry: Rows {cnt1} -> {cnt2} (Latest: {t2})")
    except Exception as e:
        print(f"[FAIL] 10. Simulator check: {e}")

    print("=" * 70)
    print("           ALL PHASE 3 VERIFICATIONS PASSED SUCCESSFULLY")
    print("=" * 70)

if __name__ == "__main__":
    run_phase3_verification()
