"""
AGRITrust — Loss Prevention & Investigation Engine Migration & Seeder
Executes database DDL schema and seeds comprehensive real-world scenarios,
including the flagship 1,000 kg Tomato breach, What-If counterfactuals,
intervention recommendations, AI investigation cases, and dispute room data.
"""

import psycopg2
from psycopg2.extras import RealDictCursor, Json
from datetime import datetime, timedelta
import json
import uuid

def get_connection():
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="ftl_cold_chain",
        user="postgres",
        password="1234"
    )

def run_migration_and_seed():
    print("=" * 70)
    print(" AGRITRUST — LOSS PREVENTION & INVESTIGATION ENGINE MIGRATION & SEED")
    print("=" * 70)

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Execute SQL DDL Schema
    print("\n[STEP 1] Applying DDL schema from agritrust_loss_prevention_schema.sql...")
    with open("agritrust_loss_prevention_schema.sql", "r") as f:
        schema_sql = f.read()
    cur.execute(schema_sql)
    conn.commit()
    print("  [SUCCESS] Tables loss_risk_assessments, what_if_scenarios, intervention_recommendations,")
    print("            investigation_cases, investigation_evidence, loss_prevention_metrics verified.")

    # 2. Inspect existing shipments
    cur.execute("SELECT shipment_id, product_name, origin, destination, vehicle_id FROM shipments ORDER BY shipment_id ASC;")
    existing_shipments = cur.fetchall()
    shipment_ids = [s["shipment_id"] for s in existing_shipments]
    print(f"\n[STEP 2] Existing shipments in DB: {shipment_ids}")

    # Ensure AGRI-1001 exists as the flagship 1000kg Tomato shipment
    demo_shipment_id = "AGRI-1001"
    cur.execute("SELECT * FROM shipments WHERE shipment_id = %s;", (demo_shipment_id,))
    demo_ship = cur.fetchone()

    now = datetime.now()
    t_minus_10h = now - timedelta(hours=10)
    t_plus_18h = now + timedelta(hours=18)

    if not demo_ship:
        print(f"  Creating flagship demo shipment {demo_shipment_id}...")
        cur.execute("""
            INSERT INTO shipments (
                shipment_id, product_name, origin, destination, vehicle_id,
                target_temp_min, target_temp_max, departure_time, expected_delivery_time,
                shipment_status, farmer_id, buyer_id
            ) VALUES (
                %s, 'Tomatoes', 'Nashik Farm Cluster', 'Mumbai APMC Market', 'FTL-V001',
                10.0, 13.0, %s, %s, 'IN_TRANSIT', 'USR-FARMER-01', 'USR-BUYER-01'
            ) ON CONFLICT (shipment_id) DO UPDATE SET
                product_name = 'Tomatoes',
                target_temp_min = 10.0,
                target_temp_max = 13.0,
                shipment_status = 'IN_TRANSIT';
        """, (demo_shipment_id, t_minus_10h, t_plus_18h))
    else:
        # Update metadata to match tomatoes specification if needed
        cur.execute("""
            UPDATE shipments SET 
                product_name = 'Tomatoes',
                target_temp_min = 10.0,
                target_temp_max = 13.0
            WHERE shipment_id = %s;
        """, (demo_shipment_id,))

    # Ensure shipment_quality record for AGRI-1001
    cur.execute("""
        INSERT INTO shipment_quality (
            shipment_id, grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity,
            quality_notes, recorded_by, recorded_at
        ) VALUES (
            %s, 850.0, 150.0, 0.0, 1000.0,
            'Premium Grade A Table Tomatoes harvested at optimal maturity index.', 'Farmer_Nashik_01', %s
        ) ON CONFLICT DO NOTHING;
    """, (demo_shipment_id, t_minus_10h))

    # 3. Seed Flagship Loss Risk Assessment for AGRI-1001
    print("\n[STEP 3] Seeding Flagship Loss Risk Assessment for AGRI-1001 (High Risk 78/100)...")
    cur.execute("""
        INSERT INTO loss_risk_assessments (
            assessment_id, shipment_id, produce_name, total_quantity_kg,
            loss_risk_score, risk_level, remaining_shelf_life_hours, expected_quality_pct,
            early_warning_status, time_to_breach_minutes, temperature_trend,
            current_temperature, target_temp_min, target_temp_max,
            primary_risk_reason, risk_factors, recommended_action,
            estimated_avoidable_loss_kg, estimated_avoidable_loss_inr, assessed_at
        ) VALUES (
            %s, %s, 'Tomatoes', 1000.0,
            78, 'HIGH', 21.0, 67.0,
            'HIGH_RISK', 0, 'RISING (+0.6°C/15m)',
            15.4, 10.0, 13.0,
            'Temperature has remained above recommended range (10-13°C) for 42 minutes with reefer compressor inactivity.',
            %s,
            'Redirect to nearest verified Buyer B in Thane corridor or initiate emergency reefer reset.',
            280.0, 14000.0, CURRENT_TIMESTAMP
        ) ON CONFLICT (assessment_id) DO UPDATE SET
            loss_risk_score = EXCLUDED.loss_risk_score,
            risk_level = EXCLUDED.risk_level,
            remaining_shelf_life_hours = EXCLUDED.remaining_shelf_life_hours,
            expected_quality_pct = EXCLUDED.expected_quality_pct,
            early_warning_status = EXCLUDED.early_warning_status,
            current_temperature = EXCLUDED.current_temperature,
            primary_risk_reason = EXCLUDED.primary_risk_reason,
            risk_factors = EXCLUDED.risk_factors,
            recommended_action = EXCLUDED.recommended_action,
            estimated_avoidable_loss_kg = EXCLUDED.estimated_avoidable_loss_kg,
            estimated_avoidable_loss_inr = EXCLUDED.estimated_avoidable_loss_inr,
            assessed_at = CURRENT_TIMESTAMP;
    """, (
        f"LRA-{demo_shipment_id}",
        demo_shipment_id,
        Json([
            {"factor": "Temperature deviation (+2.4°C above max 13°C)", "impact": 25, "direction": "+", "detail": "Current reading 15.4°C exceeding 13.0°C ceiling for 42 contiguous minutes."},
            {"factor": "Refrigeration Unit OFF / Intermittent Inactivity", "impact": 20, "direction": "+", "detail": "Reefer power status dropped to OFF during transit sector Igatpuri-Kasara."},
            {"factor": "Cumulative thermal excursion duration (42 mins)", "impact": 15, "direction": "+", "detail": "Biological respiration rate acceleration calculated at 1.8x baseline."},
            {"factor": "Door opening / seal integrity breach", "impact": 10, "direction": "+", "detail": "Door open sensor triggered for 6 minutes during unscheduled roadside halt."},
            {"factor": "Remaining commercial shelf life compressed (21 hrs vs 18 hr ETA)", "impact": 8, "direction": "+", "detail": "Safety buffer collapsed below recommended 6-hour threshold."}
        ])
    ))

    # Seed assessments for other active shipments to enrich the fleet overview
    other_assessments = [
        ("AGRI-1002", "Mangoes", 1200.0, 22, "LOW", 144.0, 94.0, "NORMAL", 0, "STABLE", 11.8, 10.0, 13.0, "Normal cold-chain telemetry within optimal parameters.", 40.0, 3200.0),
        ("AGRI-1003", "Grapes", 800.0, 64, "MEDIUM", 48.0, 78.0, "EARLY_WARNING", 45, "RISING (+0.3°C/15m)", 2.8, 0.5, 3.0, "Approaching maximum safe threshold of 3.0°C with rising gradient.", 120.0, 10800.0),
        ("AGRI-1004", "Pomegranates", 1500.0, 15, "LOW", 210.0, 96.0, "NORMAL", 0, "STABLE", 6.2, 5.0, 8.0, "Excellent thermal compliance across entire transit corridor.", 0.0, 0.0),
        ("AGRI-1005", "Mixed Vegetables", 600.0, 88, "CRITICAL", 12.0, 42.0, "CRITICAL", 0, "HIGH_BREACH", 11.2, 4.0, 8.0, "Severe temperature excursion +3.2°C sustained for 95 minutes.", 350.0, 17500.0)
    ]

    for s_id, prod, qty, score, rlevel, slife, qual, ewarn, tbreach, trend, cur_temp, tmin, tmax, reason, av_kg, av_inr in other_assessments:
        if s_id in shipment_ids:
            cur.execute("""
                INSERT INTO loss_risk_assessments (
                    assessment_id, shipment_id, produce_name, total_quantity_kg,
                    loss_risk_score, risk_level, remaining_shelf_life_hours, expected_quality_pct,
                    early_warning_status, time_to_breach_minutes, temperature_trend,
                    current_temperature, target_temp_min, target_temp_max,
                    primary_risk_reason, risk_factors, recommended_action,
                    estimated_avoidable_loss_kg, estimated_avoidable_loss_inr, assessed_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                ) ON CONFLICT (assessment_id) DO UPDATE SET
                    loss_risk_score = EXCLUDED.loss_risk_score,
                    risk_level = EXCLUDED.risk_level,
                    remaining_shelf_life_hours = EXCLUDED.remaining_shelf_life_hours,
                    expected_quality_pct = EXCLUDED.expected_quality_pct,
                    early_warning_status = EXCLUDED.early_warning_status,
                    current_temperature = EXCLUDED.current_temperature,
                    primary_risk_reason = EXCLUDED.primary_risk_reason,
                    estimated_avoidable_loss_kg = EXCLUDED.estimated_avoidable_loss_kg,
                    estimated_avoidable_loss_inr = EXCLUDED.estimated_avoidable_loss_inr;
            """, (
                f"LRA-{s_id}", s_id, prod, qty, score, rlevel, slife, qual, ewarn, tbreach, trend, cur_temp, tmin, tmax, reason,
                Json([{"factor": "Baseline Telemetry", "impact": score, "direction": "+", "detail": reason}]),
                "Maintain active monitoring." if score < 50 else "Evaluate rerouting or reefer service.",
                av_kg, av_inr
            ))

    # 4. Seed What-If / Counterfactual Engine Scenarios for AGRI-1001
    print("\n[STEP 4] Seeding What-If Counterfactual Scenarios...")
    cur.execute("""
        INSERT INTO what_if_scenarios (
            scenario_id, shipment_id, scenario_title,
            actual_scenario, counterfactual_scenario,
            actual_usable_kg, counterfactual_usable_kg, avoidable_quantity_loss_kg,
            produce_unit_price_inr, estimated_financial_loss_inr,
            simulation_parameters, ai_confidence_score, disclaimer, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
        ) ON CONFLICT (scenario_id) DO UPDATE SET
            actual_scenario = EXCLUDED.actual_scenario,
            counterfactual_scenario = EXCLUDED.counterfactual_scenario,
            actual_usable_kg = EXCLUDED.actual_usable_kg,
            counterfactual_usable_kg = EXCLUDED.counterfactual_usable_kg,
            avoidable_quantity_loss_kg = EXCLUDED.avoidable_quantity_loss_kg,
            estimated_financial_loss_inr = EXCLUDED.estimated_financial_loss_inr,
            ai_confidence_score = EXCLUDED.ai_confidence_score;
    """, (
        f"WIF-{demo_shipment_id}-01",
        demo_shipment_id,
        "Counterfactual Analysis: Continuous Refrigeration vs Observed Compressor Inactivity",
        Json({
            "title": "Observed Actual Transit Conditions",
            "temperature_breach_duration": "3 hours 42 minutes (Cumulative)",
            "peak_temperature": "18.7°C (Target: 10.0–13.0°C)",
            "refrigeration_state": "OFF / Tripped between 14:15 and 17:57",
            "delivery_status": "Delayed transit with dock dwell time",
            "usable_quantity_kg": 650.0,
            "damaged_quantity_kg": 350.0,
            "quality_grade_retained": "65% (Grade B / Processing only)",
            "loss_value_inr": 17500.0
        }),
        Json({
            "title": "Counterfactual Corrective Baseline",
            "hypothesis": "If refrigeration compressor had maintained active cooling without power interruption...",
            "temperature_breach_duration": "0 minutes (Thermal compliance maintained)",
            "peak_temperature": "12.2°C (Within 10.0–13.0°C envelope)",
            "refrigeration_state": "Continuous ON at setpoint 11.5°C",
            "expected_usable_kg": 930.0,
            "expected_damaged_kg": 70.0,
            "expected_quality_retained": "93% (Premium Grade A Table Quality)",
            "loss_value_inr": 3500.0
        }),
        650.0,
        930.0,
        280.0, # 930 - 650 = 280 kg avoidable loss
        50.0,  # ₹50/kg
        14000.0, # 280 kg * ₹50 = ₹14,000
        Json({
            "produce": "Tomatoes",
            "decay_q10_factor": 1.8,
            "simulated_ambient_temp": 32.5,
            "model_type": "Biothermal Arrhenius Shelf-Life Model",
            "version": "AGRI-Predict-v3"
        }),
        91,
        "AI-assisted estimation model for decision support. Not a legal determination."
    ))

    # 5. Seed Intervention Recommendations for AGRI-1001
    print("\n[STEP 5] Seeding Intervention Recommendation Engine Options...")
    intervention_options = [
        {
            "option_id": "OPT-A",
            "title": "Option A — Continue Current Route",
            "action_type": "CONTINUE_ROUTE",
            "destination": "Mumbai APMC Market",
            "distance_km": 145.0,
            "eta_hours": 4.5,
            "expected_quality_pct": 65.0,
            "risk_level": "HIGH",
            "risk_color": "#F43F5E",
            "estimated_spoilage_kg": 350.0,
            "net_realized_revenue_inr": 32500.0,
            "additional_cost_inr": 0.0,
            "summary": "Full transit to original destination under compromised reefer performance results in extensive over-ripening and Grade B degradation."
        },
        {
            "option_id": "OPT-B",
            "title": "Option B — Emergency Reefer Reset & Servicing",
            "action_type": "REPAIR_REEFER",
            "destination": "Mumbai APMC Market (via Service Stop)",
            "distance_km": 152.0,
            "eta_hours": 5.2,
            "expected_quality_pct": 88.0,
            "risk_level": "LOW",
            "risk_color": "#10B981",
            "estimated_spoilage_kg": 120.0,
            "net_realized_revenue_inr": 44000.0,
            "additional_cost_inr": 2500.0,
            "summary": "Immediate 30-min authorized technician stop at Kasara Cold-Hub to restore compressor power and rapid pull-down."
        },
        {
            "option_id": "OPT-C",
            "title": "Option C — Redirect to Nearest Verified Buyer B",
            "action_type": "REDIRECT_BUYER",
            "destination": "Reliance Fresh Distribution Center (Thane)",
            "distance_km": 42.0,
            "eta_hours": 1.2,
            "expected_quality_pct": 93.0,
            "risk_level": "LOW",
            "risk_color": "#10B981",
            "estimated_spoilage_kg": 70.0,
            "net_realized_revenue_inr": 46500.0,
            "additional_cost_inr": 800.0,
            "summary": "Immediate offload to high-demand verified regional buyer in Thane. Prevents 280 kg of spoilage with 93% table-grade quality retention."
        },
        {
            "option_id": "OPT-D",
            "title": "Option D — Divert to Nearby Cold Storage Hub",
            "action_type": "COLD_STORAGE_DIVERT",
            "destination": "MahaCold Mega Facility Chamber 2 (Bhiwandi)",
            "distance_km": 38.0,
            "eta_hours": 1.1,
            "expected_quality_pct": 96.0,
            "risk_level": "LOW",
            "risk_color": "#10B981",
            "estimated_spoilage_kg": 40.0,
            "net_realized_revenue_inr": 48000.0,
            "additional_cost_inr": 1500.0,
            "summary": "Transfer cargo into certified pre-cooling chamber at 11°C. Preserves maximum commercial quality for next-day auction."
        }
    ]

    cur.execute("""
        INSERT INTO intervention_recommendations (
            intervention_id, shipment_id, produce_name, current_risk_score,
            options, recommended_option_id, recommended_action, recommendation_reason,
            action_status, outcome_summary, created_at, updated_at
        ) VALUES (
            %s, %s, 'Tomatoes', 78,
            %s, 'OPT-C',
            'Redirect to Nearest Verified Buyer B (Thane Distribution Hub)',
            'Lowest expected spoilage risk (70 kg vs 350 kg) and shortest remaining delivery window (1.2h vs 4.5h), protecting ₹14,000 in commercial produce value.',
            'PENDING', 'Intervention ready for farmer & logistics one-click authorization.',
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (intervention_id) DO UPDATE SET
            current_risk_score = EXCLUDED.current_risk_score,
            options = EXCLUDED.options,
            recommended_option_id = EXCLUDED.recommended_option_id,
            recommended_action = EXCLUDED.recommended_action,
            recommendation_reason = EXCLUDED.recommendation_reason;
    """, (
        f"INT-{demo_shipment_id}",
        demo_shipment_id,
        Json(intervention_options)
    ))

    # 6. Seed Digital Shipment Timeline Events (Rich timestamps)
    print("\n[STEP 6] Seeding Digital Shipment Timeline Events...")
    cur.execute("DELETE FROM shipment_events WHERE shipment_id = %s;", (demo_shipment_id,))

    timeline_events = [
        (
            demo_shipment_id, "FARMER_DISPATCH", "FARMER", "Nashik Farm Gate Hub",
            t_minus_10h,
            "Farmer dispatched 1,000 kg Premium Table Tomatoes at optimal temperature 11.2°C with pre-cooling receipt.",
            {"total_quantity_kg": 1000.0, "grade_a_kg": 850.0, "grade_b_kg": 150.0, "temperature_c": 11.2, "humidity_pct": 86.0, "notes": "Harvested early morning, loaded into pre-cooled reefer."}
        ),
        (
            demo_shipment_id, "FARMER_TO_LOGISTICS_HANDOVER", "LOGISTICS", "Nashik Highway Terminal",
            t_minus_10h + timedelta(hours=1, minutes=15),
            "Logistics carrier FTL-V001 took custody. 1,000 kg verified with photographic proof of seal #AGRI-SEAL-889.",
            {"vehicle_id": "FTL-V001", "carrier_name": "AgriCold Express Logistics", "driver": "Rajesh Kumar", "seal_id": "AGRI-SEAL-889", "handover_temperature": 11.4}
        ),
        (
            demo_shipment_id, "TELEMETRY_TEMPERATURE_BREACH", "SYSTEM_IOT", "Igatpuri Ghat Incline (GPS: 19.698°N, 73.559°E)",
            t_minus_10h + timedelta(hours=4, minutes=15),
            "⚠️ Temperature exceeded upper threshold of 13.0°C, recording 14.8°C with positive thermal velocity (+0.4°C/10m).",
            {"temperature_c": 14.8, "threshold_max_c": 13.0, "humidity_pct": 74.0, "speed_kmh": 42.0}
        ),
        (
            demo_shipment_id, "REEFER_STATUS_OFF", "SYSTEM_IOT", "Kasara Ghat Sector 2 (GPS: 19.652°N, 73.491°E)",
            t_minus_10h + timedelta(hours=4, minutes=20),
            "🚨 Refrigeration compressor status changed from RUNNING to OFF. Power draw dropped to 0.1 kW.",
            {"reefer_power": "OFF", "compressor_fault": "AUX_GEN_TRIP", "ambient_temp_c": 33.2}
        ),
        (
            demo_shipment_id, "DOOR_OPEN_UNSCHEDULED", "SYSTEM_IOT", "Kasara Roadside Layby (GPS: 19.641°N, 73.480°E)",
            t_minus_10h + timedelta(hours=5, minutes=10),
            "🚪 Rear cargo door opened during unscheduled 8-minute stop. Influx of warm ambient air detected.",
            {"door_duration_minutes": 8, "internal_temp_peak_c": 18.7, "door_sensor": "MAGNETIC_REAR_01"}
        ),
        (
            demo_shipment_id, "AI_EARLY_WARNING_TRIGGERED", "AGRITRUST_AI", "Kasara Monitoring Zone",
            t_minus_10h + timedelta(hours=5, minutes=15),
            "⚠️ Predictive Warning: Current temperature trend indicates 92% probability of severe biological spoilage within 45m.",
            {"predicted_loss_kg": 280.0, "risk_score": 78, "action_suggested": "Reroute to Buyer B"}
        ),
        (
            demo_shipment_id, "TEMPERATURE_RECOVERY", "SYSTEM_IOT", "Asangaon Toll Gate",
            t_minus_10h + timedelta(hours=7, minutes=57),
            "Refrigeration compressor manually re-engaged. Temperature pulled down back towards 12.8°C.",
            {"recovery_temp_c": 12.8, "cumulative_breach_minutes": 222}
        ),
        (
            demo_shipment_id, "BUYER_RECEIVING_INSPECTION", "BUYER", "Mumbai APMC Dock 4",
            t_minus_10h + timedelta(hours=9, minutes=30),
            "Buyer received cargo. Inspection logged: 650 kg acceptable table tomatoes, 350 kg overripe/softened Grade B with blemish.",
            {"received_quantity_kg": 1000.0, "grade_a_kg": 650.0, "damaged_grade_b_kg": 350.0, "intake_temp_c": 14.1, "receiving_status": "DISCREPANCY_FLAGGED"}
        )
    ]

    for s_id, etype, arole, loc, etime, edesc, edata in timeline_events:
        cur.execute("""
            INSERT INTO shipment_events (
                shipment_id, event_type, actor_role, location, event_timestamp, event_description, event_data
            ) VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (s_id, etype, arole, loc, etime, edesc, Json(edata)))

    # Ensure receiving record
    cur.execute("""
        INSERT INTO receiving_records (
            shipment_id, received_quantity, received_grade_a, received_grade_b, damaged_quantity,
            receiving_location, receiving_temperature, receiving_humidity, receiving_notes, received_by, received_at
        ) VALUES (
            %s, 1000.0, 650.0, 350.0, 350.0,
            'Mumbai APMC Dock 4', 14.1, 78.0,
            '350 kg soft/overripe due to transit thermal exposure. Requesting AI dispute investigation.',
            'Buyer_Mumbai_Central', %s
        ) ON CONFLICT DO NOTHING;
    """, (demo_shipment_id, t_minus_10h + timedelta(hours=9, minutes=30)))

    # 7. Seed AI Investigation Case & Dispute Record
    print("\n[STEP 7] Seeding AI Investigation Case & Evidence Dossier...")
    case_id = f"CASE-{demo_shipment_id}"
    dispute_id = f"DISP-{demo_shipment_id}"

    # Create dispute in disputes table
    cur.execute("""
        INSERT INTO disputes (
            dispute_id, shipment_id, raised_by_user_id, raised_by_role, against_role,
            dispute_category, claim_amount, description, status, ai_risk_score, ai_evidence_summary, created_at
        ) VALUES (
            %s, %s, 'usr_buyer_01', 'BUYER', 'LOGISTICS',
            'TEMPERATURE_EXCURSION', 14000.0,
            '350 kg quality loss observed at receiving dock due to sustained high temperature during transit.',
            'OPEN', 78,
            'AI Analysis indicates 3h 42m refrigeration outage during Kasara sector as primary probable contributing event.',
            CURRENT_TIMESTAMP
        ) ON CONFLICT (dispute_id) DO UPDATE SET
            status = 'OPEN',
            claim_amount = 14000.0,
            ai_risk_score = 78;
    """, (dispute_id, demo_shipment_id))

    # Create detailed investigation case
    cur.execute("""
        INSERT INTO investigation_cases (
            case_id, dispute_id, shipment_id, farmer_id, logistics_id, buyer_id,
            produce_name, original_quantity_kg, delivered_quantity_kg, damaged_quantity_kg,
            reported_issue, investigation_status, ai_confidence_score,
            detected_anomaly, probable_contributing_events,
            likely_loss_window_start, likely_loss_window_end,
            expected_usable_kg, actual_usable_kg, avoidable_loss_kg, estimated_financial_impact_inr,
            recommendation_summary, evidence_checklist, created_at, updated_at
        ) VALUES (
            %s, %s, %s, 'usr_farmer_01', 'usr_logistics_01', 'usr_buyer_01',
            'Tomatoes', 1000.0, 1000.0, 350.0,
            '350 kg quality loss reported by Buyer upon dock delivery inspection.',
            'AI_ANALYSIS_COMPLETE', 91,
            'Temperature exceeded target range (10.0–13.0°C) for a cumulative 3 hours 42 minutes, reaching peak 18.7°C.',
            %s,
            %s, %s,
            930.0, 650.0, 280.0, 14000.0,
            'Initiate logistics-stage review. Evidence indicates primary thermal excursion coincided with refrigeration compressor inactivity between 14:15 and 17:57. Counterfactual modeling shows 280 kg avoidable loss (₹14,000 value). Recommend mediation based on IoT telemetry audit logs.',
            %s,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (case_id) DO UPDATE SET
            investigation_status = EXCLUDED.investigation_status,
            ai_confidence_score = EXCLUDED.ai_confidence_score,
            detected_anomaly = EXCLUDED.detected_anomaly,
            probable_contributing_events = EXCLUDED.probable_contributing_events,
            expected_usable_kg = EXCLUDED.expected_usable_kg,
            actual_usable_kg = EXCLUDED.actual_usable_kg,
            avoidable_loss_kg = EXCLUDED.avoidable_loss_kg,
            estimated_financial_impact_inr = EXCLUDED.estimated_financial_impact_inr,
            recommendation_summary = EXCLUDED.recommendation_summary,
            evidence_checklist = EXCLUDED.evidence_checklist;
    """, (
        case_id, dispute_id, demo_shipment_id,
        Json([
            {"event": "Refrigeration Compressor Status: OFF", "source": "CAN-Bus Telemetry", "time": "14:20 PM – 17:57 PM", "relevance": "High probable contributing factor to thermal excursion."},
            {"event": "Unscheduled Door Open Event (8 mins)", "source": "Magnetic Door Sensor", "time": "15:10 PM", "relevance": "Accelerated internal cargo heating by +3.9°C."},
            {"event": "High Ambient Heat Exposure (33.2°C)", "source": "External IoT Probe", "time": "14:15 PM – 16:30 PM", "relevance": "Amplified heat infiltration through trailer envelope."}
        ]),
        t_minus_10h + timedelta(hours=4, minutes=15),
        t_minus_10h + timedelta(hours=7, minutes=57),
        Json([
            {"category": "Temperature Telemetry", "status": "VERIFIED", "source": "Sensirion SHT40 Core Sensor", "readings_analyzed": 144, "timestamp": "Continuous 5-second stream"},
            {"category": "GPS & Route Trace", "status": "VERIFIED", "source": "u-blox NEO-M9N GNSS", "readings_analyzed": 144, "timestamp": "Continuous geo-tracking"},
            {"category": "Door Security Sensor", "status": "VERIFIED", "source": "Hall-Effect Sensor D-1", "readings_analyzed": 1, "timestamp": "15:10 PM Door Open (8m)"},
            {"category": "Reefer Compressor Telemetry", "status": "VERIFIED", "source": "Carrier Transicold DataPort", "readings_analyzed": 42, "timestamp": "Trip at 14:20 PM"},
            {"category": "Farmer Dispatch Baseline", "status": "VERIFIED", "source": "Pre-cooling Receipt & Weight Slip", "readings_analyzed": 1, "timestamp": "10:00 AM (1,000 kg, 11.2°C)"},
            {"category": "Buyer Receiving Inspection", "status": "VERIFIED", "source": "APMC Digital Receipt & Photo", "readings_analyzed": 1, "timestamp": "19:30 PM (650 kg Grade A, 350 kg B)"},
            {"category": "Cryptographic Hash & Chain of Custody", "status": "VERIFIED", "source": "AGRITrust Merkle Proof", "readings_analyzed": 1, "timestamp": "SHA-256 Block 889240"}
        ])
    ))

    # Also seed investigation evidence items
    evidence_items = [
        ("EVD-001", case_id, "TELEMETRY_LOG", "Thermal Excursion Log (3h 42m Exceedance)", "IoT Ingestion Pipeline", t_minus_10h + timedelta(hours=4, minutes=15), {"sensor": "Temp Probe A", "peak_temp": 18.7, "target_max": 13.0}),
        ("EVD-002", case_id, "REEFER_STATUS", "Compressor Inactivity Record (Kasara Sector)", "Reefer CAN-Bus", t_minus_10h + timedelta(hours=4, minutes=20), {"power_draw_kw": 0.1, "fault_code": "COMP_POWER_CUT"}),
        ("EVD-003", case_id, "DOOR_EVENT", "Unscheduled Door Open Event (8 mins)", "Magnetic Sensor D-1", t_minus_10h + timedelta(hours=5, minutes=10), {"duration_sec": 480, "location": "Kasara Layby"}),
        ("EVD-004", case_id, "QUALITY_INSPECTION", "APMC Dock Intake Quality Discrepancy", "Buyer Terminal", t_minus_10h + timedelta(hours=9, minutes=30), {"grade_a_kg": 650, "grade_b_kg": 350, "discrepancy_kg": 350})
    ]

    for evid, cid, etyp, tit, src, trec, pay in evidence_items:
        cur.execute("""
            INSERT INTO investigation_evidence (
                evidence_item_id, case_id, evidence_type, title, source_component, timestamp_recorded, data_payload, verified
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
            ON CONFLICT (evidence_item_id) DO UPDATE SET
                title = EXCLUDED.title,
                data_payload = EXCLUDED.data_payload;
        """, (evid, cid, etyp, tit, src, trec, Json(pay)))

    # 8. Seed Aggregate Loss Analytics & Loss Prevention Score
    print("\n[STEP 8] Seeding Loss Prevention Fleet Analytics & Prevention Score (92/100)...")
    cur.execute("""
        INSERT INTO loss_prevention_metrics (
            metric_id, total_shipments_analyzed, high_risk_shipments_count,
            predicted_losses_inr, prevented_losses_inr, actual_losses_inr, avoidable_losses_inr,
            total_quantity_protected_kg, average_loss_risk_score, average_quality_score,
            loss_prevention_efficiency_score, score_breakdown, snapshot_date, created_at
        ) VALUES (
            'CURRENT_SNAPSHOT', 125, 12,
            690000.0, 280000.0, 145000.0, 410000.0,
            1240.0, 34.5, 87.2,
            92.0,
            %s,
            CURRENT_DATE, CURRENT_TIMESTAMP
        ) ON CONFLICT (metric_id) DO UPDATE SET
            total_shipments_analyzed = EXCLUDED.total_shipments_analyzed,
            high_risk_shipments_count = EXCLUDED.high_risk_shipments_count,
            predicted_losses_inr = EXCLUDED.predicted_losses_inr,
            prevented_losses_inr = EXCLUDED.prevented_losses_inr,
            actual_losses_inr = EXCLUDED.actual_losses_inr,
            avoidable_losses_inr = EXCLUDED.avoidable_losses_inr,
            total_quantity_protected_kg = EXCLUDED.total_quantity_protected_kg,
            average_loss_risk_score = EXCLUDED.average_loss_risk_score,
            average_quality_score = EXCLUDED.average_quality_score,
            loss_prevention_efficiency_score = EXCLUDED.loss_prevention_efficiency_score,
            score_breakdown = EXCLUDED.score_breakdown;
    """, (
        Json({
            "early_detection_score": 95,
            "early_detection_weight": 0.25,
            "early_detection_desc": "Proactive predictive alerts fired average 42 minutes before physical temperature threshold breach.",
            
            "corrective_action_score": 90,
            "corrective_action_weight": 0.25,
            "corrective_action_desc": "One-click intervention dispatch reduced reefer downtime response time from 3.5 hrs to 28 mins.",
            
            "thermal_exposure_mitigation": 88,
            "thermal_exposure_weight": 0.20,
            "thermal_exposure_desc": "84% of thermal deviation spikes stabilized within 35 minutes via dynamic rerouting or pre-cooling.",
            
            "spoilage_quantity_reduction": 94,
            "spoilage_quantity_weight": 0.20,
            "spoilage_quantity_desc": "1,240 kg of high-vulnerability perishables preserved across 12 high-risk transits.",
            
            "evidence_integrity_score": 96,
            "evidence_integrity_weight": 0.10,
            "evidence_integrity_desc": "100% telemetry continuity with zero packet gaps and cryptographic hash verification."
        }),
    ))

    conn.commit()
    cur.close()
    conn.close()

    print("\n" + "=" * 70)
    print(" [SUCCESS] AGRITRUST LOSS PREVENTION & INVESTIGATION ENGINE SEED COMPLETE!")
    print("=" * 70)

if __name__ == "__main__":
    run_migration_and_seed()
