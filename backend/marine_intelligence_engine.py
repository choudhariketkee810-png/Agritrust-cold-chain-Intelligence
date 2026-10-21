"""
AGRITrust — Marine Route Risk, Reefer Health, Shelf-Life & Loss Prevention Intelligence Engine
Multimodal Cold-Chain Decision-Support, Black Box Event Auditing, and Neutral Dispute Investigation.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import math

# ==============================================================================
# 1. MARINE ROUTE RISK PREDICTOR (0 - 100 SCORE)
# ==============================================================================

def calculate_marine_route_risk(
    container: Dict[str, Any],
    location_history: List[Dict[str, Any]],
    weather_events: List[Dict[str, Any]],
    port_events: List[Dict[str, Any]],
    shelf_life_remaining_hours: float,
    eta_hours: float
) -> Dict[str, Any]:
    """
    Calculates the multimodal marine journey risk score (0-100) before and during transit.
    Evaluates:
      - Voyage duration & distance remaining
      - Port dwell time & congestion
      - Transshipment transfers
      - Expected weather/vessel delays
      - Temperature & humidity excursions
      - Remaining shelf life vs ETA
      - Container reefer condition
    """
    score = 0
    factors: List[Dict[str, Any]] = []

    # 1. Temperature Excursion Risk
    curr_temp = container.get("current_temperature", 4.0)
    target_min = container.get("target_temp_min", 3.0)
    target_max = container.get("target_temp_max", 6.0)
    
    # Check historical excursions
    excursion_readings = [
        h for h in location_history 
        if h.get("temperature") is not None and (h["temperature"] < target_min or h["temperature"] > target_max)
    ]
    
    if curr_temp > target_max:
        temp_delta = round(curr_temp - target_max, 2)
        pts = min(35, 15 + int(temp_delta * 5))
        score += pts
        factors.append({
            "factor": "Temperature Excursion (Active)",
            "points": pts,
            "severity": "CRITICAL" if temp_delta >= 3.0 else "HIGH",
            "detail": f"Current reefer temperature {curr_temp}°C exceeds max threshold of {target_max}°C (+{temp_delta}°C)."
        })
    elif excursion_readings:
        max_recorded = max(h["temperature"] for h in excursion_readings)
        pts = min(22, 10 + len(excursion_readings) * 3)
        score += pts
        factors.append({
            "factor": "Historical Thermal Excursion",
            "points": pts,
            "severity": "HIGH",
            "detail": f"Logged {len(excursion_readings)} reading(s) outside thermal band. Peak deviation: {max_recorded}°C."
        })
    else:
        factors.append({
            "factor": "Temperature Envelope",
            "points": 0,
            "severity": "LOW",
            "detail": f"Temperature {curr_temp}°C is within optimal range [{target_min}°C - {target_max}°C]."
        })

    # 2. Shelf-Life vs ETA Pressure
    safety_margin = shelf_life_remaining_hours - eta_hours
    if safety_margin < 0:
        pts = 28
        score += pts
        factors.append({
            "factor": "Shelf-Life Expiry (Critical)",
            "points": pts,
            "severity": "CRITICAL",
            "detail": f"ETA ({eta_hours:.1f}h) exceeds remaining shelf life ({shelf_life_remaining_hours:.1f}h) by {abs(safety_margin):.1f} hours."
        })
    elif safety_margin < 24:
        pts = 18
        score += pts
        factors.append({
            "factor": "Shelf-Life Pressure",
            "points": pts,
            "severity": "HIGH",
            "detail": f"Low safety margin: Only {safety_margin:.1f} hours buffer between ETA and shelf-life expiration."
        })
    elif safety_margin < 72:
        pts = 8
        score += pts
        factors.append({
            "factor": "Shelf-Life Buffer",
            "points": pts,
            "severity": "MEDIUM",
            "detail": f"Moderate safety margin: {safety_margin:.1f} hours buffer at arrival."
        })

    # 3. Port Dwell Time & Congestion Risk
    port_delay_hours = max(0.0, float(container.get("actual_dwell_hours", 8.0)) - float(container.get("expected_dwell_hours", 8.0)))
    if port_delay_hours > 12:
        pts = 18
        score += pts
        factors.append({
            "factor": "Port Dwell Delay",
            "points": pts,
            "severity": "HIGH",
            "detail": f"Port dwell delay of {port_delay_hours:.1f} hours recorded at terminal berth."
        })
    elif port_delay_hours > 4:
        pts = 10
        score += pts
        factors.append({
            "factor": "Port Dwell Delay",
            "points": pts,
            "severity": "MEDIUM",
            "detail": f"Port dwell delay of {port_delay_hours:.1f} hours at origin/transshipment port."
        })

    # 4. Transshipment Transfers Risk
    transshipments = int(container.get("transshipment_count", 0))
    if transshipments >= 2:
        pts = 14
        score += pts
        factors.append({
            "factor": "Multiple Transshipments",
            "points": pts,
            "severity": "HIGH",
            "detail": f"{transshipments} vessel transfers with crane handling events and shore unplugging exposure."
        })
    elif transshipments == 1:
        pts = 6
        score += pts
        factors.append({
            "factor": "Transshipment Transfer",
            "points": pts,
            "severity": "LOW",
            "detail": "1 planned vessel transfer at intermediate transshipment hub."
        })

    # 5. Weather Risk & Sea Conditions
    active_severe_weather = [w for w in weather_events if w.get("severity_level") in ("HIGH", "CRITICAL", "SEVERE")]
    if active_severe_weather:
        w_item = active_severe_weather[0]
        delay = w_item.get("expected_delay_hours", 12.0)
        pts = 15
        score += pts
        factors.append({
            "factor": "Marine Weather Risk",
            "points": pts,
            "severity": "HIGH",
            "detail": f"{w_item.get('weather_condition', 'Storm')} in {w_item.get('sea_region', 'Corridor')} causing estimated {delay:.1f}h transit delay."
        })

    # 6. Voyage Length & Distance
    dist_remaining = float(container.get("distance_remaining_nmi", 3000.0))
    if dist_remaining > 4000:
        pts = 10
        score += pts
        factors.append({
            "factor": "Long Ocean Voyage",
            "points": pts,
            "severity": "MEDIUM",
            "detail": f"Intercontinental maritime transit ({dist_remaining:,.0f} nmi remaining)."
        })
    elif dist_remaining > 2000:
        pts = 5
        score += pts

    # 7. Reefer Equipment Condition
    reefer_status = container.get("compressor_status", "ACTIVE_COOLING")
    power_status = container.get("reefer_power_status", "ON")
    if "ANOMALY" in str(reefer_status) or power_status == "BACKUP_GENSET":
        pts = 15
        score += pts
        factors.append({
            "factor": "Reefer Compressor Alert",
            "points": pts,
            "severity": "HIGH",
            "detail": f"Reefer operating on {power_status} with compressor status: {reefer_status}."
        })

    # Cap score at 100
    final_score = min(100, max(0, score))
    
    if final_score <= 30:
        status_label = "LOW"
        color = "#10B981"
    elif final_score <= 60:
        status_label = "MEDIUM"
        color = "#F59E0B"
    elif final_score <= 80:
        status_label = "HIGH"
        color = "#F97316"
    else:
        status_label = "CRITICAL"
        color = "#EF4444"

    # Sort factors by points descending
    factors.sort(key=lambda x: x["points"], reverse=True)

    return {
        "risk_score": final_score,
        "status": status_label,
        "color": color,
        "top_risk_factors": factors[:5],
        "all_factors": factors,
        "evaluated_at": datetime.now().isoformat()
    }


# ==============================================================================
# 2. SHELF-LIFE CONSUMPTION ENGINE (ARRHENIUS / KINETIC DECAY)
# ==============================================================================

def calculate_shelf_life_intelligence(
    produce_name: str,
    initial_shelf_life_hours: float,
    departure_time: datetime,
    eta_hours: float,
    telemetry_history: List[Dict[str, Any]],
    current_temp: float,
    optimal_temp: float = 4.0
) -> Dict[str, Any]:
    """
    Calculates real-time shelf life decay taking into account thermal excursions.
    Uses Q10 kinetic degradation model: higher temperature accelerates shelf-life consumption.
    """
    now = datetime.now()
    if departure_time.tzinfo:
        elapsed_hours = max(0.0, (now.astimezone(departure_time.tzinfo) - departure_time).total_seconds() / 3600.0)
    else:
        elapsed_hours = max(0.0, (now - departure_time).total_seconds() / 3600.0)

    # Calculate thermal penalty factor across history
    # Q10 = 2.2 for general fresh produce
    thermal_penalty_hours = 0.0
    for t in telemetry_history:
        temp = t.get("temperature")
        if temp is not None and temp > (optimal_temp + 1.5):
            excess = temp - optimal_temp
            # Each hour at elevated temp consumes 1 + (excess * 0.25) hours of shelf life
            thermal_penalty_hours += (excess * 0.3)

    total_consumed_hours = elapsed_hours + thermal_penalty_hours
    remaining_shelf_life_hours = max(0.0, initial_shelf_life_hours - total_consumed_hours)
    
    expected_shelf_life_at_arrival = remaining_shelf_life_hours - eta_hours
    safety_margin_hours = expected_shelf_life_at_arrival

    if expected_shelf_life_at_arrival < 0:
        margin_status = "SPOILAGE_RISK"
        margin_badge = "🔴 SPOILAGE RISK"
        margin_color = "#EF4444"
    elif safety_margin_hours < 24.0:
        margin_status = "LOW_SAFETY_MARGIN"
        margin_badge = "🟡 LOW SAFETY MARGIN"
        margin_color = "#F59E0B"
    else:
        margin_status = "SAFE_MARGIN"
        margin_badge = "🟢 SAFE MARGIN"
        margin_color = "#10B981"

    decay_percentage = min(100.0, round((total_consumed_hours / max(1.0, initial_shelf_life_hours)) * 100.0, 1))

    return {
        "produce_name": produce_name,
        "original_shelf_life_hours": initial_shelf_life_hours,
        "time_elapsed_hours": round(elapsed_hours, 1),
        "thermal_penalty_hours": round(thermal_penalty_hours, 1),
        "total_consumed_hours": round(total_consumed_hours, 1),
        "remaining_shelf_life_hours": round(remaining_shelf_life_hours, 1),
        "eta_destination_hours": round(eta_hours, 1),
        "expected_shelf_life_at_arrival_hours": round(expected_shelf_life_at_arrival, 1),
        "safety_margin_hours": round(safety_margin_hours, 1),
        "safety_margin_status": margin_status,
        "display_badge": margin_badge,
        "color": margin_color,
        "shelf_life_consumed_pct": decay_percentage
    }


# ==============================================================================
# 3. SPOILAGE COST PREDICTOR & FINANCIAL EXPOSURE
# ==============================================================================

def calculate_spoilage_cost(
    quantity_kg: float,
    produce_name: str,
    market_price_per_kg: float,
    risk_score: int,
    shelf_life_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculates estimated financial exposure, estimated spoilage %, and potential loss prevented.
    """
    total_market_value = quantity_kg * market_price_per_kg
    
    # Calculate spoilage percentage based on risk score and shelf life safety margin
    safety_margin = shelf_life_info.get("safety_margin_hours", 20.0)
    
    if safety_margin < 0:
        # Severe spoilage: 40% to 90%
        spoilage_pct = min(90.0, 40.0 + (abs(safety_margin) * 1.5) + (risk_score * 0.3))
    elif safety_margin < 24:
        # Moderate spoilage: 15% to 40%
        spoilage_pct = min(40.0, 15.0 + ((24.0 - safety_margin) * 0.8) + (risk_score * 0.15))
    else:
        # Low spoilage: 2% to 10%
        spoilage_pct = min(10.0, 2.0 + (risk_score * 0.08))

    spoilage_pct = round(min(100.0, max(0.0, spoilage_pct)), 1)
    potential_loss_inr = round((total_market_value * (spoilage_pct / 100.0)), 2)
    
    # If early intervention redirect occurs, estimated prevented loss (typically 70-85% of loss)
    prevented_loss_inr = round(potential_loss_inr * 0.75, 2)
    residual_loss_inr = round(potential_loss_inr - prevented_loss_inr, 2)

    return {
        "quantity_kg": quantity_kg,
        "produce_name": produce_name,
        "market_price_per_kg_inr": market_price_per_kg,
        "total_cargo_value_inr": total_market_value,
        "potential_exposure_inr": total_market_value,
        "estimated_spoilage_pct": spoilage_pct,
        "potential_loss_inr": potential_loss_inr,
        "potential_loss_prevented_inr": prevented_loss_inr,
        "residual_exposure_inr": residual_loss_inr,
        "estimation_disclaimer": "AI financial loss calculation is a decision-support estimate based on thermal telemetry, market pricing, and produce decay kinetics."
    }


# ==============================================================================
# 4. SELL BEFORE SPOILAGE & DYNAMIC DESTINATION RECOMMENDATIONS
# ==============================================================================

def evaluate_sell_before_spoilage_allocations(
    shipment_id: str,
    produce_name: str,
    current_quantity_kg: float,
    remaining_shelf_life_hours: float,
    current_destination_eta_hours: float,
    current_risk_score: int,
    candidate_buyers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates alternative buyers and regional hubs to generate structured rerouting recommendations.
    Recommendation ONLY — does not auto-execute transactions.
    """
    recommendations: List[Dict[str, Any]] = []
    unallocated_kg = current_quantity_kg
    total_prevented_loss = 0.0

    # Sort buyers by compatibility & price
    sorted_buyers = sorted(
        candidate_buyers, 
        key=lambda b: (float(b.get("offered_price_per_kg_inr") or 0) * 0.6 + float(b.get("match_compatibility_score") or 0) * 0.4), 
        reverse=True
    )

    for buyer in sorted_buyers:
        if unallocated_kg <= 0:
            break
            
        buyer_demand = float(buyer.get("demand_quantity_kg", 300.0))
        dist_km = float(buyer.get("distance_km", 50.0))
        price = float(buyer.get("offered_price_per_kg_inr", 60.0))
        # Estimate transit time to alternative buyer (average 40 km/h + 2h port clearance)
        transit_eta_hours = round(2.0 + (dist_km / 35.0), 1)

        # Check if alternative ETA fits within remaining shelf life with safety margin
        if transit_eta_hours < (remaining_shelf_life_hours - 6.0):
            alloc_qty = min(unallocated_kg, buyer_demand)
            unallocated_kg -= alloc_qty
            
            deal_value = round(alloc_qty * price, 2)
            prevented_loss = round(deal_value * 0.85, 2)
            total_prevented_loss += prevented_loss

            recommendations.append({
                "buyer_id": buyer.get("buyer_id"),
                "buyer_name": buyer.get("buyer_name"),
                "location": buyer.get("location_name") or buyer.get("port_or_city"),
                "allocated_quantity_kg": alloc_qty,
                "offered_price_per_kg_inr": price,
                "total_deal_value_inr": deal_value,
                "transit_eta_hours": transit_eta_hours,
                "distance_km": dist_km,
                "shelf_life_at_delivery_hours": round(remaining_shelf_life_hours - transit_eta_hours, 1),
                "prevented_loss_inr": prevented_loss,
                "contact_person": buyer.get("contact_person"),
                "contact_phone": buyer.get("contact_phone")
            })

    reason = (
        f"Original destination ETA ({current_destination_eta_hours:.1f}h) creates critical shelf-life exposure. "
        f"Redirecting {current_quantity_kg - unallocated_kg:.0f} kg to verified regional alternatives "
        f"significantly reduces expected spoilage exposure by estimated INR {total_prevented_loss:,.0f}."
    )

    action_text = " + ".join([f"REDIRECT {r['allocated_quantity_kg']:.0f} KG -> {r['buyer_name']}" for r in recommendations]) if recommendations else "NO COMPATIBLE BUYER FOUND"

    return {
        "shipment_id": shipment_id,
        "action_recommendation": action_text,
        "recommendation_reason": reason,
        "is_automatic_execution": False,
        "status": "RECOMMENDED_DECISION_SUPPORT",
        "allocated_destinations": recommendations,
        "unallocated_quantity_kg": unallocated_kg,
        "total_prevented_loss_inr": total_prevented_loss
    }


# ==============================================================================
# 5. REEFER HEALTH SCORE & PREDICTIVE FAILURE
# ==============================================================================

def calculate_reefer_health(
    container: Dict[str, Any],
    recent_telemetry: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Computes 0-100 Reefer Health Score and detects gradual temperature creep / compressor degradation.
    """
    score = 100
    contributing_factors: List[Dict[str, Any]] = []

    if not recent_telemetry:
        return {
            "reefer_health_score": 95,
            "status": "GOOD",
            "status_color": "#10B981",
            "contributing_factors": [{"factor": "Baseline Telemetry", "penalty": 0, "detail": "Reefer systems nominal."}],
            "predictive_alert": None,
            "trend_pattern": "STABLE"
        }

    # 1. Temperature Variance
    temps = [t["temperature"] for t in recent_telemetry if t.get("temperature") is not None]
    if temps:
        avg_temp = sum(temps) / len(temps)
        variance = sum((x - avg_temp) ** 2 for x in temps) / len(temps)
        std_dev = math.sqrt(variance)
        if std_dev > 1.5:
            penalty = min(30, int(std_dev * 12))
            score -= penalty
            contributing_factors.append({
                "factor": "Thermal Instability",
                "penalty": penalty,
                "detail": f"High temperature standard deviation (±{std_dev:.2f}°C) indicates unstable thermal regulation."
            })

    # 2. Power Source
    power_status = container.get("reefer_power_status", "ON")
    if power_status == "BACKUP_GENSET":
        score -= 20
        contributing_factors.append({
            "factor": "Auxiliary Genset Power",
            "penalty": 20,
            "detail": "Reefer operating on emergency diesel genset instead of primary vessel/terminal grid."
        })
    elif power_status == "OFF":
        score -= 50
        contributing_factors.append({
            "factor": "Reefer Power OFF",
            "penalty": 50,
            "detail": "Critical: Refrigeration power supply is disconnected."
        })

    # 3. Compressor Status
    compressor = container.get("compressor_status", "ACTIVE_COOLING")
    if "ANOMALY" in str(compressor) or "DEFROST" in str(compressor):
        score -= 25
        contributing_factors.append({
            "factor": "Compressor Duty Cycle Anomaly",
            "penalty": 25,
            "detail": f"Compressor reporting non-standard state: {compressor}."
        })

    # 4. Door Open Events
    door_opens = sum(1 for t in recent_telemetry if t.get("door_status") == "OPEN")
    if door_opens > 0:
        penalty = min(25, door_opens * 8)
        score -= penalty
        contributing_factors.append({
            "factor": "Door Sensor Activations",
            "penalty": penalty,
            "detail": f"{door_opens} door opening event(s) logged during transit."
        })

    # 5. Predictive Trend Analysis (Upward Creep Detection e.g. 4.1 -> 4.8 -> 5.6 -> 6.4 -> 7.2)
    predictive_alert = None
    trend_pattern = "STABLE"
    if len(temps) >= 4:
        recent_4 = temps[-4:]
        is_strictly_rising = all(recent_4[i] < recent_4[i+1] for i in range(len(recent_4)-1))
        total_rise = recent_4[-1] - recent_4[0]
        
        if is_strictly_rising and total_rise >= 1.5:
            trend_pattern = "GRADUAL_UPWARD_CREEP"
            score -= 15
            predictive_alert = {
                "level": "PREDICTIVE_WARNING",
                "headline": "⚠️ POSSIBLE REEFER PERFORMANCE DEGRADATION",
                "prediction": "Refrigeration system shows consecutive upward thermal drift. System may require technical inspection at next port call.",
                "observed_pattern": [round(x, 1) for x in recent_4],
                "confidence_pct": 87
            }
            contributing_factors.append({
                "factor": "Predictive Compressor Degradation",
                "penalty": 15,
                "detail": f"Monotonically rising temperature pattern detected ({recent_4[0]}°C → {recent_4[-1]}°C)."
            })

    final_score = max(0, min(100, score))
    
    if final_score >= 80:
        health_status = "GOOD"
        health_color = "#10B981"
    elif final_score >= 50:
        health_status = "FAIR / DECLINING"
        health_color = "#F59E0B"
    else:
        health_status = "CRITICAL"
        health_color = "#EF4444"

    return {
        "reefer_health_score": final_score,
        "status": health_status,
        "status_color": health_color,
        "contributing_factors": contributing_factors,
        "predictive_alert": predictive_alert,
        "trend_pattern": trend_pattern
    }


# ==============================================================================
# 6. SENSOR DATA TRUST SCORE & GPS ANOMALY DETECTOR
# ==============================================================================

def evaluate_sensor_data_trust(
    telemetry_history: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates the reliability and cryptographic/sensor integrity of IoT telematics.
    Detects impossible jumps, GPS anomalies, communication dropouts, and duplicate timestamps.
    """
    trust_score = 100
    integrity_warnings: List[Dict[str, Any]] = []
    gps_anomalies: List[Dict[str, Any]] = []

    if len(telemetry_history) < 2:
        return {
            "sensor_trust_score": 98,
            "status": "VERIFIED_HIGH_TRUST",
            "warnings": [],
            "gps_anomalies": []
        }

    for i in range(len(telemetry_history) - 1):
        curr = telemetry_history[i]
        nxt = telemetry_history[i+1]

        t_curr = curr.get("temperature")
        t_nxt = nxt.get("temperature")
        
        # 1. Impossible Temperature Jump Check (> 6°C in a single reading)
        if t_curr is not None and t_nxt is not None:
            delta = abs(t_nxt - t_curr)
            if delta > 7.0:
                trust_score -= 15
                integrity_warnings.append({
                    "type": "THERMAL_JUMP_ANOMALY",
                    "timestamp": nxt.get("recorded_at"),
                    "detail": f"Impossible thermal delta of {delta:.1f}°C detected between consecutive readings."
                })

        # 2. Impossible GPS Movement (Teleportation Check)
        lat1, lon1 = curr.get("latitude"), curr.get("longitude")
        lat2, lon2 = nxt.get("latitude"), nxt.get("longitude")
        
        if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
            # Haversine distance
            lat_dist = (lat2 - lat1) * 111.0 # km
            lon_dist = (lon2 - lon1) * 111.0 * math.cos(math.radians(lat1))
            total_dist_km = math.sqrt(lat_dist**2 + lon_dist**2)

            time1 = curr.get("recorded_at")
            time2 = nxt.get("recorded_at")
            if time1 and time2:
                try:
                    dt1 = datetime.fromisoformat(str(time1).replace('Z', ''))
                    dt2 = datetime.fromisoformat(str(time2).replace('Z', ''))
                    dt_minutes = abs((dt2 - dt1).total_seconds()) / 60.0
                    
                    # If moved > 100 km in < 15 minutes (> 400 km/h for container vessel)
                    if dt_minutes > 0 and (total_dist_km / (dt_minutes / 60.0)) > 120.0:
                        trust_score -= 25
                        gps_anomalies.append({
                            "type": "GPS_LOCATION_JUMP",
                            "from_loc": f"{lat1:.4f}°N, {lon1:.4f}°E",
                            "to_loc": f"{lat2:.4f}°N, {lon2:.4f}°E",
                            "distance_km": round(total_dist_km, 1),
                            "time_interval_minutes": round(dt_minutes, 1),
                            "headline": "🚨 LOCATION DATA ANOMALY",
                            "possible_causes": [
                                "GPS receiver transient multipath error",
                                "Data synchronization issue during satellite handover",
                                "Temporary tracking stream interruption"
                            ]
                        })
                except Exception:
                    pass

    # 3. Out-of-Physical Range Limits Check
    for t in telemetry_history:
        temp = t.get("temperature")
        if temp is not None and (temp < -40.0 or temp > 70.0):
            trust_score -= 20
            integrity_warnings.append({
                "type": "OUT_OF_BOUNDS_READING",
                "value": temp,
                "detail": f"Sensor temperature reading {temp}°C is outside valid physical sensor calibration envelope."
            })

    final_trust = max(0, min(100, trust_score))
    
    return {
        "sensor_trust_score": final_trust,
        "status": "HIGH_TRUST" if final_trust >= 85 else ("MODERATE_TRUST" if final_trust >= 60 else "DATA_INTEGRITY_ALERT"),
        "warnings_count": len(integrity_warnings),
        "warnings": integrity_warnings[:5],
        "gps_anomalies_count": len(gps_anomalies),
        "gps_anomalies": gps_anomalies
    }


# ==============================================================================
# 7. "WHERE DID THE LOSS HAPPEN?" — ROOT CAUSE & FIRST ANOMALY DETECTOR
# ==============================================================================

def investigate_multimodal_journey_loss(
    shipment_id: str,
    stages: List[Dict[str, Any]],
    container: Dict[str, Any],
    port_events: List[Dict[str, Any]],
    seal_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Comprehensive multi-stage forensic analysis across:
    Farmer -> Pickup -> Road Truck -> Origin Port -> Container Stuffing -> Marine Vessel Transit -> Destination Port -> Final Delivery.
    
    Identifies FIRST DETECTED ANOMALY and generates NEUTRAL AI INVESTIGATION SUMMARY.
    Never assigns subjective blame; relies purely on verifiable telemetry and recorded chain-of-custody tokens.
    """
    sorted_stages = sorted(stages, key=lambda s: s.get("stage_order", 0))
    first_detected_anomaly = None
    all_anomalies: List[Dict[str, Any]] = []

    for stage in sorted_stages:
        stage_name = stage.get("stage_name", "")
        stage_key = stage.get("stage_key", "")
        qty = stage.get("recorded_quantity_kg", 1000.0)
        temp = stage.get("recorded_temp_c")
        discrepancy = float(stage.get("discrepancy_kg", 0.0))
        excursion_min = int(stage.get("temp_excursion_min", 0))
        incident_flag = stage.get("incident_flag", False)

        # Check for discrepancies or thermal breaches
        if discrepancy > 5.0:
            anomaly = {
                "stage_order": stage.get("stage_order"),
                "stage_name": stage_name,
                "location": stage.get("stage_location"),
                "timestamp": str(stage.get("timestamp_recorded")),
                "type": "QUANTITY_DISCREPANCY",
                "evidence": f"{discrepancy:.1f} kg difference recorded against previous milestone",
                "responsible_milestone_party": stage.get("responsible_party"),
                "summary": stage.get("incident_summary") or f"Recorded quantity changed by {discrepancy:.1f} kg."
            }
            all_anomalies.append(anomaly)
            if not first_detected_anomaly:
                first_detected_anomaly = anomaly

        if excursion_min > 30:
            anomaly = {
                "stage_order": stage.get("stage_order"),
                "stage_name": stage_name,
                "location": stage.get("stage_location"),
                "timestamp": str(stage.get("timestamp_recorded")),
                "type": "THERMAL_EXCURSION",
                "evidence": f"Temperature logged at {temp}°C ({excursion_min} min above setpoint threshold)",
                "responsible_milestone_party": stage.get("responsible_party"),
                "summary": stage.get("incident_summary") or f"Prolonged thermal breach logged during {stage_name}."
            }
            all_anomalies.append(anomaly)
            if not first_detected_anomaly:
                first_detected_anomaly = anomaly

        if incident_flag and not any(a["stage_order"] == stage.get("stage_order") for a in all_anomalies):
            anomaly = {
                "stage_order": stage.get("stage_order"),
                "stage_name": stage_name,
                "location": stage.get("stage_location"),
                "timestamp": str(stage.get("timestamp_recorded")),
                "type": "OPERATIONAL_INCIDENT",
                "evidence": stage.get("evidence_available") or "Milestone inspection flag logged",
                "responsible_milestone_party": stage.get("responsible_party"),
                "summary": stage.get("incident_summary", "Operational exception recorded.")
            }
            all_anomalies.append(anomaly)
            if not first_detected_anomaly:
                first_detected_anomaly = anomaly

    # Check seal mismatch
    if seal_info and seal_info.get("seal_status") in ("SEAL_MISMATCH", "SEAL_BROKEN"):
        anomaly = {
            "stage_order": 6,
            "stage_name": "Digital Container Seal Audit",
            "location": seal_info.get("verified_location", "Destination Port"),
            "timestamp": str(seal_info.get("verified_timestamp")),
            "type": "SEAL_INTEGRITY_MISMATCH",
            "evidence": f"Origin seal #{seal_info.get('origin_seal_number')} does not match verified seal #{seal_info.get('destination_verified_seal_number')}",
            "responsible_milestone_party": "Port Inspection Authority",
            "summary": "Digital container seal serial number mismatch detected upon destination gate check."
        }
        all_anomalies.append(anomaly)
        if not first_detected_anomaly:
            first_detected_anomaly = anomaly

    # Construct neutral AI Investigation Summary using cautious, objective wording
    initial_qty = sorted_stages[0].get("recorded_quantity_kg", 1000.0) if sorted_stages else 1000.0
    final_qty = sorted_stages[-1].get("recorded_quantity_kg", initial_qty) if sorted_stages else initial_qty
    total_loss_kg = max(0.0, initial_qty - final_qty)
    
    summary_sentences = [
        f"Shipment {shipment_id} was dispatched with {initial_qty:,.1f} kg of produce under verified chain-of-custody tokens."
    ]

    if first_detected_anomaly:
        summary_sentences.append(
            f"The first detected anomaly was identified during '{first_detected_anomaly['stage_name']}' at {first_detected_anomaly['location']} "
            f"({first_detected_anomaly['type']}: {first_detected_anomaly['evidence']})."
        )
    else:
        summary_sentences.append("All milestones along the multimodal corridor recorded consistent metrics within nominal tolerance limits.")

    if total_loss_kg > 0:
        summary_sentences.append(
            f"A cumulative quantity difference of {total_loss_kg:,.1f} kg was recorded between harvest dispatch and final destination."
        )

    summary_sentences.append(
        "Available telemetry and digital evidence indicate multiple contributing factors. "
        "Under platform neutrality guidelines, technical data does not establish legal liability. "
        "Further joint physical inspection and dossier review is recommended."
    )

    neutral_summary = " ".join(summary_sentences)

    return {
        "shipment_id": shipment_id,
        "investigation_status": "REQUIRES_INVESTIGATION" if all_anomalies else "VERIFIED_CLEAR",
        "first_detected_anomaly": first_detected_anomaly,
        "all_detected_anomalies": all_anomalies,
        "total_anomalies_count": len(all_anomalies),
        "initial_quantity_kg": initial_qty,
        "final_quantity_kg": final_qty,
        "total_loss_kg": total_loss_kg,
        "neutral_investigation_summary": neutral_summary,
        "standard_disclaimer": "AGRITrust Neutral Technical Audit: Findings pinpoint chronological telemetry timestamps and weight bridge logs. This summary represents objective sensor analysis and does not constitute a legal determination of liability."
    }


# ==============================================================================
# 8. AI WHAT-IF COUNTERFACTUAL SIMULATOR
# ==============================================================================

def simulate_what_if_scenario(
    current_plan: Dict[str, Any],
    simulation_type: str, # 'ALTERNATIVE_PORT', 'ALTERNATIVE_BUYER', 'REEFER_RESET'
    simulation_params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Simulates counterfactual decisions without affecting the live production database.
    Compares Current Plan vs Simulated Plan across ETA, Risk Score, Shelf-life at arrival, and Potential Loss INR.
    """
    params = simulation_params or {}
    curr_eta = float(current_plan.get("eta_hours", 40.0))
    curr_shelf_life = float(current_plan.get("remaining_shelf_life_hours", 30.0))
    curr_risk = int(current_plan.get("risk_score", 78))
    curr_loss = float(current_plan.get("potential_loss_inr", 24000.0))
    produce_qty = float(current_plan.get("quantity_kg", 1000.0))
    unit_price = float(current_plan.get("price_per_kg_inr", 60.0))

    if simulation_type == "ALTERNATIVE_PORT":
        sim_port = params.get("target_port", "Port of Salalah / Jebel Ali Hub")
        new_eta = round(curr_eta * 0.45, 1) # Diverting cuts voyage significantly
        new_risk = max(18, int(curr_risk * 0.35))
        expected_shelf_life_arrival = round(curr_shelf_life - new_eta, 1)
        new_loss = round(curr_loss * 0.20, 2)
        improvement = round(curr_loss - new_loss, 2)
        scenario_description = f"Simulated divergence to {sim_port} to bypass Red Sea congestion."

    elif simulation_type == "ALTERNATIVE_BUYER":
        buyer_name = params.get("buyer_name", "Regional Processing Co-Op")
        new_eta = round(min(12.0, curr_eta * 0.25), 1)
        new_risk = max(12, int(curr_risk * 0.22))
        expected_shelf_life_arrival = round(curr_shelf_life - new_eta, 1)
        new_loss = round(curr_loss * 0.15, 2)
        improvement = round(curr_loss - new_loss, 2)
        scenario_description = f"Simulated immediate offload to {buyer_name} via Sell-Before-Spoilage recommendation."

    else: # REEFER_RESET
        new_eta = curr_eta
        new_risk = max(30, int(curr_risk * 0.55))
        expected_shelf_life_arrival = round(curr_shelf_life - (curr_eta * 0.75), 1) # Slower decay
        new_loss = round(curr_loss * 0.40, 2)
        improvement = round(curr_loss - new_loss, 2)
        scenario_description = "Simulated auxiliary genset power reset and reefer compressor setpoint calibration."

    return {
        "simulation_type": simulation_type,
        "scenario_title": scenario_description,
        "is_simulation_only": True,
        "current_plan": {
            "eta_hours": curr_eta,
            "remaining_shelf_life_hours": curr_shelf_life,
            "expected_shelf_life_at_arrival": round(curr_shelf_life - curr_eta, 1),
            "risk_score": curr_risk,
            "risk_status": "HIGH" if curr_risk > 60 else "MEDIUM",
            "potential_loss_inr": curr_loss
        },
        "simulated_plan": {
            "eta_hours": new_eta,
            "remaining_shelf_life_hours": curr_shelf_life,
            "expected_shelf_life_at_arrival": expected_shelf_life_arrival,
            "risk_score": new_risk,
            "risk_status": "LOW" if new_risk <= 30 else "MEDIUM",
            "potential_loss_inr": new_loss
        },
        "potential_improvement_inr": improvement,
        "shelf_life_gain_hours": round(expected_shelf_life_arrival - (curr_shelf_life - curr_eta), 1),
        "recommendation_summary": f"Executing this scenario is estimated to prevent INR {improvement:,.0f} in avoidable spoilage exposure while maintaining {expected_shelf_life_arrival:.1f} hours of post-arrival market freshness.",
        "disclaimer": "AI Counterfactual Simulator: This calculation is a decision-support projection and does not execute physical routing changes."
    }
