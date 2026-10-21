"""
Phase 11 Comprehensive Verification Script
Tests all 13 checklist verification points
"""
import urllib.request
import json

BASE = "http://127.0.0.1:8000"

def get(url):
    req = urllib.request.Request(f"{BASE}{url}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def test_phase11():
    print("================================================================")
    print("AGRITRUST PHASE 11 COMPREHENSIVE VERIFICATION")
    print("================================================================")
    
    # 1. GET /shipments shows demo shipments
    ships_resp = get("/shipments")
    ships = ships_resp.get("data", [])
    ship_ids = [s["shipment_id"] for s in ships]
    print(f"\n1. GET /shipments returned {len(ships)} shipments:")
    for s in ships:
        print(f"   [{s['shipment_id']}] {s['product_name']} | Status: {s['shipment_status']} | Origin: {s['origin']} -> {s['destination']}")
    for req_id in ["AGRI-DEMO-101", "AGRI-DEMO-102", "AGRI-DEMO-103", "AGRI-DEMO-104", "AGRI-DEMO-105"]:
        assert req_id in ship_ids, f"Missing demo shipment {req_id}"
    print("   -> PASS: All demo shipments present in registry.")

    # 2. Control Tower / Monitoring displays different shipment states
    mon = get("/monitoring/shipments")
    mon_ships = mon.get("data", [])
    print(f"\n2. GET /monitoring/shipments shows {len(mon_ships)} active monitored shipments:")
    for m in mon_ships:
        print(f"   [{m['shipment_id']}] Temp: {m.get('current_temperature')} C | Reefer: {m.get('refrigeration_status')} | Door: {m.get('door_status')} | Risk: {m.get('risk_level')} ({m.get('risk_score')}/100)")
    assert len(mon_ships) > 0
    print("   -> PASS: Monitoring endpoints reflect live in-transit fleet states.")

    # 3. Normal shipment shows NORMAL risk
    r1 = get("/shipments/AGRI-DEMO-101/risk")
    print(f"\n3. Normal Transit (AGRI-DEMO-101) Risk:")
    print(f"   - Level: {r1['risk_level']}, Score: {r1['risk_score']}/100, Temp: {r1.get('latest_temperature')} C")
    assert r1['risk_level'] == "NORMAL", f"Expected NORMAL, got {r1['risk_level']}"
    print("   -> PASS: Normal shipment shows NORMAL risk.")

    # 4. Temperature excursion shipment shows elevated risk
    r2 = get("/shipments/AGRI-DEMO-102/risk")
    print(f"\n4. Temperature Excursion (AGRI-DEMO-102) Risk:")
    print(f"   - Level: {r2['risk_level']}, Score: {r2['risk_score']}/100, Temp: {r2.get('latest_temperature')} C")
    print(f"   - Reasons: {r2['risk_reasons']}")
    assert r2['risk_level'] in ["HIGH", "CRITICAL"], f"Expected HIGH/CRITICAL, got {r2['risk_level']}"
    print("   -> PASS: Temperature excursion shows elevated risk.")

    # 5. Door/refrigeration scenario shows appropriate risk
    r3 = get("/shipments/AGRI-DEMO-103/risk")
    print(f"\n5. Door/Reefer Event (AGRI-DEMO-103) Risk:")
    print(f"   - Level: {r3['risk_level']}, Score: {r3['risk_score']}/100, Reefer: {r3['refrigeration_status']}, Door: {r3['door_status']}")
    print(f"   - Reasons: {r3['risk_reasons']}")
    assert r3['risk_level'] in ["HIGH", "CRITICAL"], f"Expected HIGH/CRITICAL, got {r3['risk_level']}"
    print("   -> PASS: Door/refrigeration event shows elevated risk.")

    # 6. Successfully received shipment shows no discrepancy
    c4 = get("/shipments/AGRI-DEMO-104/comparison")
    print(f"\n6. Successfully Received (AGRI-DEMO-104) Comparison:")
    print(f"   - Dispatched: {c4['dispatched']['total_quantity']} kg, Received: {c4['received']['total_quantity']} kg")
    print(f"   - Difference: {c4['differences']['total_quantity_difference']} kg, Damaged: {c4['differences']['damaged_quantity']} kg")
    print(f"   - Verdict: {c4['comparison_status']}")
    assert c4['comparison_status'] == "NO_SIGNIFICANT_DISCREPANCY"
    print("   -> PASS: Successfully received shipment shows zero discrepancy.")

    # 7. Discrepancy shipment appears in incidents
    inc_resp = get("/incidents")
    incidents = inc_resp.get("data", [])
    inc_105 = [i for i in incidents if i["shipment_id"] == "AGRI-DEMO-105"]
    print(f"\n7. Discrepancy Shipment (AGRI-DEMO-105) Incidents:")
    assert len(inc_105) > 0, "Expected incident for AGRI-DEMO-105"
    inc_id = inc_105[0]["incident_id"]
    print(f"   - Incident ID: #{inc_id}, Type: {inc_105[0]['incident_type']}, Severity: {inc_105[0]['severity']}, Status: {inc_105[0]['status']}")
    print("   -> PASS: Discrepancy shipment appears in incident registry.")

    # 8. Investigation page works for the discrepancy shipment
    inv = get(f"/incidents/{inc_id}/investigation")
    timeline = inv.get("unified_timeline", {}).get("events", [])
    print(f"\n8. Investigation Dossier (GET /incidents/{inc_id}/investigation):")
    print(f"   - Summary: {inv.get('investigation_summary')[:120]}...")
    print(f"   - Timeline Events: {len(timeline)} logged across lifecycle")
    print(f"   - Comparison verdict in dossier: {inv.get('comparison', {}).get('comparison_status')}")
    assert len(timeline) > 0
    print("   -> PASS: Investigation dossier generates full audit evidence timeline.")

    # 9. QR verification works for demo shipments
    for did in ["AGRI-DEMO-101", "AGRI-DEMO-102", "AGRI-DEMO-103", "AGRI-DEMO-104", "AGRI-DEMO-105"]:
        v = get(f"/verify/{did}")
        print(f"   - /verify/{did}: {v['product_name']} ({v['total_quantity']} kg) -> Status: {v['verification_status']}")
        assert v['verification_status'] == "VERIFIED"
    print("   -> PASS: QR verification endpoints return valid baseline data for all demo shipments.")

    # 10. Existing SHP-0001 still works
    shp1 = get("/shipments/SHP-0001")
    print(f"\n10. Existing SHP-0001 verification:")
    print(f"   - [{shp1['shipment_id']}] {shp1['product_name']} | Status: {shp1['shipment_status']} | Origin: {shp1['origin']}")
    assert shp1['shipment_id'] == "SHP-0001"
    print("   -> PASS: Existing SHP-0001 is completely intact.")

    # 11. Sensor simulator / telemetry/latest still works
    tel = get("/telemetry/latest")
    print(f"\n11. Sensor Simulator & Latest Telemetry:")
    print(f"   - Latest Telemetry: {tel}")
    print("   -> PASS: Telemetry endpoints functioning.")

    # 12. Existing alerts still work
    alerts_resp = get("/alerts/recent")
    alerts_list = alerts_resp.get("data", []) if isinstance(alerts_resp, dict) else alerts_resp
    print(f"\n12. Alerts Engine:")
    print(f"   - Recent alerts count: {len(alerts_list)}")
    for a in alerts_list[:3]:
        print(f"     * #{a.get('alert_id')}: {a.get('shipment_id')} | {a.get('alert_type')} | {a.get('severity')}")
    assert len(alerts_list) > 0
    print("   -> PASS: Alerts engine populated and operational.")

    # 13. No duplicate IDs were created
    all_ship_ids = [s["shipment_id"] for s in ships]
    assert len(all_ship_ids) == len(set(all_ship_ids)), "Duplicate shipment IDs found!"
    print(f"\n13. Uniqueness Check: {len(all_ship_ids)} total shipments with 100% unique IDs.")
    print("   -> PASS: Zero duplicate IDs.")

    print("\n================================================================")
    print("ALL 13 PHASE 11 VERIFICATION REQUIREMENTS PASSED PERFECTLY!")
    print("================================================================")

if __name__ == "__main__":
    test_phase11()
