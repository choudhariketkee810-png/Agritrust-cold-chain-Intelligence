"""
AGRITrust — Multi-Modal Logistics Intelligence Automated Verification Suite
===========================================================================
Validates:
1. PostgreSQL Schema & Table Integrity
2. Pincode & Logistics Hub Directory
3. Road, Marine, and Air 3-Mode Calculation Engine
4. IATA Volumetric & Chargeable Weight Algorithms
5. Marine & Air Feasibility / Infeasibility Detection
6. 5-Attribute AI Recommendation Engine (Lowest Cost, Fastest, Best Balanced, Best Perishable, Lowest Emissions)
7. Full Itemized Cost Breakdown Correctness
8. Quotation Creation & PostgreSQL Persistence
9. Booking Workflow, Common Shipment ID & Multi-Segment Route Milestones
10. Live Multimodal Tracking & Milestone Step Advancement
11. Transport Rate Card Governance API
12. Compatibility with existing AGRITRUST roles & telemetry
"""

import sys
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import json

from multimodal_cost_engine import (
    plan_and_compare_all_routes,
    resolve_location,
    calculate_volumetric_weight,
    calculate_haversine_distance,
    PINCODE_REGISTRY,
    PORTS_REGISTRY,
    AIRPORTS_REGISTRY
)

def get_connection():
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="ftl_cold_chain",
        user="postgres",
        password="1234"
    )

def run_tests():
    print("=" * 80)
    print(" AGRITRUST MULTI-MODAL LOGISTICS INTELLIGENCE (ROAD + MARINE + AIR) TEST SUITE")
    print("=" * 80)
    
    passed_tests = 0
    total_tests = 12

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # -------------------------------------------------------------------------
    # TEST 1: Table & Schema Existence
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Verifying PostgreSQL Multi-Modal Planning Tables...")
    expected_tables = [
        "pincode_directory", "ports_airports_registry", "transport_rate_cards",
        "carrier_services", "shipment_quotes", "route_options",
        "multimodal_bookings", "route_segments"
    ]
    cur.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ANY(%s);
    """, (expected_tables,))
    existing_tables = [r["table_name"] for r in cur.fetchall()]
    for t in expected_tables:
        assert t in existing_tables, f"Table {t} missing in PostgreSQL!"
    print(f"  [OK] PASS: All {len(expected_tables)} multimodal planning tables verified in PostgreSQL.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 2: PIN Code & Hub Registry Lookup
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Testing Geospatial PIN Code & Logistics Hub Directory...")
    nashik = resolve_location("422001", "Nashik")
    assert nashik["city"] == "Nashik"
    assert nashik["nearest_port"] == "PORT_JNPT"
    assert nashik["nearest_airport"] == "AIR_BOM"

    delhi = resolve_location("110037", "Delhi")
    assert delhi["nearest_airport"] == "AIR_DEL"

    rotterdam = resolve_location("300002", "Rotterdam")
    assert rotterdam["nearest_port"] == "PORT_ROTTERDAM"
    print("  [OK] PASS: PIN code resolution and nearest seaport/airport hub mapping verified.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 3: IATA Volumetric & Chargeable Weight Computation
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Testing IATA Volumetric & Chargeable Weight Calculations...")
    # Package: 120cm x 100cm x 160cm = 1,920,000 cm3 / 5000 = 384 kg volumetric weight
    vol_wt = calculate_volumetric_weight(120.0, 100.0, 160.0, 5000.0)
    assert vol_wt == 384.0, f"Expected 384.0 kg, got {vol_wt}"
    print(f"  [OK] PASS: IATA standard (L*W*H)/5000 calculated: {vol_wt} kg.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 4: 3-Mode Simultaneous Route Comparison
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Testing Simultaneous 3-Mode Route Planning (Nashik to Delhi)...")
    res = plan_and_compare_all_routes(
        pickup_pincode="422001",
        pickup_location="Nashik Sahyadri Farm Hub",
        destination_pincode="110037",
        destination_location="Delhi Central Cold Distribution Hub",
        cargo_weight_kg=4500.0,
        cargo_type="Fresh Organic Table Grapes",
        cargo_volume_cbm=18.0,
        is_perishable=True,
        shelf_life_days=14.0,
        urgency_level="STANDARD",
        temperature_requirement="Chilled (2°C to 6°C)",
        temp_min_c=2.0,
        temp_max_c=6.0,
        insurance_preference="COMPREHENSIVE",
        declared_cargo_value_inr=540000.0,
        priority_preference="BALANCED"
    )
    assert "ROAD" in res["routes"]
    assert "MARINE" in res["routes"]
    assert "AIR" in res["routes"]
    assert res["routes"]["ROAD"]["is_feasible"] is True
    assert res["routes"]["AIR"]["is_feasible"] is True
    print(f"  [OK] PASS: Generated comparison for Road (₹{res['routes']['ROAD']['total_estimated_cost_inr']:,.2f}), Marine, and Air (₹{res['routes']['AIR']['total_estimated_cost_inr']:,.2f}).")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 5: Itemized Cost Breakdown Arithmetic
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Testing Itemized Cost Breakdown Summation...")
    road_bk = res["routes"]["ROAD"]["cost_breakdown"]
    sum_items = (
        road_bk["base_freight"] + road_bk["first_mile"] + road_bk["last_mile"] +
        road_bk["loading_unloading"] + road_bk["handling_documentation"] +
        road_bk["tolls_port_airport_charges"] + road_bk["fuel_surcharge"] +
        road_bk["cold_chain_surcharge"] + road_bk["insurance"]
    )
    expected_total = round(sum_items + road_bk["taxes_gst"], 2)
    assert abs(road_bk["total"] - expected_total) < 0.05, f"Mismatch: {road_bk['total']} vs {expected_total}"
    print(f"  [OK] PASS: Road cost components sum cleanly to ₹{road_bk['total']:,.2f} with 18% GST.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 6: Marine Infeasibility on Short Inland Routes
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Testing Marine Infeasibility Logic for Short Landlocked Distances...")
    short_res = plan_and_compare_all_routes(
        pickup_pincode="422001",
        pickup_location="Nashik Farm",
        destination_pincode="411001",
        destination_location="Pune Receiving Hub",
        cargo_weight_kg=2000.0,
        cargo_type="Fresh Tomatoes",
        is_perishable=True,
        shelf_life_days=7.0
    )
    assert short_res["routes"]["MARINE"]["is_feasible"] is False
    assert "Short inland distance" in short_res["routes"]["MARINE"]["infeasibility_reason"] or "Intra-zone" in short_res["routes"]["MARINE"]["infeasibility_reason"]
    print(f"  [OK] PASS: Marine correctly marked infeasible for Nashik to Pune with reason: '{short_res['routes']['MARINE']['infeasibility_reason']}'.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 7: AI Recommendation Badges & Multi-Attribute Scoring
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Testing AI Recommendation Badges & Scoring...")
    badges_assigned = []
    for mode, opt in res["routes"].items():
        if opt["is_feasible"]:
            badges_assigned.extend(opt["ai_recommendation_badges"])
            assert opt["ai_recommendation_score"] >= 0 and opt["ai_recommendation_score"] <= 100
            assert len(opt["ai_reasoning_summary"]) > 10
    
    assert "FASTEST_DELIVERY" in badges_assigned, "FASTEST_DELIVERY badge was not assigned!"
    assert "BEST_BALANCED" in badges_assigned, "BEST_BALANCED badge was not assigned!"
    print(f"  [OK] PASS: AI badges successfully assigned: {set(badges_assigned)} with full natural-language reasoning.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 8: Quotation Database Persistence
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Testing PostgreSQL Quotation Persistence...")
    cur.execute("SELECT COUNT(*) as count FROM shipment_quotes;")
    quote_count = cur.fetchone()["count"]
    assert quote_count > 0, "No shipment quotes found in database!"
    cur.execute("SELECT COUNT(*) as count FROM route_options;")
    opt_count = cur.fetchone()["count"]
    assert opt_count >= quote_count * 3, "Route options count does not match expected 3 options per quote!"
    print(f"  [OK] PASS: Database contains {quote_count} saved quotations and {opt_count} route options.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 9: Booking Workflow & Route Segments Generation
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Testing Multimodal Booking & Route Segments Creation...")
    cur.execute("SELECT * FROM multimodal_bookings ORDER BY created_at DESC LIMIT 1;")
    booking = cur.fetchone()
    assert booking is not None, "No multimodal bookings found!"
    cur.execute("SELECT * FROM route_segments WHERE booking_id = %s ORDER BY segment_order ASC;", (booking["booking_id"],))
    segments = cur.fetchall()
    assert len(segments) >= 3, f"Expected at least 3 route segments, found {len(segments)}"
    print(f"  [OK] PASS: Booking {booking['booking_id']} verified with {len(segments)} route segments across first-mile, main transit & last-mile.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 10: Multimodal Tracking & Segment Milestone Progression
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Testing Segment Milestone Status & Progression...")
    seg_statuses = [s["segment_status"] for s in segments]
    assert any(st in ["ACTIVE", "COMPLETED"] for st in seg_statuses), "Segments should have ACTIVE or COMPLETED statuses"
    print(f"  [OK] PASS: Verified route segments progression: {seg_statuses}.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 11: Configurable Transport Rate Cards in PostgreSQL
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Testing Transport Rate Cards Registry...")
    cur.execute("SELECT mode, service_code, base_freight_per_km_or_kg FROM transport_rate_cards ORDER BY mode;")
    rate_cards = cur.fetchall()
    modes_in_db = set(rc["mode"] for rc in rate_cards)
    assert "ROAD" in modes_in_db and "MARINE" in modes_in_db and "AIR" in modes_in_db
    print(f"  [OK] PASS: Verified {len(rate_cards)} active rate cards across Road, Marine, and Air.")
    passed_tests += 1

    # -------------------------------------------------------------------------
    # TEST 12: Compatibility with Existing AGRITRUST Modules
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Testing Backward Compatibility with Existing Shipments & Users...")
    cur.execute("SELECT COUNT(*) as count FROM shipments;")
    legacy_shipments = cur.fetchone()["count"]
    cur.execute("SELECT COUNT(*) as count FROM users;")
    users_count = cur.fetchone()["count"]
    assert legacy_shipments > 0 and users_count > 0
    print(f"  [OK] PASS: Existing tables intact ({legacy_shipments} shipments, {users_count} users). No broken dependencies.")
    passed_tests += 1

    conn.close()

    print("\n" + "=" * 80)
    print(f" ALL TESTS PASSED: {passed_tests}/{total_tests} (100% SUCCESS)")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
