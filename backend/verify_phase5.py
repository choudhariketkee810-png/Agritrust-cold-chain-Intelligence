import requests
import psycopg2
import time
import json

API_BASE = "http://127.0.0.1:8000"

def run_phase5_verification():
    print("=" * 70)
    print("       AGRITRUST PHASE 5: LOGISTICS HANDOVER & CUSTODY SUITE")
    print("=" * 70)

    # 1. Perform Farmer -> Logistics Handover on AGRI-1001
    handover_payload = {
        "logistics_receiver": "Logistics Operator",
        "actor_role": "LOGISTICS",
        "location": "Nashik Farm Gate",
        "vehicle_id": "FTL-V001",
        "handover_temperature": 11.8,
        "handover_humidity": 68.0,
        "handover_quantity": 1000.0,
        "notes": "Shipment handed over for refrigerated transport."
    }

    try:
        r_ho = requests.post(f"{API_BASE}/shipments/AGRI-1001/handover", json=handover_payload, timeout=5)
        assert r_ho.status_code == 201, f"Expected 201, got {r_ho.status_code}: {r_ho.text}"
        ho_data = r_ho.json()
        print(f"[OK] 1. POST /shipments/AGRI-1001/handover Succeeded (HTTP 201)")
        print(f"  -> Event ID: {ho_data['event_id']}")
        print(f"  -> Event Type: {ho_data['event_type']}")
        print(f"  -> Receiver: {ho_data['logistics_receiver']} | Location: {ho_data['location']}")
        print(f"  -> Vehicle: {ho_data['vehicle']['vehicle_id']} ({ho_data['vehicle']['vehicle_number']})")
        print(f"  -> Shipment Status: {ho_data['shipment_status']}")
        print(f"  -> Timestamp: {ho_data['handover_timestamp']}")
    except Exception as e:
        print(f"[FAIL] 1. Handover POST Error: {e}")
        return

    # 2. Database Verification: Check shipment_events table
    try:
        conn = psycopg2.connect(host="localhost", port=5432, database="ftl_cold_chain", user="postgres", password="1234")
        cur = conn.cursor()
        cur.execute("""
            SELECT event_id, shipment_id, event_type, actor_role, location, event_description, event_data, event_timestamp
            FROM shipment_events
            WHERE shipment_id = 'AGRI-1001' AND event_type = 'FARMER_TO_LOGISTICS_HANDOVER';
        """,)
        e_row = cur.fetchone()
        assert e_row is not None
        print(f"[OK] 2. Database `shipment_events` Record Verified:")
        print(f"  -> Event ID: {e_row[0]} | Type: {e_row[2]} | Actor: {e_row[3]} | Loc: {e_row[4]}")
        print(f"  -> Description: {e_row[5]}")
        print(f"  -> Event Snapshot JSON: {json.dumps(e_row[6])}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[FAIL] 2. DB Event check: {e}")
        return

    # 3. Verify Chronological Timeline: GET /shipments/AGRI-1001/timeline
    try:
        r_time = requests.get(f"{API_BASE}/shipments/AGRI-1001/timeline", timeout=3)
        assert r_time.status_code == 200
        t_data = r_time.json()
        events = t_data["data"]
        assert len(events) >= 2
        print(f"[OK] 3. GET /shipments/AGRI-1001/timeline Verified ({len(events)} events):")
        for idx, ev in enumerate(events, 1):
            print(f"  {idx}. [{ev['event_timestamp']}] {ev['event_type']} | Actor: {ev['actor_role']} | Loc: {ev['location']}")
            print(f"     \"{ev['event_description']}\"")
        
        # Verify sequence: first event FARMER_DISPATCH, second FARMER_TO_LOGISTICS_HANDOVER
        assert events[0]["event_type"] == "FARMER_DISPATCH"
        assert events[1]["event_type"] == "FARMER_TO_LOGISTICS_HANDOVER"
    except Exception as e:
        print(f"[FAIL] 3. Timeline check: {e}")
        return

    # 4. Verify Original Baseline Data Remains Unchanged
    try:
        conn = psycopg2.connect(host="localhost", port=5432, database="ftl_cold_chain", user="postgres", password="1234")
        cur = conn.cursor()
        cur.execute("""
            SELECT s.shipment_id, s.product_name, sq.grade_a_quantity, sq.grade_b_quantity, sq.total_quantity, sq.recorded_by
            FROM shipments s
            JOIN shipment_quality sq ON s.shipment_id = sq.shipment_id
            WHERE s.shipment_id = 'AGRI-1001';
        """)
        base_row = cur.fetchone()
        assert base_row is not None
        assert base_row[2] == 750.00 and base_row[3] == 250.00 and base_row[4] == 1000.00 and base_row[5] == "Farmer_Nashik_01"
        print(f"[OK] 4. Immutable Baseline Integrity Check: Original quantities (Grade A: {base_row[2]} kg, Grade B: {base_row[3]} kg, Total: {base_row[4]} kg) unedited.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[FAIL] 4. Baseline Integrity check: {e}")
        return

    # 5. Verify Duplicate Handover Rejection
    try:
        r_dup = requests.post(f"{API_BASE}/shipments/AGRI-1001/handover", json=handover_payload, timeout=3)
        assert r_dup.status_code == 400
        print(f"[OK] 5. Duplicate Handover Prevention: Correctly rejected with HTTP 400 ({r_dup.json().get('detail')})")
    except Exception as e:
        print(f"[FAIL] 5. Duplicate Handover Prevention: {e}")
        return

    # 6. Verify 404 on Invalid Shipment ID
    try:
        r_404 = requests.post(f"{API_BASE}/shipments/NON_EXISTENT_SHP_999/handover", json=handover_payload, timeout=3)
        assert r_404.status_code == 404
        print(f"[OK] 6. Invalid Shipment 404 Check: Correctly rejected with HTTP 404 ({r_404.json().get('detail')})")
    except Exception as e:
        print(f"[FAIL] 6. 404 check: {e}")
        return

    # 7. Verify QR Verification Endpoint Still Works
    try:
        r_ver = requests.get(f"{API_BASE}/verify/AGRI-1001", timeout=3)
        assert r_ver.status_code == 200
        v_data = r_ver.json()
        assert v_data["verification_status"] == "VERIFIED"
        print(f"[OK] 7. GET /verify/AGRI-1001: Verified intact | Status: {v_data['verification_status']}")
    except Exception as e:
        print(f"[FAIL] 7. QR Verification check: {e}")
        return

    # 8. Verify GET /telemetry/latest & POST /alerts/check
    try:
        r_tel = requests.get(f"{API_BASE}/telemetry/latest", timeout=3)
        assert r_tel.status_code == 200
        print(f"[OK] 8. GET /telemetry/latest: HTTP 200 | Latest Temp: {r_tel.json()['data'][0]['temperature']} C")

        r_chk = requests.post(f"{API_BASE}/alerts/check", timeout=3)
        assert r_chk.status_code == 200
        print(f"[OK] 8. POST /alerts/check: HTTP 200 | Status: {r_chk.json().get('status')}")
    except Exception as e:
        print(f"[FAIL] 8. Telemetry and Alerts APIs: {e}")
        return

    # 9. Verify Simulator Telemetry Ingestion Continuity
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
        print(f"[OK] 9. Sensor Simulator Active: Rows {cnt1} -> {cnt2} (Latest: {t2})")
    except Exception as e:
        print(f"[FAIL] 9. Simulator Ingestion: {e}")
        return

    print("=" * 70)
    print("           ALL PHASE 5 VERIFICATIONS PASSED SUCCESSFULLY")
    print("=" * 70)

if __name__ == "__main__":
    run_phase5_verification()
