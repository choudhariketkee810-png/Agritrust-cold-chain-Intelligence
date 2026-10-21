import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_incident_investigation():
    print("=" * 70)
    print("PHASE 8: INCIDENT INVESTIGATION & EVIDENCE TIMELINE VERIFICATION")
    print("=" * 70)

    # 1. Fetch Incidents List to get the test discrepancy incident
    print("\n1. Fetching Incidents List...")
    r = requests.get(f"{BASE_URL}/incidents")
    assert r.status_code == 200, f"Failed to list incidents: {r.status_code}"
    incidents = r.json()["data"]
    assert len(incidents) > 0, "No incidents found in registry."
    incident = incidents[0]
    incident_id = incident["incident_id"]
    print(f"   Selected Incident #{incident_id}: Type={incident['incident_type']}, Severity={incident['severity']}, Status={incident['status']}")

    # 2. Test GET /incidents/{incident_id}/investigation
    print(f"\n2. Testing Comprehensive Investigation Dossier (GET /incidents/{incident_id}/investigation)...")
    r = requests.get(f"{BASE_URL}/incidents/{incident_id}/investigation")
    assert r.status_code == 200, f"Investigation endpoint failed: {r.status_code}, {r.text}"
    inv = r.json()

    print("\n   [A] Incident Details:")
    print(f"       Incident ID: #{inv['incident']['incident_id']}")
    print(f"       Shipment ID: {inv['incident']['shipment_id']}")
    print(f"       Type: {inv['incident']['incident_type']} | Severity: {inv['incident']['severity']}")
    print(f"       Status: {inv['incident']['status']}")

    print("\n   [B] Investigation Summary:")
    print(f"       {inv['investigation_summary']}")

    print("\n   [C] Original Dispatch Baseline:")
    disp = inv["original_dispatch"]
    print(f"       Product: {disp['product']} | Total: {disp['total_quantity']} kg (Grade A: {disp['grade_a_quantity']} kg, Grade B: {disp['grade_b_quantity']} kg)")
    print(f"       Origin: {disp['origin']} -> Destination: {disp['destination']}")
    print(f"       Vehicle: {disp['vehicle']['vehicle_number']} ({disp['vehicle']['vehicle_type']})")
    print(f"       Target Safe Band: {disp['target_temperature_range']['min']}°C - {disp['target_temperature_range']['max']}°C")

    print("\n   [D] Logistics Handover:")
    ho = inv["handover"]
    if ho:
        print(f"       Handover Time: {ho['handover_timestamp']}")
        print(f"       Receiver: {ho['receiver']} | Location: {ho['location']}")
        print(f"       Handover Temp: {ho['handover_temperature']}°C | Humidity: {ho['handover_humidity']}%")
    else:
        print("       None recorded.")

    print("\n   [E] Transport Monitoring & Telemetry Analysis:")
    tele = inv["transport_monitoring"]
    if tele:
        print(f"       Readings Processed: {tele['telemetry_readings_count']}")
        print(f"       Latest Temp: {tele['latest_temperature']}°C | Range: [{tele['minimum_temperature']}°C to {tele['maximum_temperature']}°C] | Avg: {tele['average_temperature']}°C")
        print(f"       Excursions Count: {tele['temperature_excursions_count']} readings")
        print(f"       Excursion Duration: {tele['total_estimated_excursion_duration_minutes']} minutes ({tele['total_estimated_excursion_duration_seconds']}s)")
        print(f"       Door Open Events: {tele['door_open_events_count']} | Reefer Off Events: {tele['refrigeration_off_events_count']}")
    else:
        print("       No telemetry available.")

    print("\n   [F] Alerts Analysis:")
    al = inv["alerts_analysis"]
    print(f"       Total Alerts: {al['total_alerts_count']} (Open: {al['open_alerts_count']})")
    for a in al["alerts"][:2]:
        print(f"       - Alert #{a['alert_id']} ({a['severity']}): {a['message']} [{a['status']}]")

    print("\n   [G] Live Risk Analysis:")
    ra = inv["risk_analysis"]
    print(f"       Risk Level: {ra['current_risk_level']} (Score: {ra['current_risk_score']}/100)")
    print(f"       Reasons: {ra['risk_reasons']}")

    print("\n   [H] Buyer Receiving:")
    rec = inv["receiving"]
    if rec:
        print(f"       Received Total: {rec['received_quantity']} kg (Grade A: {rec['grade_a_quantity']} kg, Grade B: {rec['grade_b_quantity']} kg, Damaged: {rec['damaged_quantity']} kg)")
        print(f"       Location: {rec['location']} | Receiver: {rec['receiver']} | Temp: {rec['receiving_temperature']}°C")

    print("\n   [I] Sent-vs-Received Comparison:")
    comp = inv["comparison"]
    if comp:
        print(f"       Status: {comp['comparison_status']}")
        print(f"       Differences: Total={comp['differences']['total_quantity_difference']} kg, Grade A={comp['differences']['grade_a_difference']} kg, Damaged={comp['differences']['damaged_quantity']} kg")
        print(f"       Discrepancy Details: {comp['discrepancy_details']}")

    print("\n   [J] Unified Chronological Timeline:")
    timeline = inv["unified_timeline"]
    print(f"       Total Timeline Events: {timeline['count']}")
    for i, ev in enumerate(timeline["events"], 1):
        print(f"       {i}. [{ev['source']}] {ev['event_type']} ({ev['timestamp']}) - {ev['description'][:70]}...")

    # Assertions on Investigation Structure
    assert inv["incident"]["incident_id"] == incident_id
    assert inv["original_dispatch"]["total_quantity"] == 1000.0
    assert inv["receiving"]["received_quantity"] == 900.0
    assert inv["comparison"]["differences"]["total_quantity_difference"] == -100.0
    assert timeline["count"] >= 3
    print("\n   [PASS] Investigation dossier successfully validated.")

    # 3. Test PATCH /incidents/{incident_id}/status (Lifecycle Transition)
    print(f"\n3. Testing Incident Status Lifecycle Transition (PATCH /incidents/{incident_id}/status)...")
    
    # 3a. Transition to UNDER_REVIEW
    patch_payload = {
        "status": "UNDER_REVIEW",
        "resolution_notes": "Quality assurance and carrier operations team reviewing log transcripts."
    }
    r = requests.patch(f"{BASE_URL}/incidents/{incident_id}/status", json=patch_payload)
    assert r.status_code == 200, f"Failed status patch: {r.status_code}"
    res = r.json()
    assert res["new_status"] == "UNDER_REVIEW"
    print(f"   [PASS] Transitioned to 'UNDER_REVIEW': {res['message']}")

    # 3b. Verify updated status in investigation dossier
    r = requests.get(f"{BASE_URL}/incidents/{incident_id}/investigation")
    assert r.json()["incident"]["status"] == "UNDER_REVIEW"
    print("   [PASS] Investigation dossier reflects 'UNDER_REVIEW' status.")

    # 4. Verify System Continuity across Core Endpoints
    print("\n4. Verifying Core Endpoints Preservation...")
    assert requests.get(f"{BASE_URL}/").status_code == 200
    assert requests.get(f"{BASE_URL}/telemetry/latest").status_code == 200
    assert requests.post(f"{BASE_URL}/alerts/check").status_code == 200
    assert requests.get(f"{BASE_URL}/shipments").status_code == 200
    assert requests.get(f"{BASE_URL}/monitoring/shipments").status_code == 200
    assert requests.get(f"{BASE_URL}/verify/AGRI-1001").status_code == 200
    assert requests.get(f"{BASE_URL}/shipments/AGRI-1001/comparison").status_code == 200
    print("   [PASS] All baseline, monitoring, risk, QR, and comparison endpoints functioning properly.")

    print("\n" + "=" * 70)
    print("ALL PHASE 8 INCIDENT INVESTIGATION TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_incident_investigation()
