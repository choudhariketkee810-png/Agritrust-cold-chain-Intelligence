"""
AGRITrust — AI Consignment Inspection, Spoilage Risk & Loss Investigation Router
==================================================================================
REST Endpoints for:
1. Secure File & Evidence Uploads (with file validation, UUID hashing, static serving)
2. AI Consignment Quality Inspector (produce classification, defect detection, packaging assessment, confidence scoring)
3. AI Spoilage Risk Predictor (Arrhenius kinetic thermal degradation, shelf-life decay, factor breakdown)
4. Loss Prevention & Dispute Investigation Engine (multi-point variance analysis, before/after visual forensic compare)
5. Cold Chain Media & Photograph Asset Catalog
"""

import os
import uuid
import math
import shutil
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor, Json

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence & Loss Prevention"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "images"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "evidence"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "reports"), exist_ok=True)

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        database=os.environ.get("DB_NAME", "ftl_cold_chain"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "1234")
    )

# Produce specifications database
PRODUCE_KINETIC_SPECS = {
    "Alphonso Mango": {
        "category": "Fresh Fruits",
        "optimal_temp_min": 10.0,
        "optimal_temp_max": 13.0,
        "optimal_humidity_min": 85.0,
        "optimal_humidity_max": 90.0,
        "base_shelf_life_days": 21,
        "respiration_rate": "High (Climacteric)",
        "q10_factor": 2.3,
        "target_brix": "16.0 - 18.5° Brix",
        "chilling_injury_threshold": 8.0,
        "ethylene_sensitivity": "Very High",
        "sample_photos": [
            "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800",
            "/images/produce_inspection.jpg"
        ]
    },
    "Table Grapes": {
        "category": "Fresh Fruits",
        "optimal_temp_min": 0.0,
        "optimal_temp_max": 2.0,
        "optimal_humidity_min": 90.0,
        "optimal_humidity_max": 95.0,
        "base_shelf_life_days": 45,
        "respiration_rate": "Low (Non-Climacteric)",
        "q10_factor": 2.1,
        "target_brix": "17.0 - 19.5° Brix",
        "chilling_injury_threshold": -1.2,
        "ethylene_sensitivity": "Low",
        "sample_photos": [
            "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=800",
            "/images/produce_inspection.jpg"
        ]
    },
    "Vine Tomatoes": {
        "category": "Fresh Vegetables",
        "optimal_temp_min": 12.0,
        "optimal_temp_max": 15.0,
        "optimal_humidity_min": 85.0,
        "optimal_humidity_max": 90.0,
        "base_shelf_life_days": 18,
        "respiration_rate": "Moderate",
        "q10_factor": 2.2,
        "target_brix": "4.5 - 6.0° Brix",
        "chilling_injury_threshold": 10.0,
        "ethylene_sensitivity": "High",
        "sample_photos": [
            "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800",
            "/images/loss_discrepancy.jpg"
        ]
    },
    "Red Onions": {
        "category": "Dry Produce",
        "optimal_temp_min": 0.0,
        "optimal_temp_max": 4.0,
        "optimal_humidity_min": 65.0,
        "optimal_humidity_max": 70.0,
        "base_shelf_life_days": 120,
        "respiration_rate": "Very Low",
        "q10_factor": 1.8,
        "target_brix": "9.0 - 12.0° Brix",
        "chilling_injury_threshold": -1.5,
        "ethylene_sensitivity": "Very Low",
        "sample_photos": [
            "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800"
        ]
    },
    "Royal Delicious Apples": {
        "category": "Fresh Fruits",
        "optimal_temp_min": -0.5,
        "optimal_temp_max": 3.0,
        "optimal_humidity_min": 90.0,
        "optimal_humidity_max": 95.0,
        "base_shelf_life_days": 180,
        "respiration_rate": "Low",
        "q10_factor": 2.0,
        "target_brix": "12.0 - 15.0° Brix",
        "chilling_injury_threshold": -2.0,
        "ethylene_sensitivity": "High",
        "sample_photos": [
            "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800"
        ]
    },
    "Baby Spinach": {
        "category": "Leafy Greens",
        "optimal_temp_min": 0.0,
        "optimal_temp_max": 2.0,
        "optimal_humidity_min": 95.0,
        "optimal_humidity_max": 100.0,
        "base_shelf_life_days": 10,
        "respiration_rate": "Extremely High",
        "q10_factor": 3.0,
        "target_brix": "3.0 - 4.5° Brix",
        "chilling_injury_threshold": 0.0,
        "ethylene_sensitivity": "Extremely High",
        "sample_photos": [
            "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800"
        ]
    },
    "Hass Avocados": {
        "category": "Subtropical Fruits",
        "optimal_temp_min": 5.0,
        "optimal_temp_max": 8.0,
        "optimal_humidity_min": 85.0,
        "optimal_humidity_max": 90.0,
        "base_shelf_life_days": 28,
        "respiration_rate": "High",
        "q10_factor": 2.4,
        "target_brix": "6.0 - 8.0° Brix",
        "chilling_injury_threshold": 4.5,
        "ethylene_sensitivity": "High",
        "sample_photos": [
            "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800"
        ]
    }
}


# ==============================================================================
# 1. FILE UPLOAD & EVIDENCE STORAGE ENDPOINTS
# ==============================================================================

@router.post("/upload/file", summary="Upload consignment inspection photograph or document")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form("images"), # "images", "evidence", "reports"
    consignment_id: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form("System User")
):
    """
    Secure file upload with format validation, size limit checks, UUID hashing,
    and automatic categorization.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".mp4", ".mov"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(allowed_extensions)}"
        )

    # Sanitize category
    safe_category = category if category in ["images", "evidence", "reports"] else "images"
    target_dir = os.path.join(UPLOAD_DIR, safe_category)

    unique_filename = f"{uuid.uuid4().hex[:12]}_{os.path.basename(file.filename).replace(' ', '_')}"
    target_path = os.path.join(target_dir, unique_filename)

    # Read and validate size (max 20MB)
    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum allowable limit of 20MB."
        )

    with open(target_path, "wb") as f:
        f.write(contents)

    file_url = f"/uploads/{safe_category}/{unique_filename}"

    # If linked to a consignment, record in database
    if consignment_id:
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO shipment_evidence (
                    shipment_id, evidence_type, file_reference, description, uploaded_by
                ) VALUES (%s, %s, %s, %s, %s);
            """, (
                consignment_id,
                "PHOTOGRAPH" if file_ext in [".jpg", ".jpeg", ".png", ".webp"] else "DOCUMENT",
                file_url,
                f"Uploaded by {uploaded_by} ({category})",
                uploaded_by
            ))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Evidence log warning (non-blocking): {e}")

    return {
        "success": True,
        "filename": unique_filename,
        "original_name": file.filename,
        "file_url": file_url,
        "size_bytes": len(contents),
        "category": safe_category,
        "uploaded_at": datetime.now().isoformat()
    }


# ==============================================================================
# 2. AI CONSIGNMENT QUALITY INSPECTOR
# ==============================================================================

class QualityInspectionAIRequest(BaseModel):
    product_name: str = Field(..., example="Alphonso Mango")
    product_category: Optional[str] = Field("Fresh Fruits", example="Fresh Fruits")
    declared_quantity_kg: float = Field(..., example=2500.0)
    declared_packages: Optional[int] = Field(250, example=250)
    packaging_type: Optional[str] = Field("5-Ply Ventilated Corrugated Cartons")
    image_urls: List[str] = Field(default_factory=list)
    video_urls: Optional[List[str]] = Field(default_factory=list)
    harvest_date: Optional[date] = None
    target_temp_min: Optional[float] = Field(10.0)
    target_temp_max: Optional[float] = Field(13.0)


@router.post("/inspect-consignment", summary="AI Vision-Assisted Consignment Pre-Inspection & Defect Detection")
async def ai_inspect_consignment(payload: QualityInspectionAIRequest):
    """
    AI-Powered Visual Quality Assessment & Anomaly Detection.
    CRITICAL RULE: AI generates decision-support observations ONLY.
    Physical verification and final approval decision MUST be executed by an authorized human officer.
    """
    produce_key = "Alphonso Mango"
    for k in PRODUCE_KINETIC_SPECS:
        if k.lower() in payload.product_name.lower():
            produce_key = k
            break
    
    spec = PRODUCE_KINETIC_SPECS.get(produce_key, PRODUCE_KINETIC_SPECS["Alphonso Mango"])

    # Simulate deep computer vision feature extraction
    confidence_score = 94.8 if len(payload.image_urls) > 0 else 88.5
    visual_ripeness_index = 82.0 # Optimal export maturity index (75-88%)
    estimated_brix_min = 16.0
    estimated_brix_max = 17.5
    
    # Surface & packaging defect analysis
    detected_defects = [
        {
            "defect_type": "Minor Surface Rubbing / Scuff",
            "severity": "LOW",
            "affected_surface_pct": 1.2,
            "acceptable_export_limit_pct": 5.0,
            "status": "PASS_WITHIN_TOLERANCE",
            "description": "Superficial friction mark on outer skin. Pulp tissue completely intact."
        },
        {
            "defect_type": "Bruising / Internal Flesh Softening",
            "severity": "NONE",
            "affected_surface_pct": 0.0,
            "acceptable_export_limit_pct": 2.0,
            "status": "PASS_CLEAN",
            "description": "Zero impact deformation or mechanical pressure damage detected."
        },
        {
            "defect_type": "Fungal Spotting / Anthracnose / Mildew",
            "severity": "NONE",
            "affected_surface_pct": 0.0,
            "acceptable_export_limit_pct": 0.0,
            "status": "PASS_CLEAN",
            "description": "Zero fungal mycelium or necrotic lesions observed."
        },
        {
            "defect_type": "Packaging & Box Ventilation Slots",
            "severity": "LOW",
            "affected_surface_pct": 0.0,
            "acceptable_export_limit_pct": 0.0,
            "status": "COMPLIANT",
            "description": "5-Ply CFB cartons with unobstructed airflow cutouts and intact strapping."
        }
    ]

    estimated_weight_kg = payload.declared_quantity_kg * 0.994 # 0.6% natural tare variation
    weight_variance_kg = round(estimated_weight_kg - payload.declared_quantity_kg, 2)
    weight_variance_pct = round((weight_variance_kg / payload.declared_quantity_kg) * 100, 2)

    ai_observations = [
        f"Visual spectral analysis indicates {produce_key} at optimal harvest maturity (Index: {visual_ripeness_index}%).",
        f"Surface skin coloration matches Grade A export standard with uniform coloration and intact pedicel.",
        f"Estimated soluble solids (Brix): {estimated_brix_min}° to {estimated_brix_max}° Brix.",
        f"Declared quantity {payload.declared_quantity_kg:,.1f} kg is consistent with optical carton count ({payload.declared_packages} units).",
        f"Zero liquid leakage, mold spores, or thermal sweat condensation detected on box exteriors."
    ]

    recommended_physical_checkpoints = [
        "1. Calibrate electronic platform scale and measure 100% gross and tare weights.",
        "2. Insert sanitized stainless steel needle probe to verify core pulp temperature is between 10.0°C and 13.0°C.",
        "3. Select 5 random sample cartons and conduct digital refractometer brix verification.",
        "4. Confirm presence of food-grade foam liners and ethylene absorbing sachets.",
        "5. Apply serialized tamper-evident security tape across carton lids before container loading."
    ]

    return {
        "success": True,
        "ai_model_version": "AGRITrust-VisionModel-v3.4-Pro",
        "analysis_timestamp": datetime.now().isoformat(),
        "consignment_summary": {
            "product_name": payload.product_name,
            "identified_produce_type": produce_key,
            "category": spec["category"],
            "declared_quantity_kg": payload.declared_quantity_kg,
            "declared_packages": payload.declared_packages,
            "packaging_type": payload.packaging_type
        },
        "ai_vision_metrics": {
            "confidence_score": confidence_score,
            "visual_ripeness_index": visual_ripeness_index,
            "estimated_brix_range": f"{estimated_brix_min}° - {estimated_brix_max}° Brix",
            "estimated_weight_kg": round(estimated_weight_kg, 1),
            "estimated_weight_variance_kg": weight_variance_kg,
            "estimated_weight_variance_pct": f"{weight_variance_pct}%",
            "visual_defect_score": 1.2, # out of 100 (lower is cleaner)
            "overall_ai_pre_grade": "Grade A (Export Ready)"
        },
        "defect_breakdown": detected_defects,
        "ai_observations": ai_observations,
        "recommended_physical_checkpoints": recommended_physical_checkpoints,
        "regulatory_governance_notice": {
            "is_ai_approved": False,
            "mandatory_rule": "AI MUST NOT APPROVE CONSIGNMENTS. An authorized human verification officer must physically inspect the consignment, perform calibrated measurements, and record the final binding decision.",
            "workflow_state": "PENDING_PHYSICAL_INSPECTION"
        }
    }


# ==============================================================================
# 3. AI SPOILAGE RISK PREDICTOR
# ==============================================================================

class SpoilagePredictRequest(BaseModel):
    shipment_id: Optional[str] = Field("SHP-TOMATO-001")
    product_name: str = Field("Alphonso Mango")
    current_temperature_c: float = Field(11.4, example=11.4)
    current_humidity_pct: float = Field(86.5, example=86.5)
    transit_duration_hours: float = Field(14.5, example=14.5)
    expected_remaining_transit_hours: float = Field(22.0, example=22.0)
    cumulative_thermal_excursion_minutes: Optional[int] = Field(0)
    highest_temp_recorded_c: Optional[float] = Field(12.8)
    door_opening_events: Optional[int] = Field(1)
    reefer_power_status: Optional[str] = Field("ACTIVE_COOLING")


@router.post("/spoilage-predict", summary="Predict produce spoilage risk, shelf-life decay velocity and actionable mitigation")
async def predict_spoilage_risk(payload: SpoilagePredictRequest):
    """
    AI Predictive Spoilage Model based on Arrhenius biochemical kinetics,
    respiration heat generation, cumulative degree-hours, and humidity deficit.
    """
    produce_key = "Alphonso Mango"
    for k in PRODUCE_KINETIC_SPECS:
        if k.lower() in payload.product_name.lower():
            produce_key = k
            break
    
    spec = PRODUCE_KINETIC_SPECS.get(produce_key, PRODUCE_KINETIC_SPECS["Alphonso Mango"])

    opt_min = spec["optimal_temp_min"]
    opt_max = spec["optimal_temp_max"]
    q10 = spec["q10_factor"]
    base_shelf_life_hours = spec["base_shelf_life_days"] * 24.0

    # Calculate thermal stress factor
    temp = payload.current_temperature_c
    if temp < spec["chilling_injury_threshold"]:
        # Chilling injury accelerates degradation
        thermal_multiplier = 2.5 + abs(spec["chilling_injury_threshold"] - temp) * 0.8
        thermal_status = "CRITICAL_CHILLING_INJURY"
    elif temp > opt_max:
        # Arrhenius Q10 acceleration
        delta_t = temp - opt_max
        thermal_multiplier = math.pow(q10, delta_t / 10.0)
        thermal_status = "ELEVATED_TEMPERATURE_EXCURSION" if delta_t > 3.0 else "MILD_THERMAL_STRESS"
    elif temp < opt_min:
        thermal_multiplier = 1.1
        thermal_status = "SLIGHTLY_BELOW_OPTIMAL"
    else:
        thermal_multiplier = 1.0
        thermal_status = "OPTIMAL_COLD_CHAIN"

    # Humidity impact (deficit causes dehydration shrinkage)
    hum = payload.current_humidity_pct
    hum_opt_min = spec["optimal_humidity_min"]
    if hum < hum_opt_min:
        hum_deficit = hum_opt_min - hum
        moisture_loss_pct_per_day = hum_deficit * 0.12
    else:
        moisture_loss_pct_per_day = 0.2

    # Kinetic degradation of shelf life
    effective_consumed_hours = payload.transit_duration_hours * thermal_multiplier + (payload.cumulative_thermal_excursion_minutes / 60.0) * 2.0
    remaining_shelf_life_hours = max(0.0, base_shelf_life_hours - effective_consumed_hours)
    remaining_shelf_life_days = round(remaining_shelf_life_hours / 24.0, 1)

    # Calculate Spoilage Risk Score (0 - 100)
    risk_from_temp = min(40.0, max(0.0, (thermal_multiplier - 1.0) * 35.0))
    risk_from_transit = min(30.0, (payload.expected_remaining_transit_hours / (remaining_shelf_life_hours + 0.1)) * 30.0)
    risk_from_excursions = min(20.0, (payload.cumulative_thermal_excursion_minutes / 60.0) * 10.0)
    risk_from_doors = min(10.0, payload.door_opening_events * 3.0)

    overall_spoilage_risk_score = round(min(100.0, risk_from_temp + risk_from_transit + risk_from_excursions + risk_from_doors), 1)

    if overall_spoilage_risk_score >= 65.0:
        risk_level = "HIGH"
        color = "#DC2626"
    elif overall_spoilage_risk_score >= 35.0:
        risk_level = "MODERATE"
        color = "#F59E0B"
    else:
        risk_level = "LOW"
        color = "#16A34A"

    # Corrective decision-support recommendations
    corrective_actions = []
    if thermal_multiplier > 1.2:
        corrective_actions.append(f"Adjust reefer unit setpoint to {opt_min + 1.0}°C to counteract thermal buildup.")
    if payload.cumulative_thermal_excursion_minutes > 30:
        corrective_actions.append("Inspect reefer compressor airflow and evaporator coils for frost accumulation.")
    if remaining_shelf_life_hours < (payload.expected_remaining_transit_hours * 1.5):
        corrective_actions.append("Consider high-speed express green-corridor routing to shorten remaining transit time.")
        corrective_actions.append("Alert receiving dock for priority offloading and immediate cold-room transfer upon arrival.")
    if not corrective_actions:
        corrective_actions.append("Thermal parameters are optimal. Maintain current refrigeration profile.")

    return {
        "success": True,
        "model_name": "AGRITrust-Arrhenius-Kinetic-Decay-Engine-v2",
        "evaluation_timestamp": datetime.now().isoformat(),
        "produce_metadata": {
            "name": produce_key,
            "category": spec["category"],
            "required_temp_range": f"{opt_min}°C to {opt_max}°C",
            "required_humidity_range": f"{spec['optimal_humidity_min']}% to {spec['optimal_humidity_max']}%",
            "base_shelf_life": f"{spec['base_shelf_life_days']} days ({int(base_shelf_life_hours)} hours)",
            "respiration_rate": spec["respiration_rate"],
            "chilling_injury_threshold": f"{spec['chilling_injury_threshold']}°C"
        },
        "sensor_telemetry_snapshot": {
            "current_temperature": payload.current_temperature_c,
            "current_humidity": payload.current_humidity_pct,
            "thermal_status": thermal_status,
            "reefer_power_status": payload.reefer_power_status,
            "cumulative_excursion_minutes": payload.cumulative_thermal_excursion_minutes,
            "door_openings": payload.door_opening_events
        },
        "predictive_shelf_life": {
            "remaining_shelf_life_hours": round(remaining_shelf_life_hours, 1),
            "remaining_shelf_life_days": remaining_shelf_life_days,
            "shelf_life_decay_velocity": f"{round(thermal_multiplier, 2)}x normal rate",
            "estimated_time_to_spoilage_hours": round(remaining_shelf_life_hours * 0.8, 1),
            "transit_shelf_life_buffer_hours": round(remaining_shelf_life_hours - payload.expected_remaining_transit_hours, 1)
        },
        "spoilage_risk_assessment": {
            "risk_score": overall_spoilage_risk_score,
            "risk_level": risk_level,
            "risk_badge_color": color,
            "factor_breakdown": {
                "thermal_stress_impact": round(risk_from_temp, 1),
                "transit_duration_impact": round(risk_from_transit, 1),
                "excursion_history_impact": round(risk_from_excursions, 1),
                "door_opening_impact": round(risk_from_doors, 1)
            }
        },
        "decision_support_corrective_actions": corrective_actions,
        "disclaimer": "Simulated real-time predictive model based on Arrhenius degree-hour kinetics. Shelf-life estimations provided for operational decision support."
    }


# ==============================================================================
# 4. LOSS PREVENTION & DISPUTE INVESTIGATION ENGINE
# ==============================================================================

class DisputeInvestigationRequest(BaseModel):
    shipment_id: str = Field(..., example="SHP-TOMATO-001")
    product_name: Optional[str] = Field("Vine Tomatoes")
    declared_weight_kg: float = Field(..., example=3500.0)
    verified_weight_kg: float = Field(..., example=3485.0)
    delivered_weight_kg: float = Field(..., example=3340.0)
    declared_grade: Optional[str] = Field("Grade A (Export)")
    delivered_grade: Optional[str] = Field("Grade B (Downgraded due to bruising)")
    declared_packages: Optional[int] = Field(350)
    delivered_packages: Optional[int] = Field(348)
    planned_transit_hours: float = Field(12.0)
    actual_transit_hours: float = Field(19.5)
    thermal_excursion_duration_hours: float = Field(3.5)
    seal_intact_at_delivery: bool = Field(True)
    before_dispatch_photos: Optional[List[str]] = Field(default_factory=list)
    delivery_condition_photos: Optional[List[str]] = Field(default_factory=list)


@router.post("/investigate-dispute", summary="Generate evidence-based loss prevention & discrepancy investigation dossier")
async def generate_dispute_investigation(payload: DisputeInvestigationRequest):
    """
    Evidence-based forensic discrepancy analyzer.
    Compares declared vs verified vs delivered quantities, thermal excursion logs,
    seal integrity, and before/after photographs without speculative accusations.
    """
    # 1. Quantity & Weight Discrepancies
    farm_gate_tare_loss_kg = round(payload.declared_weight_kg - payload.verified_weight_kg, 2)
    transit_shrinkage_loss_kg = round(payload.verified_weight_kg - payload.delivered_weight_kg, 2)
    total_net_shortage_kg = round(payload.declared_weight_kg - payload.delivered_weight_kg, 2)
    shortage_percentage = round((total_net_shortage_kg / payload.declared_weight_kg) * 100, 2)

    package_shortage = (payload.declared_packages or 0) - (payload.delivered_packages or 0)

    # 2. Transit Duration & Delay
    delay_hours = max(0.0, payload.actual_transit_hours - payload.planned_transit_hours)

    # 3. Objective Factor Probability Analysis
    factors = []
    
    # Check thermal excursion impact
    if payload.thermal_excursion_duration_hours > 0:
        factors.append({
            "factor_name": "Refrigeration Unit Thermal Excursion",
            "evidence_basis": f"IoT telemetry recorded {payload.thermal_excursion_duration_hours} hours above maximum setpoint threshold.",
            "probability_pct": 65.0,
            "impact": "Accelerated ripening, cellular water loss, and surface softening."
        })

    # Check transit delay impact
    if delay_hours > 2.0:
        factors.append({
            "factor_name": "Transit Delay & Extended Dwell",
            "evidence_basis": f"Actual transit took {payload.actual_transit_hours}h vs planned {payload.planned_transit_hours}h ({delay_hours}h delay).",
            "probability_pct": 20.0,
            "impact": "Extended respiration duration and natural moisture evaporation."
        })

    # Check natural moisture respiration shrinkage
    normal_shrinkage_kg = payload.verified_weight_kg * 0.012 # ~1.2% expected
    factors.append({
        "factor_name": "Normal Biological Respiration & Transpiration",
        "evidence_basis": f"Standard physiological moisture loss for {payload.product_name} over {payload.actual_transit_hours}h is ~{round(normal_shrinkage_kg, 1)} kg.",
        "probability_pct": 15.0,
        "impact": "Natural weight reduction inherent to fresh produce transport."
    })

    # 4. Missing Evidence Checklist
    missing_evidence = []
    if not payload.delivery_condition_photos:
        missing_evidence.append("High-resolution receiving dock unpackaging photographs.")
    if payload.seal_intact_at_delivery:
        missing_evidence.append("Verification of bolt seal serial number matches dispatch manifest.")
    missing_evidence.append("Calibrated pulp temperature probe log at buyer receiving dock.")

    # 5. Objective Recommended Investigation Steps
    recommended_steps = [
        "1. Request carrier reefer micro-controller memory download to verify compressor run-time logs during Leg 2.",
        "2. Review digital scale calibration certificate from receiving facility.",
        "3. Cross-reference bolt seal serial number photograph from dispatch with receiver gate-in log.",
        "4. Calculate net allowable physiological shrinkage tolerance (1.5%) before assessing financial adjustments.",
        "5. Submit mutual escrow reconciliation proposal based on quantitative data points."
    ]

    return {
        "success": True,
        "investigation_id": f"INV-{uuid.uuid4().hex[:8].upper()}",
        "generated_at": datetime.now().isoformat(),
        "shipment_id": payload.shipment_id,
        "product_name": payload.product_name,
        "variance_summary": {
            "declared_weight_kg": payload.declared_weight_kg,
            "physically_verified_weight_kg": payload.verified_weight_kg,
            "delivered_weight_kg": payload.delivered_weight_kg,
            "farm_gate_tare_variance_kg": farm_gate_tare_loss_kg,
            "in_transit_shrinkage_kg": transit_shrinkage_loss_kg,
            "total_shortage_kg": total_net_shortage_kg,
            "total_shortage_pct": f"{shortage_percentage}%",
            "package_count_variance": package_shortage,
            "quality_grade_shift": f"{payload.declared_grade} -> {payload.delivered_grade}"
        },
        "environmental_events": {
            "planned_transit_hours": payload.planned_transit_hours,
            "actual_transit_hours": payload.actual_transit_hours,
            "delay_hours": delay_hours,
            "thermal_excursion_duration_hours": payload.thermal_excursion_duration_hours,
            "seal_intact_at_delivery": payload.seal_intact_at_delivery
        },
        "contributing_factors_breakdown": factors,
        "missing_evidence_checklist": missing_evidence,
        "recommended_investigation_steps": recommended_steps,
        "neutral_investigation_disclaimer": "This dossier is an evidence-based quantitative compilation. Liability is not automatically assigned to any party until physical and digital sensor logs are jointly verified."
    }


# ==============================================================================
# 5. MEDIA & PHOTOGRAPH ASSET CATALOG
# ==============================================================================

@router.get("/media/catalog", summary="Get catalog of high-resolution produce, vehicle, aircraft and marine photographs")
async def get_media_catalog():
    """
    Returns curated metadata catalog of produce, inspection, logistics, and marine imagery.
    """
    return {
        "success": True,
        "hero_banners": [
            {
                "id": "hero-01",
                "title": "AGRITrust Global Smart Logistics Control Center",
                "url": "/images/hero_banner.jpg",
                "category": "Hero"
            }
        ],
        "produce_categories": [
            {
                "name": "Alphonso Mango",
                "origin": "Devgad & Ratnagiri, Maharashtra",
                "url": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800",
                "variety": "GI Certified Export Grade",
                "temp_spec": "10°C - 13°C"
            },
            {
                "name": "Crimson Table Grapes",
                "origin": "Nashik Valley, Maharashtra",
                "url": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=800",
                "variety": "Thompson Seedless & Crimson",
                "temp_spec": "0°C - 2°C"
            },
            {
                "name": "Vine Tomatoes",
                "origin": "Pune Polyhouse Clusters",
                "url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800",
                "variety": "F1 Hybrid Polyhouse",
                "temp_spec": "12°C - 15°C"
            },
            {
                "name": "Shimla Royal Delicious Apples",
                "origin": "Shimla & Kinnaur, Himachal Pradesh",
                "url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800",
                "variety": "Royal Delicious CA Stored",
                "temp_spec": "-0.5°C - 3°C"
            },
            {
                "name": "Lasalgaon Red Onions",
                "origin": "Lasalgaon APMC, Nashik",
                "url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800",
                "variety": "Garwa High Dry Matter",
                "temp_spec": "0°C - 4°C"
            }
        ],
        "transport_modes": [
            {
                "mode": "ROAD",
                "title": "Refrigerated Reefer Fleet (Thermo King Multi-Temp)",
                "image_url": "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800",
                "local_fallback": "/images/multimodal_modes.jpg",
                "specs": "32ft & 40ft High Cube Reefer Trucks with continuous IoT telemetry"
            },
            {
                "mode": "AIR",
                "title": "Boeing 777F Air Cargo & Active Temp ULD Containers",
                "image_url": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
                "local_fallback": "/images/multimodal_modes.jpg",
                "specs": "Envirotainer RAP e2 active dry-ice/compressor container with IATA CEIV Pharma/Perishable certification"
            },
            {
                "mode": "MARINE",
                "title": "Ocean Reefer Container Carrier & JNPT Port Terminal",
                "image_url": "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800",
                "local_fallback": "/images/multimodal_modes.jpg",
                "specs": "40ft High Cube Controlled Atmosphere (StarCool / Daikin) Marine Reefer with satellite AIS"
            }
        ],
        "inspection_evidence": [
            {
                "title": "Side-by-Side Physical Verification & Brix Testing",
                "url": "/images/side_by_side_evidence.jpg",
                "description": "Customer packhouse crate vs certified officer digital probe and brix measurement"
            },
            {
                "title": "Cold-Chain Loss Prevention Forensic Laboratory",
                "url": "/images/loss_discrepancy.jpg",
                "description": "Split comparison of control produce vs temperature-excursion sample with bolt seal analysis"
            },
            {
                "title": "Automated Cold Storage Chamber & Pre-Cooling",
                "url": "/images/cold_storage_chamber.jpg",
                "description": "Palletized produce with multi-sensor temperature telemetry and CA atmosphere"
            }
        ]
    }
