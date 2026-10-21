import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("=" * 70)
    print(" TESTING LIVE FASTAPI MARINE INTELLIGENCE ENDPOINTS")
    print("=" * 70)

    # 1. KPIs
    r = requests.get(f"{BASE_URL}/marine/dashboard/kpis")
    print(f"[OK] GET /marine/dashboard/kpis: {r.status_code}")
    print("     Payload:", r.json())
    assert r.status_code == 200

    # 2. Shipments
    r = requests.get(f"{BASE_URL}/marine/shipments")
    print(f"\n[OK] GET /marine/shipments: {r.status_code} | Count: {r.json()['count']}")
    assert r.status_code == 200

    # 3. Containers
    r = requests.get(f"{BASE_URL}/marine/containers")
    print(f"\n[OK] GET /marine/containers: {r.status_code} | Count: {r.json()['count']}")
    assert r.status_code == 200

    # 4. Container Detail (MEDU7719203)
    r = requests.get(f"{BASE_URL}/marine/containers/MEDU7719203")
    data = r.json()
    print(f"\n[OK] GET /marine/containers/MEDU7719203: {r.status_code}")
    print(f"     Route Risk: {data['route_risk']['risk_score']}/100 ({data['route_risk']['status']})")
    print(f"     Reefer Health: {data['reefer_health']['reefer_health_score']}/100 ({data['reefer_health']['status']})")
    print(f"     Shelf-Life Status: {data['shelf_life_intelligence']['safety_margin_status']}")
    print(f"     Potential Loss: INR {data['spoilage_cost']['potential_loss_inr']:,.2f}")
    assert r.status_code == 200

    # 5. Black Box
    r = requests.get(f"{BASE_URL}/marine/containers/MEDU7719203/black-box")
    print(f"\n[OK] GET /marine/containers/MEDU7719203/black-box: {r.status_code} | Events: {r.json()['count']}")
    assert r.status_code == 200

    # 6. Loss Investigation (AGRI-SHP-9905)
    r = requests.get(f"{BASE_URL}/marine/shipments/AGRI-SHP-9905/investigation")
    inv = r.json()
    print(f"\n[OK] GET /marine/shipments/AGRI-SHP-9905/investigation: {r.status_code}")
    print(f"     Status: {inv['investigation_result']['investigation_status']}")
    print(f"     First Anomaly: {inv['investigation_result']['first_detected_anomaly']['stage_name']}")
    print(f"     Neutral Summary: {inv['investigation_result']['neutral_investigation_summary'][:140]}...")
    assert r.status_code == 200

    # 7. AI What-If Simulation
    r = requests.post(f"{BASE_URL}/marine/what-if", json={
        "container_id": "MEDU7719203",
        "shipment_id": "AGRI-SHP-9905",
        "simulation_type": "ALTERNATIVE_PORT",
        "simulation_params": {"target_port": "Port of Salalah / Jebel Ali Hub"}
    })
    sim = r.json()
    print(f"\n[OK] POST /marine/what-if: {r.status_code}")
    print(f"     Potential Improvement: INR {sim['potential_improvement_inr']:,.2f}")
    print(f"     Recommendation: {sim['recommendation_summary']}")
    assert r.status_code == 200

    # 8. Add Black Box Event
    r = requests.post(f"{BASE_URL}/marine/containers/MEDU7719203/events", json={
        "event_type": "PORT_SECURITY_CHECK",
        "location_name": "Genoa Security Bay 1",
        "temperature": 11.8,
        "humidity": 72.0,
        "notes": "Joint customs security seal inspection completed.",
        "severity": "INFO"
    })
    print(f"\n[OK] POST /marine/containers/MEDU7719203/events: {r.status_code}")
    print("     Event:", r.json()["event"]["event_id"])
    assert r.status_code == 200

    print("\n" + "=" * 70)
    print(" ALL LIVE FASTAPI MARINE ENDPOINTS OPERATIONAL & PASSING!")
    print("=" * 70)

if __name__ == "__main__":
    test_endpoints()
