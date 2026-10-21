import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# ====================================================================
# PRODUCE BASELINE SHELF-LIFE PROFILES (at standard optimal cold storage)
# ====================================================================
PRODUCE_PROFILES: Dict[str, Dict[str, Any]] = {
    "TOMATO": {
        "optimal_temp": 12.0,
        "max_safe_temp": 14.0,
        "min_safe_temp": 10.0,
        "baseline_shelf_life_hours": 42.0,  # ~1.75 days for ripe table tomatoes in transit
        "q10_decay_factor": 1.8,            # Rate acceleration per 10°C above optimal
        "optimal_humidity": 85.0
    },
    "MANGO": {
        "optimal_temp": 11.5,
        "max_safe_temp": 13.0,
        "min_safe_temp": 10.0,
        "baseline_shelf_life_hours": 168.0, # 7 days
        "q10_decay_factor": 2.2,
        "optimal_humidity": 88.0
    },
    "GRAPES": {
        "optimal_temp": 1.5,
        "max_safe_temp": 3.0,
        "min_safe_temp": 0.5,
        "baseline_shelf_life_hours": 120.0, # 5 days
        "q10_decay_factor": 2.5,
        "optimal_humidity": 90.0
    },
    "POMEGRANATE": {
        "optimal_temp": 6.0,
        "max_safe_temp": 8.0,
        "min_safe_temp": 5.0,
        "baseline_shelf_life_hours": 240.0, # 10 days
        "q10_decay_factor": 1.6,
        "optimal_humidity": 90.0
    },
    "MIXED VEGETABLES": {
        "optimal_temp": 5.0,
        "max_safe_temp": 8.0,
        "min_safe_temp": 4.0,
        "baseline_shelf_life_hours": 72.0,  # 3 days
        "q10_decay_factor": 2.0,
        "optimal_humidity": 85.0
    },
    "DEFAULT": {
        "optimal_temp": 10.0,
        "max_safe_temp": 13.0,
        "min_safe_temp": 8.0,
        "baseline_shelf_life_hours": 96.0,
        "q10_decay_factor": 1.8,
        "optimal_humidity": 85.0
    }
}


def get_produce_profile(crop_name: str) -> Dict[str, Any]:
    key = crop_name.strip().upper()
    for profile_key, profile_data in PRODUCE_PROFILES.items():
        if profile_key in key:
            return profile_data
    return PRODUCE_PROFILES["DEFAULT"]


# ====================================================================
# SPOILAGE RISK & SHELF-LIFE CALCULATION ENGINE
# ====================================================================

def calculate_spoilage_risk(
    crop_name: str,
    total_quantity_kg: float,
    departure_time: Optional[datetime],
    expected_delivery_time: Optional[datetime],
    current_temp: Optional[float],
    avg_temp_history: Optional[float] = None,
    thermal_excursion_minutes: float = 0.0,
    humidity: Optional[float] = None,
    quality_grade: Optional[str] = "Grade A",
    custom_baseline_hours: Optional[float] = None,
    custom_eta_hours: Optional[float] = None,
    safety_buffer_hours: float = 6.0
) -> Dict[str, Any]:
    """
    Transparent, modular rule-based shelf-life estimation and delivery risk assessment.
    Calculates thermal decay acceleration and compares remaining shelf life vs ETA + buffer.
    """
    profile = get_produce_profile(crop_name)
    now = datetime.now()

    # 1. Baseline Shelf Life Determination
    baseline_hours = custom_baseline_hours or profile["baseline_shelf_life_hours"]

    # Quality grade adjustment
    if quality_grade:
        q_upper = quality_grade.upper()
        if "GRADE B" in q_upper or "BLEMISH" in q_upper:
            baseline_hours *= 0.85
        elif "GRADE C" in q_upper or "PROCESSING" in q_upper:
            baseline_hours *= 0.70

    # 2. Elapsed transit time
    if departure_time:
        elapsed_transit_hours = max(0.0, (now - departure_time).total_seconds() / 3600.0)
    else:
        elapsed_transit_hours = 6.0 # standard default assumption

    # 3. Thermal Decay Acceleration Factor
    effective_temp = avg_temp_history or current_temp or profile["optimal_temp"]
    temp_excess = max(0.0, effective_temp - profile["max_safe_temp"])
    
    # Q10 thermal degradation rate
    thermal_decay_multiplier = 1.0 + (temp_excess * 0.15)
    if thermal_excursion_minutes > 0:
        excursion_hours = thermal_excursion_minutes / 60.0
        thermal_decay_multiplier += (excursion_hours * 0.25)

    # 4. Humidity penalty
    humidity_penalty_hours = 0.0
    if humidity is not None and humidity < (profile["optimal_humidity"] - 15.0):
        humidity_penalty_hours = 4.0 # Dehydration acceleration

    # 5. Remaining Shelf Life Calculation
    consumed_shelf_life_hours = (elapsed_transit_hours * thermal_decay_multiplier) + humidity_penalty_hours
    remaining_shelf_life_hours = max(2.0, round(baseline_hours - consumed_shelf_life_hours, 1))

    # 6. Delivery ETA Calculation
    if custom_eta_hours is not None:
        predicted_eta_hours = custom_eta_hours
    elif expected_delivery_time:
        predicted_eta_hours = max(1.0, round((expected_delivery_time - now).total_seconds() / 3600.0, 1))
    else:
        predicted_eta_hours = 24.0 # default estimated transit

    # 7. Delivery Margin & Risk Categorization
    effective_delivery_time_with_buffer = predicted_eta_hours + safety_buffer_hours
    delivery_margin_hours = round(remaining_shelf_life_hours - predicted_eta_hours, 1)

    factors: List[str] = []
    factors.append(f"Produce type '{crop_name}' nominal baseline shelf life: {baseline_hours:.0f} hrs.")
    factors.append(f"Time in transit elapsed: {elapsed_transit_hours:.1f} hrs.")

    if current_temp is not None:
        factors.append(f"Current cargo temperature: {current_temp:.1f}°C (Safe limit: {profile['max_safe_temp']:.1f}°C).")

    if temp_excess > 0:
        factors.append(f"Temperature excursion of +{temp_excess:.1f}°C accelerated biological respiration by {thermal_decay_multiplier:.2f}x.")

    if thermal_excursion_minutes > 0:
        factors.append(f"Cumulative thermal deviation of {thermal_excursion_minutes:.0f} minutes logged.")

    factors.append(f"Predicted remaining transit time (ETA): {predicted_eta_hours:.1f} hrs.")
    factors.append(f"Safety buffer applied: {safety_buffer_hours:.1f} hrs.")

    # Risk Categorization
    if current_temp is None and departure_time is None:
        risk_level = "UNKNOWN"
        risk_color = "#94A3B8"
        factors.append("Warning: Critical sensor telemetry or departure timestamp is missing.")
        confidence = 40
    elif remaining_shelf_life_hours <= predicted_eta_hours:
        risk_level = "HIGH"
        risk_color = "#F43F5E"
        factors.append(f"Critical Spoilage Risk: Produce will spoil {abs(delivery_margin_hours):.1f} hrs BEFORE reaching original destination.")
        confidence = 90
    elif remaining_shelf_life_hours <= effective_delivery_time_with_buffer:
        risk_level = "MODERATE"
        risk_color = "#F59E0B"
        factors.append(f"Delivery Risk Alert: Safety margin of {delivery_margin_hours:.1f} hrs is critically narrow (< {safety_buffer_hours:.0f} hr buffer). High vulnerability to traffic or dock delays.")
        confidence = 85
    else:
        risk_level = "LOW"
        risk_color = "#10B981"
        factors.append(f"Feasible Delivery: Safe margin of {delivery_margin_hours:.1f} hrs exceeds configured safety buffer.")
        confidence = 88

    recommended_actions = []
    if risk_level in ["HIGH", "MODERATE"]:
        recommended_actions.append("Initiate Sell Before Spoilage alternative buyer discovery in immediate transit corridor.")
        recommended_actions.append("Evaluate nearby wholesale buyers or cold-storage rescue facilities within < 3-hour radius.")
        recommended_actions.append("Consider partial shipment redirection if single buyer demand is below total quantity.")
    else:
        recommended_actions.append("Continue standard reefer transit monitoring to original destination.")

    return {
        "crop_name": crop_name,
        "total_quantity_kg": total_quantity_kg,
        "estimated_shelf_life_hours": remaining_shelf_life_hours,
        "shelf_life_range": f"{max(1, int(remaining_shelf_life_hours - 4))}-{int(remaining_shelf_life_hours + 4)} hrs",
        "predicted_eta_hours": predicted_eta_hours,
        "delivery_margin_hours": delivery_margin_hours,
        "safety_buffer_hours": safety_buffer_hours,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "confidence_score": confidence,
        "factors": factors,
        "recommended_actions": recommended_actions,
        "assessed_at": now.isoformat()
    }
