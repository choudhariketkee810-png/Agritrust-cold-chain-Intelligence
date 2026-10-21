import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("=" * 60)
    print("PHASE 6: AGRITRUST LIVE MONITORING & RISK ENGINE VERIFICATION")
    print("=" * 60)

    # 1. Verify Core Endpoints
    print("\n1. Testing Core Endpoints Preservation...")
    r = requests.get(f"{BASE_URL}/")
    assert r.status_code == 200, f"Root failed: {r.status_code}"
    print(f"   [PASS] GET / -> {r.json()['message']}")

    r = requests.get(f"{BASE_URL}/telemetry/latest")
    assert r.status_code == 200, f"Telemetry failed: {r.status_code}"
    print(f"   [PASS] GET /telemetry/latest -> {r.json()['count']} recent records")

    r = requests.post(f"{BASE_URL}/alerts/check")
    assert r.status_code == 200, f"Alert check failed: {r.status_code}"
    print(f"   [PASS] POST /alerts/check -> status: {r.json().get('status')}")

    r = requests.get(f"{BASE_URL}/shipments")
    assert r.status_code == 200, f"Shipments failed: {r.status_code}"
    shipments = r.json()["data"]
    print(f"   [PASS] GET /shipments -> {len(shipments)} shipments listed")

    # 2. Test GET /shipments/{shipment_id}/risk
    print("\n2. Testing GET /shipments/{shipment_id}/risk...")
    test_id = "SHP-0001"
    r = requests.get(f"{BASE_URL}/shipments/{test_id}/risk")
    assert r.status_code == 200, f"Risk query failed: {r.status_code}, {r.text}"
    risk_data = r.json()
    print(f"   Shipment ID: {risk_data['shipment_id']}")
    print(f"   Risk Level: {risk_data['risk_level']} (Score: {risk_data['risk_score']}/100)")
    print(f"   Latest Temp: {risk_data['latest_temperature']}°C (Target: {risk_data['target_min']}°C - {risk_data['target_max']}°C)")
    print(f"   Refrigeration: {risk_data['refrigeration_status']}, Door: {risk_data['door_status']}")
    print(f"   Location: {risk_data['latest_location']}")
    print(f"   Active Alerts: {risk_data['active_alerts_count']}")
    print(f"   Reasons: {risk_data['risk_reasons']}")
    print(f"   Recommended Actions: {risk_data['recommended_actions']}")
    print("   [PASS] Single shipment risk analysis verified.")

    # 3. Test GET /monitoring/shipments
    print("\n3. Testing GET /monitoring/shipments (Fleet Overview)...")
    r = requests.get(f"{BASE_URL}/monitoring/shipments")
    assert r.status_code == 200, f"Monitoring failed: {r.status_code}, {r.text}"
    mon_data = r.json()
    print(f"   [PASS] Active Monitored Shipments: {mon_data['count']}")
    for card in mon_data['data'][:2]:
        print(f"     - Shipment: {card['shipment_id']} | Product: {card['product']} | Risk: {card['risk_level']} ({card['risk_score']}) | Temp: {card['current_temperature']}°C")

    # 4. Scenario Testing using Rule-Engine Unit Simulation
    print("\n4. Testing Rule Engine Simulation across Cold-Chain Scenarios...")
    from backend.main import evaluate_cold_chain_risk
    from datetime import datetime, timedelta

    now = datetime.now()

    # Scenario A: NORMAL
    normal_telemetry = [
        {"temperature": 11.5, "humidity": 65.0, "door_status": "CLOSED", "refrigeration_status": "ON", "latitude": 19.99, "longitude": 73.78, "recorded_at": (now - timedelta(seconds=i*5)).isoformat()}
        for i in range(5)
    ]
    res_normal = evaluate_cold_chain_risk("TEST-NORMAL", 10.0, 13.0, normal_telemetry, [])
    print(f"   Scenario A (NORMAL): Temp 11.5°C -> Level: {res_normal['risk_level']}, Score: {res_normal['risk_score']}")
    assert res_normal['risk_level'] == "NORMAL", f"Expected NORMAL, got {res_normal['risk_level']}"
    assert res_normal['risk_score'] == 0

    # Scenario B: HIGH TEMPERATURE (Moderate Excursion)
    high_temp_telemetry = [
        {"temperature": 14.2, "humidity": 65.0, "door_status": "CLOSED", "refrigeration_status": "ON", "latitude": 19.99, "longitude": 73.78, "recorded_at": (now - timedelta(seconds=i*5)).isoformat()}
        for i in range(5)
    ]
    res_high = evaluate_cold_chain_risk("TEST-HIGH", 10.0, 13.0, high_temp_telemetry, [])
    print(f"   Scenario B (HIGH TEMP): Temp 14.2°C -> Level: {res_high['risk_level']}, Score: {res_high['risk_score']}")
    assert res_high['risk_level'] in ["WARNING", "HIGH"]
    assert any("excursion" in r.lower() for r in res_high['risk_reasons'])

    # Scenario C: CRITICAL EXCURSION (Severe + Prolonged + Reefer OFF)
    critical_telemetry = [
        {"temperature": 17.5, "humidity": 75.0, "door_status": "CLOSED", "refrigeration_status": "OFF", "latitude": 19.99, "longitude": 73.78, "recorded_at": (now - timedelta(seconds=i*60)).isoformat()}
        for i in range(10)
    ]
    res_crit = evaluate_cold_chain_risk("TEST-CRIT", 10.0, 13.0, critical_telemetry, [{"alert_id": 1, "alert_type": "HIGH_TEMPERATURE", "severity": "CRITICAL"}])
    print(f"   Scenario C (CRITICAL EXCURSION): Temp 17.5°C, Reefer OFF, 10 min -> Level: {res_crit['risk_level']}, Score: {res_crit['risk_score']}")
    assert res_crit['risk_level'] == "CRITICAL"
    assert res_crit['risk_score'] >= 75
    assert any("Compound risk" in r or "Refrigeration" in r for r in res_crit['risk_reasons'])

    # Scenario D: RECOVERY (Temperature returns to safe zone)
    recovery_telemetry = [
        {"temperature": 12.0, "humidity": 66.0, "door_status": "CLOSED", "refrigeration_status": "ON", "latitude": 19.99, "longitude": 73.78, "recorded_at": (now - timedelta(seconds=i*5)).isoformat()}
        for i in range(5)
    ]
    res_rec = evaluate_cold_chain_risk("TEST-REC", 10.0, 13.0, recovery_telemetry, [])
    print(f"   Scenario D (RECOVERY): Temp returned to 12.0°C -> Level: {res_rec['risk_level']}, Score: {res_rec['risk_score']}")
    assert res_rec['risk_level'] == "NORMAL"
    assert res_rec['risk_score'] == 0

    # Scenario E: DOOR OPEN Event
    door_telemetry = [
        {"temperature": 12.2, "humidity": 67.0, "door_status": "OPEN", "refrigeration_status": "ON", "latitude": 19.99, "longitude": 73.78, "recorded_at": (now - timedelta(seconds=i*5)).isoformat()}
        for i in range(5)
    ]
    res_door = evaluate_cold_chain_risk("TEST-DOOR", 10.0, 13.0, door_telemetry, [])
    print(f"   Scenario E (DOOR OPEN): Door OPEN at 12.2°C -> Level: {res_door['risk_level']}, Score: {res_door['risk_score']}")
    assert any("door" in r.lower() for r in res_door['risk_reasons'])
    assert any("door" in a.lower() for a in res_door['recommended_actions'])

    # Scenario F: REFRIGERATION OFF Event
    reefer_telemetry = [
        {"temperature": 12.5, "humidity": 65.0, "door_status": "CLOSED", "refrigeration_status": "OFF", "latitude": 19.99, "longitude": 73.78, "recorded_at": (now - timedelta(seconds=i*5)).isoformat()}
        for i in range(5)
    ]
    res_reefer = evaluate_cold_chain_risk("TEST-REEFER", 10.0, 13.0, reefer_telemetry, [])
    print(f"   Scenario F (REEFER OFF): Reefer OFF -> Level: {res_reefer['risk_level']}, Score: {res_reefer['risk_score']}")
    assert res_reefer['risk_score'] >= 30
    assert any("refrigeration" in r.lower() for r in res_reefer['risk_reasons'])

    # 5. Verify Previous Phase Endpoints (Verification, QR, Timeline, Incidents)
    print("\n5. Verifying Verification, QR, Timeline, Incidents Endpoints...")
    r = requests.get(f"{BASE_URL}/verify/AGRI-1001")
    assert r.status_code == 200, f"Verify AGRI-1001 failed: {r.status_code}"
    print(f"   [PASS] GET /verify/AGRI-1001 -> status: {r.json()['verification_status']}")

    r = requests.get(f"{BASE_URL}/shipments/AGRI-1001/qr")
    assert r.status_code == 200, f"QR AGRI-1001 failed: {r.status_code}"
    assert r.headers.get("content-type") == "image/png"
    print(f"   [PASS] GET /shipments/AGRI-1001/qr -> {len(r.content)} bytes PNG image")

    r = requests.get(f"{BASE_URL}/shipments/AGRI-1001/timeline")
    assert r.status_code == 200, f"Timeline AGRI-1001 failed: {r.status_code}"
    print(f"   [PASS] GET /shipments/AGRI-1001/timeline -> {r.json()['count']} chronological events")

    r = requests.get(f"{BASE_URL}/incidents")
    assert r.status_code == 200, f"Incidents failed: {r.status_code}"
    print(f"   [PASS] GET /incidents -> {r.json()['count']} incidents")

    print("\n" + "=" * 60)
    print("ALL PHASE 6 RISK ENGINE & LIVE MONITORING TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_api()
