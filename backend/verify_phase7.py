import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_buyer_receiving_and_verification():
    print("=" * 70)
    print("PHASE 7: BUYER RECEIVING & SENT-VS-RECEIVED VERIFICATION TEST")
    print("=" * 70)

    # 1. Check existing test shipment AGRI-1001 baseline
    shipment_id = "AGRI-1001"
    print(f"\n1. Verifying Original Dispatch Baseline for '{shipment_id}'...")
    r = requests.get(f"{BASE_URL}/verify/{shipment_id}")
    assert r.status_code == 200, f"Verify failed: {r.status_code}, {r.text}"
    verify_data = r.json()
    print(f"   Shipment ID: {verify_data['shipment_id']}")
    print(f"   Product: {verify_data['product_name']}")
    print(f"   Original Total Quantity: {verify_data['total_quantity']} kg")
    print(f"   Original Grade A: {verify_data['grade_a_quantity']} kg")
    print(f"   Original Grade B: {verify_data['grade_b_quantity']} kg")
    print(f"   Target Temp Band: {verify_data['target_temperature_range']['min']}°C - {verify_data['target_temperature_range']['max']}°C")
    print("   [PASS] Immutable dispatch baseline verified.")

    # 2. Check Chain-of-Custody Timeline Before Receiving
    print(f"\n2. Checking Timeline before receiving...")
    r = requests.get(f"{BASE_URL}/shipments/{shipment_id}/timeline")
    assert r.status_code == 200, f"Timeline failed: {r.status_code}"
    events = r.json()["data"]
    print(f"   Events count: {len(events)}")
    for ev in events:
        print(f"     - [{ev['event_type']}] by {ev['actor_role']} at {ev.get('location')} ({ev['event_timestamp']})")
    assert any(e["event_type"] == "FARMER_TO_LOGISTICS_HANDOVER" for e in events), "Handover event must exist"
    print("   [PASS] Logistics handover confirmed in timeline.")

    # 3. Test Validation Error Cases on POST /receive
    print(f"\n3. Testing Validation Constraints on POST /receive...")
    # 3a. Negative quantity
    bad_payload = {
        "received_quantity": -50.0,
        "received_by": "Test Inspector"
    }
    r = requests.post(f"{BASE_URL}/shipments/{shipment_id}/receive", json=bad_payload)
    assert r.status_code == 400, f"Expected 400 on negative qty, got {r.status_code}"
    print("   [PASS] Negative quantity correctly rejected (400).")

    # 3b. Grade sum exceeding total
    bad_payload = {
        "received_quantity": 900.0,
        "received_grade_a": 600.0,
        "received_grade_b": 400.0, # 600 + 400 = 1000 > 900
        "received_by": "Test Inspector"
    }
    r = requests.post(f"{BASE_URL}/shipments/{shipment_id}/receive", json=bad_payload)
    assert r.status_code == 400, f"Expected 400 on excessive grades, got {r.status_code}"
    print("   [PASS] Grade sum exceeding total correctly rejected (400).")

    # 4. Perform Realistic Buyer Receiving for AGRI-1001
    print(f"\n4. Executing Realistic Buyer Receiving for '{shipment_id}'...")
    receive_payload = {
        "receiver_name": "Buyer Receiving Operator",
        "received_by": "Buyer Receiving Operator",
        "receiving_location": "Mumbai Buyer Facility",
        "received_total_quantity": 900.0,
        "received_grade_a": 600.0,
        "received_grade_b": 250.0,
        "damaged_quantity": 50.0,
        "receiving_temperature": 14.0,
        "receiving_humidity": 68.0,
        "receiving_notes": "Shipment received and inspected at buyer facility."
    }
    r = requests.post(f"{BASE_URL}/shipments/{shipment_id}/receive", json=receive_payload)
    assert r.status_code == 201, f"Receive failed: {r.status_code}, {r.text}"
    receive_res = r.json()
    print(f"   Status: {receive_res['status']}")
    print(f"   Receiving Record ID: {receive_res['receiving_record_id']}")
    print(f"   Event ID: {receive_res['event_id']}")
    print(f"   Incident ID: {receive_res['incident_id']}")
    print(f"   Shipment Status: {receive_res['shipment_status']}")
    print(f"   Comparison Status: {receive_res['comparison_status']}")
    assert receive_res['comparison_status'] == "QUANTITY_AND_QUALITY_DISCREPANCY"
    assert receive_res['incident_id'] is not None
    print("   [PASS] Buyer receiving created, comparison evaluated, and incident logged.")

    # 5. Test Duplicate Receiving Prevention
    print(f"\n5. Testing Duplicate Receiving Rejection...")
    r = requests.post(f"{BASE_URL}/shipments/{shipment_id}/receive", json=receive_payload)
    assert r.status_code == 400, f"Expected 400 on duplicate receive, got {r.status_code}"
    print(f"   [PASS] Duplicate receiving successfully rejected (400: {r.json()['detail']}).")

    # 6. Test GET /shipments/{shipment_id}/comparison
    print(f"\n6. Testing GET /shipments/{shipment_id}/comparison...")
    r = requests.get(f"{BASE_URL}/shipments/{shipment_id}/comparison")
    assert r.status_code == 200, f"Comparison failed: {r.status_code}, {r.text}"
    comp = r.json()
    print(f"   Shipment ID: {comp['shipment_id']} ({comp['product_name']})")
    print(f"   Dispatched: Total={comp['dispatched']['total_quantity']}kg, GradeA={comp['dispatched']['grade_a_quantity']}kg, GradeB={comp['dispatched']['grade_b_quantity']}kg")
    print(f"   Received:   Total={comp['received']['total_quantity']}kg, GradeA={comp['received']['grade_a_quantity']}kg, GradeB={comp['received']['grade_b_quantity']}kg, Damaged={comp['received']['damaged_quantity']}kg, Temp={comp['received']['receiving_temperature']}°C")
    print(f"   Differences: Total Diff={comp['differences']['total_quantity_difference']}kg, GradeA Diff={comp['differences']['grade_a_difference']}kg, GradeB Diff={comp['differences']['grade_b_difference']}kg, Temp Diff={comp['differences']['temperature_difference']}°C")
    print(f"   Status: {comp['comparison_status']}")
    print(f"   Discrepancy Details:")
    for d in comp['discrepancy_details']:
        print(f"     * {d}")
    print(f"   Linked Incident: {comp.get('incident')}")
    assert comp['differences']['total_quantity_difference'] == -100.0
    assert comp['differences']['grade_a_difference'] == -150.0
    assert comp['differences']['damaged_quantity'] == 50.0
    assert comp['differences']['temperature_difference'] == 1.0
    print("   [PASS] Sent-vs-Received comparisons and difference metrics verified.")

    # 7. Test Incident APIs
    print(f"\n7. Testing Incidents API (GET /incidents & GET /incidents/{{id}})...")
    r = requests.get(f"{BASE_URL}/incidents")
    assert r.status_code == 200, f"Incidents failed: {r.status_code}"
    incidents = r.json()["data"]
    print(f"   Total Incidents: {len(incidents)}")
    assert len(incidents) >= 1, "At least 1 incident must exist"
    latest_inc = incidents[0]
    print(f"   Latest Incident #{latest_inc['incident_id']}: Type={latest_inc['incident_type']}, Severity={latest_inc['severity']}, Status={latest_inc['status']}")
    print(f"   Description: {latest_inc['description']}")

    r = requests.get(f"{BASE_URL}/incidents/{latest_inc['incident_id']}")
    assert r.status_code == 200, f"Incident detail failed: {r.status_code}"
    inc_detail = r.json()
    print(f"   Incident #{inc_detail['incident_id']} Timeline Events Attached: {len(inc_detail['timeline_events'])}")
    print("   [PASS] Incidents registry and detail endpoints verified.")

    # 8. Test Chronological Chain-of-Custody Timeline
    print(f"\n8. Testing Updated Full Chain-of-Custody Timeline...")
    r = requests.get(f"{BASE_URL}/shipments/{shipment_id}/timeline")
    assert r.status_code == 200, f"Timeline failed: {r.status_code}"
    events = r.json()["data"]
    print(f"   Timeline Event Sequence ({len(events)} events):")
    for i, ev in enumerate(events, 1):
        print(f"     {i}. [{ev['event_type']}] by {ev['actor_role']} at {ev.get('location')} | {ev['event_description'][:60]}...")
    
    event_types = [e["event_type"] for e in events]
    assert "FARMER_DISPATCH" in event_types
    assert "FARMER_TO_LOGISTICS_HANDOVER" in event_types
    assert "BUYER_RECEIVING" in event_types
    print("   [PASS] Chronological chain-of-custody verified.")

    # 9. Verify Public QR Trust Endpoint Integrity (Farmer record preserved!)
    print(f"\n9. Verifying Public Trust QR Verification (Farmer Baseline Intact)...")
    r = requests.get(f"{BASE_URL}/verify/{shipment_id}")
    assert r.status_code == 200, f"Verify failed: {r.status_code}"
    qr_verify = r.json()
    assert qr_verify["total_quantity"] == 1000.0, "Original total quantity must remain 1000.0 kg"
    assert qr_verify["grade_a_quantity"] == 750.0, "Original Grade A must remain 750.0 kg"
    assert qr_verify["grade_b_quantity"] == 250.0, "Original Grade B must remain 250.0 kg"
    print(f"   Original Farm Gate Record: Total={qr_verify['total_quantity']}kg, GradeA={qr_verify['grade_a_quantity']}kg, GradeB={qr_verify['grade_b_quantity']}kg")
    print("   [PASS] Public trust verification guarantees original farmer record was NEVER overwritten!")

    # 10. Verify Live Risk & Monitoring Endpoints Still Work
    print(f"\n10. Verifying Risk and Fleet Monitoring Endpoints...")
    r = requests.get(f"{BASE_URL}/shipments/{shipment_id}/risk")
    assert r.status_code == 200, f"Risk failed: {r.status_code}"
    print(f"   Risk for {shipment_id}: {r.json()['risk_level']} (Score: {r.json()['risk_score']})")

    r = requests.get(f"{BASE_URL}/monitoring/shipments")
    assert r.status_code == 200, f"Monitoring failed: {r.status_code}"
    print(f"   Fleet Monitoring Cards: {r.json()['count']}")

    print("\n" + "=" * 70)
    print("ALL PHASE 7 BUYER RECEIVING & VERIFICATION TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_buyer_receiving_and_verification()
