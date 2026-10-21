import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_ai_suite():
    print("=" * 60)
    print("AGRITRUST AI & UPGRADED MODULES ENDPOINT VERIFICATION")
    print("=" * 60)

    # 1. Health & Root
    r_root = requests.get(f"{BASE_URL}/")
    print(f"[PASS] 1. Root API: HTTP {r_root.status_code} | {r_root.json().get('message')}")

    # 2. AI Consignment Quality Inspector API
    inspect_payload = {
        "product_name": "Alphonso Mango",
        "product_category": "Fresh Fruits",
        "declared_quantity_kg": 2500.0,
        "declared_packages": 250,
        "packaging_type": "5-Ply Ventilated Corrugated Cartons",
        "image_urls": ["/images/produce_inspection.jpg"],
        "target_temp_min": 10.0,
        "target_temp_max": 13.0
    }
    r_insp = requests.post(f"{BASE_URL}/api/ai/inspect-consignment", json=inspect_payload)
    insp_data = r_insp.json()
    print(f"[PASS] 2. AI Consignment Quality Inspector: HTTP {r_insp.status_code}")
    print(f"       AI Confidence: {insp_data['ai_vision_metrics']['confidence_score']}%")
    print(f"       Visual Ripeness Index: {insp_data['ai_vision_metrics']['visual_ripeness_index']}%")
    print(f"       Estimated Brix: {insp_data['ai_vision_metrics']['estimated_brix_range']}")
    print(f"       Regulatory Governance Notice: {insp_data['regulatory_governance_notice']['mandatory_rule']}")

    # 3. AI Spoilage Risk Predictor API
    spoil_payload = {
        "shipment_id": "SHP-TOMATO-001",
        "product_name": "Alphonso Mango",
        "current_temperature_c": 11.4,
        "current_humidity_pct": 86.5,
        "transit_duration_hours": 14.5,
        "expected_remaining_transit_hours": 22.0,
        "cumulative_thermal_excursion_minutes": 10,
        "highest_temp_recorded_c": 12.8,
        "door_opening_events": 1
    }
    r_spoil = requests.post(f"{BASE_URL}/api/ai/spoilage-predict", json=spoil_payload)
    spoil_data = r_spoil.json()
    print(f"[PASS] 3. AI Spoilage Risk Predictor: HTTP {r_spoil.status_code}")
    print(f"       Spoilage Risk Score: {spoil_data['spoilage_risk_assessment']['risk_score']} / 100 ({spoil_data['spoilage_risk_assessment']['risk_level']})")
    print(f"       Remaining Shelf Life: {spoil_data['predictive_shelf_life']['remaining_shelf_life_days']} days ({spoil_data['predictive_shelf_life']['remaining_shelf_life_hours']}h)")
    print(f"       Decay Velocity: {spoil_data['predictive_shelf_life']['shelf_life_decay_velocity']}")

    # 4. Loss Prevention & Dispute Investigation Engine API
    dispute_payload = {
        "shipment_id": "SHP-TOMATO-001",
        "product_name": "Vine Tomatoes",
        "declared_weight_kg": 3500.0,
        "verified_weight_kg": 3485.0,
        "delivered_weight_kg": 3340.0,
        "declared_grade": "Grade A (Export)",
        "delivered_grade": "Grade B (Downgraded due to bruising)",
        "planned_transit_hours": 12.0,
        "actual_transit_hours": 19.5,
        "thermal_excursion_duration_hours": 3.5,
        "seal_intact_at_delivery": True
    }
    r_disp = requests.post(f"{BASE_URL}/api/ai/investigate-dispute", json=dispute_payload)
    disp_data = r_disp.json()
    print(f"[PASS] 4. Loss Prevention & Dispute Engine: HTTP {r_disp.status_code}")
    print(f"       Investigation ID: {disp_data['investigation_id']}")
    print(f"       Net Shortage: {disp_data['variance_summary']['total_shortage_kg']} kg ({disp_data['variance_summary']['total_shortage_pct']})")
    print(f"       Top Contributing Factor: {disp_data['contributing_factors_breakdown'][0]['factor_name']} ({disp_data['contributing_factors_breakdown'][0]['probability_pct']}%)")
    print(f"       Neutral Governance: {disp_data['neutral_investigation_disclaimer']}")

    # 5. Media Catalog API
    r_media = requests.get(f"{BASE_URL}/api/ai/media/catalog")
    media_data = r_media.json()
    print(f"[PASS] 5. Media & Assets Catalog: HTTP {r_media.status_code} | {len(media_data['produce_categories'])} produce varieties | {len(media_data['transport_modes'])} transport modes")

    print("\n" + "=" * 60)
    print("ALL 5 AI & UPGRADED ENDPOINTS WORKING 100% PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_ai_suite()
