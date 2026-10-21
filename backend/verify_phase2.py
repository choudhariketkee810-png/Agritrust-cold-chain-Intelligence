import requests
import psycopg2
import time
import json

API_BASE = "http://127.0.0.1:8000"

def run_phase2_verification():
    print("=" * 65)
    print("       AGRITRUST PHASE 2 API & WORKFLOW VERIFICATION")
    print("=" * 65)
    
    results = {}
    errors = []

    # 1. Verify FastAPI is responding
    try:
        r_root = requests.get(f"{API_BASE}/", timeout=3)
        assert r_root.status_code == 200
        results["1_fastapi_running"] = f"PASS (HTTP 200: {r_root.json().get('message')})"
        print(f"[OK] 1. FastAPI Root: {results['1_fastapi_running']}")
    except Exception as e:
        errors.append(f"1. FastAPI Root Error: {e}")
        print(f"[FAIL] 1. FastAPI Root: {e}")

    # 2. Verify GET /telemetry/latest
    try:
        r_tel = requests.get(f"{API_BASE}/telemetry/latest", timeout=3)
        assert r_tel.status_code == 200
        d_tel = r_tel.json()
        assert "data" in d_tel and len(d_tel["data"]) > 0
        latest_temp = d_tel["data"][0]["temperature"]
        results["2_telemetry_latest"] = f"PASS (HTTP 200, {d_tel['count']} records, latest temp: {latest_temp} C)"
        print(f"[OK] 2. GET /telemetry/latest: {results['2_telemetry_latest']}")
    except Exception as e:
        errors.append(f"2. GET /telemetry/latest Error: {e}")
        print(f"[FAIL] 2. GET /telemetry/latest: {e}")

    # 3. Verify POST /alerts/check
    try:
        r_chk = requests.post(f"{API_BASE}/alerts/check", timeout=3)
        assert r_chk.status_code == 200
        d_chk = r_chk.json()
        results["3_alerts_check"] = f"PASS (HTTP 200, status: {d_chk.get('status')}, message: {d_chk.get('message')})"
        print(f"[OK] 3. POST /alerts/check: {results['3_alerts_check']}")
    except Exception as e:
        errors.append(f"3. POST /alerts/check Error: {e}")
        print(f"[FAIL] 3. POST /alerts/check: {e}")

    # 4. Verify GET /shipments
    try:
        r_ships = requests.get(f"{API_BASE}/shipments", timeout=3)
        assert r_ships.status_code == 200
        d_ships = r_ships.json()
        results["4_shipments_list"] = f"PASS (HTTP 200, count: {d_ships.get('count')})"
        print(f"[OK] 4. GET /shipments: {results['4_shipments_list']}")
    except Exception as e:
        errors.append(f"4. GET /shipments Error: {e}")
        print(f"[FAIL] 4. GET /shipments: {e}")

    # 5. Verify GET /shipments/SHP-0001
    try:
        r_shp1 = requests.get(f"{API_BASE}/shipments/SHP-0001", timeout=3)
        assert r_shp1.status_code == 200
        d_shp1 = r_shp1.json()
        assert d_shp1["shipment_id"] == "SHP-0001"
        results["5_shipment_detail"] = f"PASS (HTTP 200, product: {d_shp1['product_name']}, vehicle: {d_shp1['vehicle']['vehicle_number']})"
        print(f"[OK] 5. GET /shipments/SHP-0001: {results['5_shipment_detail']}")
    except Exception as e:
        errors.append(f"5. GET /shipments/SHP-0001 Error: {e}")
        print(f"[FAIL] 5. GET /shipments/SHP-0001: {e}")

    # 6. Verify POST /shipments/{shipment_id}/handover & GET timeline
    try:
        handover_payload = {
            "actor_role": "DRIVER",
            "location": "Kasara Ghat Logistics Checkpoint",
            "event_description": "Driver handover and digital temp seal verified intact.",
            "event_type": "HANDOVER",
            "event_data": {"seal_intact": True, "driver_id": "DRV-102"}
        }
        r_ho = requests.post(f"{API_BASE}/shipments/SHP-0001/handover", json=handover_payload, timeout=3)
        assert r_ho.status_code == 201
        
        r_time = requests.get(f"{API_BASE}/shipments/SHP-0001/timeline", timeout=3)
        assert r_time.status_code == 200
        d_time = r_time.json()
        results["6_timeline"] = f"PASS (Handover POST HTTP 201, Timeline count: {d_time.get('count')} events)"
        print(f"[OK] 6. GET /shipments/SHP-0001/timeline: {results['6_timeline']}")
    except Exception as e:
        errors.append(f"6. Timeline Error: {e}")
        print(f"[FAIL] 6. Timeline: {e}")

    # 7. Verify GET /shipments/SHP-0001/evidence
    try:
        r_evi = requests.get(f"{API_BASE}/shipments/SHP-0001/evidence", timeout=3)
        assert r_evi.status_code == 200
        d_evi = r_evi.json()
        results["7_evidence"] = f"PASS (HTTP 200, evidence count: {d_evi.get('count')})"
        print(f"[OK] 7. GET /shipments/SHP-0001/evidence: {results['7_evidence']}")
    except Exception as e:
        errors.append(f"7. GET /shipments/SHP-0001/evidence Error: {e}")
        print(f"[FAIL] 7. GET /shipments/SHP-0001/evidence: {e}")

    # 8. Verify GET /shipments/SHP-0001/risk
    try:
        r_risk = requests.get(f"{API_BASE}/shipments/SHP-0001/risk", timeout=3)
        assert r_risk.status_code == 200
        d_risk = r_risk.json()
        assert "risk_level" in d_risk and "target_temperature_range" in d_risk
        results["8_risk"] = f"PASS (HTTP 200, Risk Level: {d_risk['risk_level']}, Target: {d_risk['target_temperature_range']['min']}C - {d_risk['target_temperature_range']['max']}C, Active Alerts: {d_risk['active_alerts_count']})"
        print(f"[OK] 8. GET /shipments/SHP-0001/risk: {results['8_risk']}")
    except Exception as e:
        errors.append(f"8. GET /shipments/SHP-0001/risk Error: {e}")
        print(f"[FAIL] 8. GET /shipments/SHP-0001/risk: {e}")

    # 9. Verify GET /incidents & GET /incidents/{id}
    try:
        r_inc = requests.get(f"{API_BASE}/incidents", timeout=3)
        assert r_inc.status_code == 200
        d_inc = r_inc.json()
        results["9_incidents"] = f"PASS (HTTP 200, count: {d_inc.get('count')})"
        print(f"[OK] 9. GET /incidents: {results['9_incidents']}")
        
        if d_inc.get("count", 0) > 0:
            first_id = d_inc["data"][0]["incident_id"]
            r_inc1 = requests.get(f"{API_BASE}/incidents/{first_id}", timeout=3)
            assert r_inc1.status_code == 200
            print(f"  [OK] GET /incidents/{first_id}: PASS (HTTP 200, Incident: {r_inc1.json().get('incident_type')})")
    except Exception as e:
        errors.append(f"9. GET /incidents Error: {e}")
        print(f"[FAIL] 9. GET /incidents: {e}")

    # 10. Verify Simulator Ingestion
    try:
        conn = psycopg2.connect(host="localhost", port=5432, database="ftl_cold_chain", user="postgres", password="1234")
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
        cnt1, time1 = cur.fetchone()
        time.sleep(6)
        cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
        cnt2, time2 = cur.fetchone()
        cur.close()
        conn.close()
        assert cnt2 > cnt1
        results["10_simulator_ingestion"] = f"PASS (Count increased from {cnt1} to {cnt2}, latest: {time2})"
        print(f"[OK] 10. Simulator Ingestion: {results['10_simulator_ingestion']}")
    except Exception as e:
        errors.append(f"10. Simulator Ingestion Error: {e}")
        print(f"[FAIL] 10. Simulator Ingestion: {e}")

    # 11. Test 404 error handling for non-existent shipment
    try:
        r_404 = requests.get(f"{API_BASE}/shipments/NON_EXISTENT_SHP", timeout=3)
        assert r_404.status_code == 404
        print(f"[OK] 11. 404 Validation Handling: PASS (HTTP 404 for invalid ID: {r_404.json().get('detail')})")
    except Exception as e:
        errors.append(f"11. 404 Validation Error: {e}")
        print(f"[FAIL] 11. 404 Validation: {e}")

    print("=" * 65)
    print("TOTAL CHECKS EXECUTED: 11")
    print(f"PASSED: {len(results) + 1}")
    print(f"FAILED: {len(errors)}")
    print("=" * 65)

if __name__ == "__main__":
    run_phase2_verification()
