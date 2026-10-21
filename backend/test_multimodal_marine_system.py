"""
AGRITrust — Comprehensive Multimodal Marine & Loss Prevention Test Suite
Validates all 23 prompt criteria, tracking provider abstraction,
loss prevention forensic engine, reefer monitoring, and simulator step progression.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 80)
    print(" AGRITRUST — MULTIMODAL MARINE INTELLIGENCE & LOSS PREVENTION TEST SUITE")
    print("=" * 80)
    passed = 0
    failed = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  [PASS] {name} {details}")
        else:
            failed += 1
            print(f"  [FAIL] {name} {details}")

    # 1. Marine Dashboard KPIs
    r = requests.get(f"{BASE_URL}/marine/dashboard/kpis")
    assert_test("1. GET /marine/dashboard/kpis", r.status_code == 200, f"(Status: {r.status_code})")
    kpis = r.json()
    assert_test("   - Active shipments count >= 5", kpis.get("active_marine_shipments", 0) >= 5, f"({kpis.get('active_marine_shipments')})")
    assert_test("   - Containers at sea tracked", "containers_at_sea" in kpis)
    assert_test("   - Data source notice present", kpis.get("data_notice") == "DEMO / SIMULATED DATA")

    # 2. Nautical Corridors & Waypoints
    r = requests.get(f"{BASE_URL}/marine/waypoints")
    assert_test("2. GET /marine/waypoints", r.status_code == 200 and r.json().get("count", 0) >= 15)

    # 3. Multimodal Shipments List
    r = requests.get(f"{BASE_URL}/marine/shipments")
    assert_test("3. GET /marine/shipments", r.status_code == 200 and len(r.json().get("data", [])) >= 5)

    # 4. Containers List
    r = requests.get(f"{BASE_URL}/marine/containers")
    assert_test("4. GET /marine/containers", r.status_code == 200 and len(r.json().get("data", [])) >= 5)

    # 5. Root & Marine Container Location Endpoints
    r1 = requests.get(f"{BASE_URL}/marine/containers/MSKU1234567/location")
    r2 = requests.get(f"{BASE_URL}/containers/MSKU1234567/location")
    assert_test("5. GET /marine/containers/MSKU1234567/location", r1.status_code == 200)
    assert_test("   Root alias GET /containers/MSKU1234567/location", r2.status_code == 200)
    loc = r1.json()
    assert_test("   - Container ID matched", loc.get("container_id") == "MSKU1234567")
    assert_test("   - Vessel Name matched", loc.get("current_vessel_name") == "MV AGRI STAR")
    assert_test("   - Data source clearly labeled SIMULATED", loc.get("is_simulated") is True)
    assert_test("   - Last updated ticker present", "last_updated_minutes_ago" in loc)

    # 6. Container Location History
    r1 = requests.get(f"{BASE_URL}/marine/containers/MSKU1234567/location-history")
    r2 = requests.get(f"{BASE_URL}/containers/MSKU1234567/location-history")
    assert_test("6. GET /marine/containers/MSKU1234567/location-history", r1.status_code == 200 and len(r1.json().get("trajectory", [])) > 0)
    assert_test("   Root alias GET /containers/MSKU1234567/location-history", r2.status_code == 200)

    # 7. Advance Simulation Step
    r = requests.post(f"{BASE_URL}/marine/containers/MSKU1234567/step?step_nmi=30.0")
    assert_test("7. POST /marine/containers/MSKU1234567/step (+30 nmi)", r.status_code == 200)
    step_res = r.json()
    assert_test("   - Simulation progression logged", step_res.get("status") == "SUCCESS")

    # 8. Tracking Provider Metadata & Mode Toggle
    r = requests.get(f"{BASE_URL}/marine/tracking-provider/metadata")
    assert_test("8. GET /marine/tracking-provider/metadata", r.status_code == 200 and r.json().get("api_ready") is True)

    # 9. Reefer Monitoring & Container Detail (Scenario 2: Temp Excursion CMAU8492019)
    r = requests.get(f"{BASE_URL}/marine/containers/CMAU8492019")
    assert_test("9. GET /marine/containers/CMAU8492019 (Excursion Scenario)", r.status_code == 200)
    c_detail = r.json()
    assert_test("   - Route risk score calculated", "route_risk" in c_detail and c_detail["route_risk"]["risk_score"] > 0)
    assert_test("   - Reefer health score evaluated", "reefer_health" in c_detail)
    assert_test("   - Sensor trust score evaluated", "sensor_trust" in c_detail)

    # 10. Shelf-Life Survival Predictor & Sell Before Spoilage (Scenario 5: ONEU9284102)
    r = requests.get(f"{BASE_URL}/marine/containers/ONEU9284102")
    assert_test("10. GET /marine/containers/ONEU9284102 (Shelf-Life & Sell Before Spoilage)", r.status_code == 200)
    c_shelf = r.json()
    assert_test("    - Shelf life engine calculated", "shelf_life_intelligence" in c_shelf)
    assert_test("    - Sell Before Spoilage allocations present", len(c_shelf.get("sell_before_spoilage", {}).get("allocated_destinations", [])) > 0)

    # 11. Multimodal Loss Prevention & Investigation Engine (Scenario 4: MEDU7719203 / AGRI-SHP-9905)
    r = requests.get(f"{BASE_URL}/marine/shipments/AGRI-SHP-9905/investigation")
    assert_test("11. GET /marine/shipments/AGRI-SHP-9905/investigation (Loss Investigation)", r.status_code == 200)
    inv = r.json()
    assert_test("    - Multi-stage journey milestones reconstructed", len(inv.get("journey_stages", [])) >= 7)
    assert_test("    - First detected anomaly identified", inv.get("investigation_result", {}).get("first_detected_anomaly") is not None)
    assert_test("    - Neutral AI investigation summary generated", "neutral_investigation_summary" in inv.get("investigation_result", {}))
    assert_test("    - Neutral disclaimer included", "standard_disclaimer" in inv.get("investigation_result", {}))

    # 12. AI What-If Counterfactual Simulator
    payload = {
        "container_id": "MEDU7719203",
        "shipment_id": "AGRI-SHP-9905",
        "simulation_type": "ALTERNATIVE_PORT",
        "simulation_params": {"target_port": "Port of Salalah / Jebel Ali Hub"}
    }
    r = requests.post(f"{BASE_URL}/marine/what-if", json=payload)
    assert_test("12. POST /marine/what-if (AI What-If Simulator)", r.status_code == 200)
    sim_res = r.json()
    assert_test("    - Side by side current vs simulated plan", "current_plan" in sim_res and "simulated_plan" in sim_res)
    assert_test("    - Potential financial loss improvement calculated", "potential_improvement_inr" in sim_res)

    # 13. Black Box Event Ingestion
    event_payload = {
        "event_type": "REEFER_TELEMETRY_LOG",
        "location_name": "Red Sea Navigational Channel",
        "latitude": 20.5000,
        "longitude": 38.6000,
        "temperature": 4.1,
        "humidity": 75.0,
        "door_status": "CLOSED",
        "reefer_status": "ACTIVE_COOLING",
        "actor_role": "Carrier IoT Gateway",
        "notes": "Verified nominal telemetry sync."
    }
    r = requests.post(f"{BASE_URL}/marine/containers/MSKU1234567/events", json=event_payload)
    assert_test("13. POST /marine/containers/MSKU1234567/events", r.status_code == 200 and r.json().get("status") == "SUCCESS")

    # 14. Operational Road Endpoints (Preserve Existing Functionality)
    r = requests.get(f"{BASE_URL}/shipments")
    assert_test("14. Existing GET /shipments operational", r.status_code == 200)
    r = requests.get(f"{BASE_URL}/telemetry/latest")
    assert_test("    Existing GET /telemetry/latest operational", r.status_code == 200)
    r = requests.get(f"{BASE_URL}/alerts")
    assert_test("    Existing GET /alerts operational", r.status_code == 200)

    print("=" * 80)
    print(f" TOTAL TESTS RUN: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
