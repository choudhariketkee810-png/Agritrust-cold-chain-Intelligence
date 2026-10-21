from fastapi import FastAPI, HTTPException, Query, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import Json
import json
import io
import qrcode

import os
from fastapi.staticfiles import StaticFiles
from routes_roles import router as roles_router
from routes_marine import router as marine_router
from routes_multimodal import router as multimodal_router
from routes_verification import router as verification_router
from routes_ai_intelligence import router as ai_intelligence_router

app = FastAPI(
    title="AGRITrust — Verified Farm-to-Buyer Cold Chain Intelligence API",
    description="Real-time cold-chain monitoring, proof-of-integrity, and automated incident response backend",
    version="2.5.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and mount static serving
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(roles_router)
app.include_router(marine_router)
app.include_router(multimodal_router)
app.include_router(verification_router)
app.include_router(ai_intelligence_router)


def get_connection():
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="ftl_cold_chain",
        user="postgres",
        password="1234"
    )


# ====================================================================
# PYDANTIC SCHEMAS FOR AGRITRUST WORKFLOW
# ====================================================================

class ShipmentCreate(BaseModel):
    shipment_id: Optional[str] = Field(None, example="AGRI-1001")
    product_name: str = Field(..., example="Mango")
    total_quantity: float = Field(..., example=1000.0)
    grade_a_quantity: Optional[float] = Field(0.0, example=750.0)
    grade_b_quantity: Optional[float] = Field(0.0, example=250.0)
    damaged_quantity: Optional[float] = Field(0.0, example=0.0)
    quality_notes: Optional[str] = Field(None, example="Harvested at optimal maturity index.")
    recorded_by: Optional[str] = Field("Farmer_Nashik_01", example="Farmer_Nashik_01")
    
    origin: str = Field(..., example="Nashik")
    destination: str = Field(..., example="Mumbai")
    vehicle_id: str = Field(..., example="FTL-V001")
    expected_delivery_time: Optional[datetime] = None
    
    target_temp_min: float = Field(..., example=10.0)
    target_temp_max: float = Field(..., example=13.0)
    
    initial_temperature: Optional[float] = Field(None, example=11.5)
    initial_humidity: Optional[float] = Field(None, example=68.0)
    shipment_status: Optional[str] = Field("CREATED", example="CREATED")


class HandoverCreate(BaseModel):
    logistics_receiver: str = Field(..., example="Logistics Operator")
    actor_role: Optional[str] = Field("LOGISTICS", example="LOGISTICS")
    location: str = Field(..., example="Nashik Farm Gate")
    vehicle_id: Optional[str] = Field(None, example="FTL-V001")
    handover_temperature: Optional[float] = Field(None, example=11.8)
    handover_humidity: Optional[float] = Field(None, example=68.0)
    handover_quantity: Optional[float] = Field(None, example=1000.0)
    notes: Optional[str] = Field(None, example="Shipment handed over for refrigerated transport.")
    handover_timestamp: Optional[datetime] = None
    event_type: Optional[str] = Field("FARMER_TO_LOGISTICS_HANDOVER", example="FARMER_TO_LOGISTICS_HANDOVER")
    event_data: Optional[Dict[str, Any]] = None


class ReceivingCreate(BaseModel):
    receiver_name: Optional[str] = Field(None, example="Buyer Receiving Operator")
    received_by: Optional[str] = Field(None, example="Buyer_Quality_Inspector_01")
    receiving_location: Optional[str] = Field(None, example="Mumbai Buyer Facility")
    location: Optional[str] = Field(None, example="Mumbai Buyer Facility")
    receiving_timestamp: Optional[datetime] = None
    
    received_total_quantity: Optional[float] = Field(None, example=900.0)
    received_quantity: Optional[float] = Field(None, example=900.0)
    received_grade_a: Optional[float] = Field(0.0, example=600.0)
    received_grade_b: Optional[float] = Field(0.0, example=250.0)
    damaged_quantity: Optional[float] = Field(0.0, example=50.0)
    
    receiving_temperature: Optional[float] = Field(None, example=14.0)
    receiving_humidity: Optional[float] = Field(None, example=65.0)
    
    receiving_notes: Optional[str] = Field(None, example="Shipment received and inspected at buyer facility.")
    notes: Optional[str] = Field(None, example="Shipment received and inspected at buyer facility.")


class EvidenceCreate(BaseModel):
    evidence_type: str = Field(..., example="SEAL_PHOTO")
    file_reference: str = Field(..., example="s3://agritrust/evidence/seal_01.jpg")
    description: Optional[str] = Field(None, example="Photo of unbroken digital seal")
    uploaded_by: str = Field(..., example="Driver_Ramesh")


class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., example="UNDER_REVIEW")
    resolution_notes: Optional[str] = Field(None, example="Discrepancy reviewed and settled between parties.")


# ====================================================================
# RULE-BASED RISK ENGINE HELPER
# ====================================================================

def evaluate_cold_chain_risk(
    shipment_id: str,
    target_min: float,
    target_max: float,
    telemetry_list: List[Dict[str, Any]],
    open_alerts: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Transparent rule-based risk evaluation engine.
    Calculates deterministic risk scores (0-100), risk levels (NORMAL, WARNING, HIGH, CRITICAL),
    factual reasons, and practical operational actions.
    """
    if not telemetry_list:
        return {
            "risk_level": "NORMAL",
            "risk_score": 0,
            "latest_temperature": None,
            "target_min": target_min,
            "target_max": target_max,
            "humidity": None,
            "door_status": None,
            "refrigeration_status": None,
            "latest_location": None,
            "latest_recorded_at": None,
            "temperature_trend": {"trend": "STABLE", "rate_per_min": 0.0, "excursion_duration_seconds": 0},
            "active_alerts_count": len(open_alerts),
            "active_alerts": open_alerts,
            "risk_reasons": ["Awaiting initial telemetry ingestion."],
            "recommended_actions": ["Verify sensor transmission on vehicle."]
        }

    latest = telemetry_list[0]
    curr_temp = latest.get("temperature")
    curr_humidity = latest.get("humidity")
    door_status = latest.get("door_status")
    refrig_status = latest.get("refrigeration_status")
    lat = latest.get("latitude")
    lon = latest.get("longitude")
    recorded_at_str = latest.get("recorded_at")

    score = 0
    reasons = []
    actions = []

    # 1. Temperature Range & Excursion Evaluation
    is_out_of_bounds = False
    excursion_delta = 0.0

    if curr_temp is not None:
        if curr_temp > target_max:
            is_out_of_bounds = True
            excursion_delta = round(curr_temp - target_max, 2)
            if excursion_delta > 2.0:
                score += 55
                reasons.append(f"Severe temperature excursion: {curr_temp}°C exceeds maximum threshold of {target_max}°C by {excursion_delta}°C.")
            else:
                score += 35
                reasons.append(f"Temperature excursion detected: {curr_temp}°C is above maximum safe threshold of {target_max}°C (+{excursion_delta}°C).")
            actions.append("Inspect refrigeration unit cooling airflow and verify compressor setpoint.")
        elif curr_temp < target_min:
            is_out_of_bounds = True
            excursion_delta = round(target_min - curr_temp, 2)
            if excursion_delta > 2.0:
                score += 55
                reasons.append(f"Severe temperature excursion: {curr_temp}°C is below minimum threshold of {target_min}°C by {excursion_delta}°C.")
            else:
                score += 35
                reasons.append(f"Temperature excursion detected: {curr_temp}°C is below minimum safe threshold of {target_min}°C (-{excursion_delta}°C).")
            actions.append("Inspect refrigeration thermostat to prevent sub-target cooling.")
        elif curr_temp >= (target_max - 0.5) or curr_temp <= (target_min + 0.5):
            score += 15
            reasons.append(f"Temperature near threshold boundary: {curr_temp}°C vs safe band [{target_min}°C - {target_max}°C].")
            actions.append("Monitor reefer unit closely for possible thermal drift.")
        else:
            reasons.append("Temperature inside target safe range.")

    # 2. Temperature Trend & Excursion Duration Calculation
    trend_type = "STABLE"
    rate_per_min = 0.0
    excursion_duration_sec = 0

    if len(telemetry_list) >= 2 and curr_temp is not None:
        prev = telemetry_list[1]
        prev_temp = prev.get("temperature")
        if prev_temp is not None and latest.get("recorded_at") and prev.get("recorded_at"):
            try:
                t1 = datetime.fromisoformat(latest["recorded_at"])
                t2 = datetime.fromisoformat(prev["recorded_at"])
                dt_mins = (t1 - t2).total_seconds() / 60.0
                if dt_mins > 0:
                    rate_per_min = round((curr_temp - prev_temp) / dt_mins, 2)
                    if rate_per_min > 0.3:
                        trend_type = "RISING"
                        if is_out_of_bounds and curr_temp > target_max:
                            score += 10
                            reasons.append(f"Rapid upward temperature trend (+{rate_per_min}°C/min) during excursion.")
                    elif rate_per_min < -0.3:
                        trend_type = "FALLING"
                        if is_out_of_bounds and curr_temp < target_min:
                            score += 10
                            reasons.append(f"Rapid downward temperature trend ({rate_per_min}°C/min) below threshold.")
            except Exception:
                pass

    # Calculate contiguous excursion duration from historical points
    if is_out_of_bounds and len(telemetry_list) > 1:
        try:
            latest_time = datetime.fromisoformat(latest["recorded_at"])
            earliest_excursion_time = latest_time
            for t_item in telemetry_list:
                temp_val = t_item.get("temperature")
                if temp_val is not None and (temp_val < target_min or temp_val > target_max):
                    earliest_excursion_time = datetime.fromisoformat(t_item["recorded_at"])
                else:
                    break
            excursion_duration_sec = int((latest_time - earliest_excursion_time).total_seconds())
            duration_mins = round(excursion_duration_sec / 60.0, 1)

            if duration_mins >= 5.0:
                score += 25
                reasons.append(f"Prolonged temperature deviation lasting {duration_mins} minutes.")
                actions.append("Escalate shipment for quality inspection upon destination arrival.")
            elif duration_mins >= 2.0:
                score += 15
                reasons.append(f"Temperature excursion duration: {duration_mins} minutes.")
        except Exception:
            pass

    # 3. Door Sensor Status
    if door_status and door_status.upper() == "OPEN":
        score += 20
        reasons.append("Cargo door interlock sensor is currently OPEN.")
        actions.append("Verify cargo door closure and inspect compartment seal integrity.")

    # 4. Refrigeration Compressor Status
    if refrig_status and refrig_status.upper() == "OFF":
        score += 30
        reasons.append("Refrigeration compressor unit is reported OFF.")
        actions.append("Inspect refrigeration unit power and restart compressor immediately.")

    # 5. Compound Multi-Risk Conditions
    if is_out_of_bounds and refrig_status and refrig_status.upper() == "OFF":
        score += 20
        reasons.append("Compound risk: Refrigeration OFF while temperature is outside safe range.")

    if is_out_of_bounds and door_status and door_status.upper() == "OPEN":
        score += 15
        reasons.append("Compound risk: Door is OPEN during temperature excursion.")

    # 6. Active Alerts Integration
    if open_alerts:
        alert_pts = min(30, len(open_alerts) * 15)
        score += alert_pts
        for a in open_alerts[:2]:
            reasons.append(f"Active alert #{a['alert_id']} ({a['alert_type']}) pending resolution.")

    # 7. Clamp Score & Map Risk Level
    risk_score = max(0, min(100, score))

    if risk_score >= 75:
        risk_level = "CRITICAL"
    elif risk_score >= 50:
        risk_level = "HIGH"
    elif risk_score >= 25:
        risk_level = "WARNING"
    else:
        risk_level = "NORMAL"

    if not actions:
        actions.append("Maintain continuous monitoring. All monitored parameters are within safe limits.")

    # Deduplicate actions
    unique_actions = list(dict.fromkeys(actions))

    return {
        "shipment_id": shipment_id,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "latest_temperature": curr_temp,
        "target_min": target_min,
        "target_max": target_max,
        "humidity": curr_humidity,
        "door_status": door_status,
        "refrigeration_status": refrig_status,
        "latest_location": {"latitude": lat, "longitude": lon} if lat and lon else None,
        "latest_recorded_at": recorded_at_str,
        "temperature_trend": {
            "trend": trend_type,
            "rate_per_min": rate_per_min,
            "excursion_duration_seconds": excursion_duration_sec
        },
        "active_alerts_count": len(open_alerts),
        "active_alerts": open_alerts,
        "risk_reasons": reasons,
        "recommended_actions": unique_actions
    }


# ====================================================================
# CORE SYSTEM & HEALTH ENDPOINTS (PRESERVED)
# ====================================================================

@app.get("/")
def home():
    return {
        "system": "AGRITrust — Verified Farm-to-Buyer Logistics",
        "message": "FTL Cold Chain Intelligence API is running",
        "version": "2.4.0"
    }


@app.get("/telemetry/latest")
def get_latest_telemetry():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            telemetry_id,
            shipment_id,
            temperature,
            humidity,
            latitude,
            longitude,
            door_status,
            refrigeration_status,
            recorded_at
        FROM telemetry
        ORDER BY recorded_at DESC
        LIMIT 20;
    """)

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    telemetry = []
    for row in rows:
        telemetry.append({
            "telemetry_id": row[0],
            "shipment_id": row[1],
            "temperature": float(row[2]) if row[2] is not None else None,
            "humidity": float(row[3]) if row[3] is not None else None,
            "latitude": float(row[4]) if row[4] is not None else None,
            "longitude": float(row[5]) if row[5] is not None else None,
            "door_status": row[6],
            "refrigeration_status": row[7],
            "recorded_at": row[8].isoformat() if row[8] else None
        })

    return {
        "count": len(telemetry),
        "data": telemetry
    }


@app.post("/alerts/check")
def check_temperature_alert():
    connection = get_connection()
    cursor = connection.cursor()

    # Get latest telemetry and shipment temperature limits
    cursor.execute("""
        SELECT
            t.shipment_id,
            t.temperature,
            s.target_temp_min,
            s.target_temp_max
        FROM telemetry t
        JOIN shipments s
            ON t.shipment_id = s.shipment_id
        ORDER BY t.recorded_at DESC
        LIMIT 1;
    """)

    row = cursor.fetchone()

    if row is None:
        cursor.close()
        connection.close()
        return {
            "message": "No telemetry data available"
        }

    shipment_id = row[0]
    temperature = float(row[1])
    target_min = float(row[2])
    target_max = float(row[3])

    # ------------------------------------------------
    # CASE 1: Temperature is back to normal
    # ------------------------------------------------
    if target_min <= temperature <= target_max:
        # Find an open temperature alert
        cursor.execute("""
            SELECT alert_id
            FROM alerts
            WHERE shipment_id = %s
              AND status = 'OPEN'
              AND alert_type IN (
                  'HIGH_TEMPERATURE',
                  'LOW_TEMPERATURE'
              )
            ORDER BY created_at DESC
            LIMIT 1;
        """, (shipment_id,))

        existing_alert = cursor.fetchone()

        if existing_alert:
            alert_id = existing_alert[0]

            # Resolve the alert
            cursor.execute("""
                UPDATE alerts
                SET
                    status = 'RESOLVED',
                    resolved_at = CURRENT_TIMESTAMP
                WHERE alert_id = %s;
            """, (alert_id,))

            connection.commit()
            cursor.close()
            connection.close()

            return {
                "status": "ALERT_RESOLVED",
                "alert_id": alert_id,
                "shipment_id": shipment_id,
                "temperature": temperature,
                "message": "Temperature returned to the safe range."
            }

        cursor.close()
        connection.close()

        return {
            "status": "NORMAL",
            "shipment_id": shipment_id,
            "temperature": temperature,
            "target_range": f"{target_min}°C - {target_max}°C",
            "message": "Temperature is within safe range."
        }

    # ------------------------------------------------
    # CASE 2: Temperature is too low
    # ------------------------------------------------
    if temperature < target_min:
        severity = "CRITICAL"
        alert_type = "LOW_TEMPERATURE"
        message = f"Temperature dropped below safe range: {temperature}°C"
        recommended_action = "Inspect refrigeration system and verify cargo temperature."

    # ------------------------------------------------
    # CASE 3: Temperature is too high
    # ------------------------------------------------
    else:
        severity = "CRITICAL"
        alert_type = "HIGH_TEMPERATURE"
        message = f"Temperature exceeded safe range: {temperature}°C"
        recommended_action = "Inspect refrigeration system and initiate corrective cooling."

    # ------------------------------------------------
    # Check for an existing OPEN alert
    # ------------------------------------------------
    cursor.execute("""
        SELECT alert_id
        FROM alerts
        WHERE shipment_id = %s
          AND alert_type = %s
          AND status = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 1;
    """, (shipment_id, alert_type))

    existing_alert = cursor.fetchone()

    # Existing alert -> don't create duplicate
    if existing_alert:
        alert_id = existing_alert[0]
        cursor.close()
        connection.close()

        return {
            "status": "ALERT_ALREADY_OPEN",
            "alert_id": alert_id,
            "shipment_id": shipment_id,
            "severity": severity,
            "temperature": temperature,
            "message": "Existing alert is already open.",
            "recommended_action": recommended_action
        }

    # ------------------------------------------------
    # Create new alert
    # ------------------------------------------------
    cursor.execute("""
        INSERT INTO alerts (
            shipment_id,
            alert_type,
            severity,
            message,
            recommended_action,
            temperature,
            status
        )
        VALUES (%s, %s, %s, %s, %s, %s, 'OPEN')
        RETURNING alert_id;
    """, (
        shipment_id,
        alert_type,
        severity,
        message,
        recommended_action,
        temperature
    ))

    alert_id = cursor.fetchone()[0]
    connection.commit()
    cursor.close()
    connection.close()

    return {
        "status": "NEW_ALERT",
        "alert_id": alert_id,
        "shipment_id": shipment_id,
        "severity": severity,
        "temperature": temperature,
        "message": message,
        "recommended_action": recommended_action
    }


# ====================================================================
# PHASE 4: QR-BASED SHIPMENT VERIFICATION APIS
# ====================================================================

# GET /verify/{shipment_id} — Public Trust Verification Endpoint
@app.get("/verify/{shipment_id}", tags=["Verification"])
def verify_shipment(shipment_id: str):
    """
    Public trust verification endpoint for AGRITrust digital shipments.
    Returns the immutable ORIGINAL shipment baseline, quantity grading, transport specs, and verification status.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # Query original shipment baseline
    cursor.execute("""
        SELECT 
            s.shipment_id,
            s.product_name,
            s.origin,
            s.destination,
            s.vehicle_id,
            s.target_temp_min,
            s.target_temp_max,
            s.shipment_status,
            s.departure_time,
            v.vehicle_number,
            v.vehicle_type
        FROM shipments s
        LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        WHERE s.shipment_id = %s;
    """, (shipment_id,))

    ship_row = cursor.fetchone()
    if not ship_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found in AGRITrust verification registry."
        )

    # Query original quality and grading baseline (earliest recorded baseline)
    cursor.execute("""
        SELECT grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity, recorded_by, recorded_at
        FROM shipment_quality
        WHERE shipment_id = %s
        ORDER BY recorded_at ASC
        LIMIT 1;
    """, (shipment_id,))
    q_row = cursor.fetchone()

    cursor.close()
    connection.close()

    total_qty = float(q_row[3]) if q_row and q_row[3] is not None else 0.0
    grade_a = float(q_row[0]) if q_row and q_row[0] is not None else 0.0
    grade_b = float(q_row[1]) if q_row and q_row[1] is not None else 0.0

    return {
        "shipment_id": ship_row[0],
        "product_name": ship_row[1],
        "total_quantity": total_qty,
        "grade_a_quantity": grade_a,
        "grade_b_quantity": grade_b,
        "origin": ship_row[2],
        "destination": ship_row[3],
        "vehicle_id": ship_row[4],
        "vehicle_number": ship_row[9],
        "vehicle_type": ship_row[10],
        "target_temperature_range": {
            "min": float(ship_row[5]) if ship_row[5] is not None else 10.0,
            "max": float(ship_row[6]) if ship_row[6] is not None else 13.0,
            "unit": "°C"
        },
        "shipment_status": ship_row[7],
        "shipment_creation_time": ship_row[8].isoformat() if ship_row[8] else None,
        "verification_status": "VERIFIED"
    }


# GET /shipments/{shipment_id}/qr — Generate Dynamic QR Code Image (PNG)
@app.get("/shipments/{shipment_id}/qr", tags=["Verification"])
def generate_shipment_qr(
    shipment_id: str, 
    request: Request,
    base_url: Optional[str] = Query(None, description="Custom base verification URL override")
):
    """
    Generates a dynamic high-resolution QR code (PNG) encoding the AGRITrust verification URL.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # Verify shipment exists
    cursor.execute("SELECT shipment_id FROM shipments WHERE shipment_id = %s;", (shipment_id,))
    if not cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found. Cannot generate QR code."
        )

    cursor.close()
    connection.close()

    # Determine verification URL
    if base_url and base_url.strip():
        server_root = base_url.strip().rstrip("/")
    else:
        server_root = str(request.base_url).rstrip("/")
        if "127.0.0.1" in server_root or "localhost" in server_root:
            server_root = "http://127.0.0.1:8000"

    verification_url = f"{server_root}/verify/{shipment_id}"

    # Generate QR Code using qrcode library
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={
            "X-Verification-Url": verification_url,
            "X-Shipment-Id": shipment_id,
            "Content-Disposition": f'inline; filename="agritrust_qr_{shipment_id}.png"'
        }
    )


# ====================================================================
# PHASE 3: FARMER SHIPMENT CREATION & AGRITRUST WORKFLOW APIS
# ====================================================================

# 1. POST /shipments — Farmer Shipment Creation
@app.post("/shipments", status_code=status.HTTP_201_CREATED, tags=["Shipments"])
def create_shipment(payload: ShipmentCreate):
    connection = get_connection()
    cursor = connection.cursor()

    # 1. Required field validations
    if not payload.product_name or not payload.product_name.strip():
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="product_name cannot be empty."
        )

    if not payload.origin or not payload.origin.strip():
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="origin cannot be empty."
        )

    if not payload.destination or not payload.destination.strip():
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="destination cannot be empty."
        )

    if not payload.vehicle_id or not payload.vehicle_id.strip():
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="vehicle_id cannot be empty."
        )

    # 2. Total quantity validation
    if payload.total_quantity <= 0:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="total_quantity must be greater than 0."
        )

    # 3. Grade quantity validation
    grade_a = payload.grade_a_quantity if payload.grade_a_quantity is not None else 0.0
    grade_b = payload.grade_b_quantity if payload.grade_b_quantity is not None else 0.0
    
    if grade_a < 0 or grade_b < 0:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grade A and Grade B quantities cannot be negative."
        )

    if (grade_a + grade_b) > payload.total_quantity:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grade A quantity ({grade_a} kg) + Grade B quantity ({grade_b} kg) cannot exceed total quantity ({payload.total_quantity} kg)."
        )

    damaged_qty = payload.damaged_quantity if payload.damaged_quantity is not None and payload.damaged_quantity > 0 else round(payload.total_quantity - (grade_a + grade_b), 2)

    # 4. Temperature range validation
    if payload.target_temp_min >= payload.target_temp_max:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum target temperature ({payload.target_temp_min}°C) must be strictly lower than maximum target temperature ({payload.target_temp_max}°C)."
        )

    # 5. Vehicle existence check
    cursor.execute("SELECT vehicle_id, vehicle_number, vehicle_type FROM vehicles WHERE vehicle_id = %s;", (payload.vehicle_id.strip(),))
    vehicle_row = cursor.fetchone()
    if not vehicle_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle ID '{payload.vehicle_id}' does not exist in vehicles registry."
        )

    # 6. Determine / Generate Unique Shipment ID
    shipment_id = payload.shipment_id.strip() if payload.shipment_id and payload.shipment_id.strip() else None

    if shipment_id:
        cursor.execute("SELECT shipment_id FROM shipments WHERE shipment_id = %s;", (shipment_id,))
        if cursor.fetchone():
            cursor.close()
            connection.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Shipment with ID '{shipment_id}' already exists."
            )
    else:
        # Generate unique AGRI-XXXX identifier
        cursor.execute("""
            SELECT shipment_id FROM shipments 
            WHERE shipment_id LIKE 'AGRI-%'
            ORDER BY shipment_id DESC;
        """)
        existing_agri_ids = cursor.fetchall()
        max_num = 1000
        for (s_id,) in existing_agri_ids:
            try:
                num_part = int(s_id.split('-')[1])
                if num_part > max_num:
                    max_num = num_part
            except (IndexError, ValueError):
                pass
        shipment_id = f"AGRI-{max_num + 1}"

    departure_now = datetime.now()
    recorded_by = payload.recorded_by or "Farmer_Nashik_01"

    # 7. Store core shipment in shipments
    cursor.execute("""
        INSERT INTO shipments (
            shipment_id,
            vehicle_id,
            product_name,
            origin,
            destination,
            target_temp_min,
            target_temp_max,
            shipment_status,
            departure_time,
            expected_delivery_time
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """, (
        shipment_id,
        payload.vehicle_id.strip(),
        payload.product_name.strip(),
        payload.origin.strip(),
        payload.destination.strip(),
        payload.target_temp_min,
        payload.target_temp_max,
        payload.shipment_status or "CREATED",
        departure_now,
        payload.expected_delivery_time
    ))

    # 8. Store initial quality and grading baseline in shipment_quality
    cursor.execute("""
        INSERT INTO shipment_quality (
            shipment_id,
            grade_a_quantity,
            grade_b_quantity,
            damaged_quantity,
            total_quantity,
            quality_notes,
            recorded_by,
            recorded_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
    """, (
        shipment_id,
        grade_a,
        grade_b,
        damaged_qty,
        payload.total_quantity,
        payload.quality_notes or "Initial farm gate grading baseline.",
        recorded_by,
        departure_now
    ))

    # 9. Store immutable creation & dispatch event in shipment_events
    event_snapshot = {
        "initial_temperature": payload.initial_temperature,
        "initial_humidity": payload.initial_humidity,
        "grade_a_quantity": grade_a,
        "grade_b_quantity": grade_b,
        "damaged_quantity": damaged_qty,
        "total_quantity": payload.total_quantity,
        "target_temp_min": payload.target_temp_min,
        "target_temp_max": payload.target_temp_max,
        "recorded_by": recorded_by,
        "vehicle_number": vehicle_row[1]
    }

    cursor.execute("""
        INSERT INTO shipment_events (
            shipment_id,
            event_type,
            actor_role,
            location,
            event_description,
            event_data,
            event_timestamp
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s);
    """, (
        shipment_id,
        "FARMER_DISPATCH",
        "FARMER",
        payload.origin.strip(),
        f"Farm gate digital consignment created and dispatched by {recorded_by}. Produce: {payload.product_name}, Total: {payload.total_quantity} kg (Grade A: {grade_a} kg, Grade B: {grade_b} kg). Safe Temp Band: {payload.target_temp_min}°C - {payload.target_temp_max}°C.",
        Json(event_snapshot),
        departure_now
    ))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "status": "SUCCESS",
        "message": f"Farmer digital shipment '{shipment_id}' created successfully.",
        "shipment_id": shipment_id,
        "product": payload.product_name,
        "total_quantity": payload.total_quantity,
        "grade_information": {
            "grade_a_quantity": grade_a,
            "grade_b_quantity": grade_b,
            "damaged_quantity": damaged_qty
        },
        "origin": payload.origin,
        "destination": payload.destination,
        "vehicle": {
            "vehicle_id": payload.vehicle_id,
            "vehicle_number": vehicle_row[1],
            "vehicle_type": vehicle_row[2]
        },
        "temperature_range": {
            "min": payload.target_temp_min,
            "max": payload.target_temp_max,
            "unit": "°C"
        },
        "initial_condition": {
            "initial_temperature": payload.initial_temperature,
            "initial_humidity": payload.initial_humidity
        },
        "shipment_status": payload.shipment_status or "CREATED",
        "creation_timestamp": departure_now.isoformat()
    }


# 2. GET /shipments — List all shipments
@app.get("/shipments", tags=["Shipments"])
def list_shipments():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            s.shipment_id,
            s.vehicle_id,
            s.product_name,
            s.origin,
            s.destination,
            s.target_temp_min,
            s.target_temp_max,
            s.shipment_status,
            s.departure_time,
            s.expected_delivery_time,
            v.vehicle_number,
            v.vehicle_type
        FROM shipments s
        LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        ORDER BY s.departure_time DESC NULLS LAST;
    """)

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    shipments = []
    for r in rows:
        shipments.append({
            "shipment_id": r[0],
            "vehicle_id": r[1],
            "product_name": r[2],
            "origin": r[3],
            "destination": r[4],
            "target_temp_min": float(r[5]) if r[5] is not None else None,
            "target_temp_max": float(r[6]) if r[6] is not None else None,
            "shipment_status": r[7],
            "departure_time": r[8].isoformat() if r[8] else None,
            "expected_delivery_time": r[9].isoformat() if r[9] else None,
            "vehicle_number": r[10],
            "vehicle_type": r[11]
        })

    return {
        "count": len(shipments),
        "data": shipments
    }


# Preserved helper endpoint for backward-compatibility
@app.get("/shipments/current", tags=["Shipments"])
def get_current_shipment():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            s.shipment_id,
            s.vehicle_id,
            s.product_name,
            s.origin,
            s.destination,
            s.target_temp_min,
            s.target_temp_max,
            s.shipment_status,
            s.departure_time,
            s.expected_delivery_time,
            v.vehicle_number,
            v.vehicle_type,
            v.capacity_kg,
            v.refrigeration_status as vehicle_refrig_status,
            v.status as vehicle_status
        FROM shipments s
        LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        ORDER BY s.departure_time DESC NULLS LAST
        LIMIT 1;
    """)
    row = cursor.fetchone()
    cursor.close()
    connection.close()

    if not row:
        return {"data": None}

    return {
        "data": {
            "shipment_id": row[0],
            "vehicle_id": row[1],
            "product_name": row[2],
            "origin": row[3],
            "destination": row[4],
            "target_temp_min": float(row[5]) if row[5] is not None else None,
            "target_temp_max": float(row[6]) if row[6] is not None else None,
            "shipment_status": row[7],
            "departure_time": row[8].isoformat() if row[8] else None,
            "expected_delivery_time": row[9].isoformat() if row[9] else None,
            "vehicle_number": row[10],
            "vehicle_type": row[11],
            "capacity_kg": row[12],
            "vehicle_refrigeration_status": row[13],
            "vehicle_status": row[14],
        }
    }


# 3. GET /shipments/{shipment_id} — Get single shipment details
@app.get("/shipments/{shipment_id}", tags=["Shipments"])
def get_shipment_details(shipment_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            s.shipment_id,
            s.vehicle_id,
            s.product_name,
            s.origin,
            s.destination,
            s.target_temp_min,
            s.target_temp_max,
            s.shipment_status,
            s.departure_time,
            s.expected_delivery_time,
            v.vehicle_number,
            v.vehicle_type,
            v.capacity_kg,
            v.refrigeration_status,
            v.status as vehicle_status
        FROM shipments s
        LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        WHERE s.shipment_id = %s;
    """, (shipment_id,))

    row = cursor.fetchone()
    if not row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found."
        )

    # Fetch latest telemetry snapshot for this shipment
    cursor.execute("""
        SELECT temperature, humidity, latitude, longitude, door_status, refrigeration_status, recorded_at
        FROM telemetry
        WHERE shipment_id = %s
        ORDER BY recorded_at DESC
        LIMIT 1;
    """, (shipment_id,))
    t_row = cursor.fetchone()

    latest_telemetry = None
    if t_row:
        latest_telemetry = {
            "temperature": float(t_row[0]) if t_row[0] is not None else None,
            "humidity": float(t_row[1]) if t_row[1] is not None else None,
            "latitude": float(t_row[2]) if t_row[2] is not None else None,
            "longitude": float(t_row[3]) if t_row[3] is not None else None,
            "door_status": t_row[4],
            "refrigeration_status": t_row[5],
            "recorded_at": t_row[6].isoformat() if t_row[6] else None
        }

    # Fetch quality summary if exists
    cursor.execute("""
        SELECT grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity, quality_notes, recorded_by, recorded_at
        FROM shipment_quality
        WHERE shipment_id = %s
        ORDER BY recorded_at DESC
        LIMIT 1;
    """, (shipment_id,))
    q_row = cursor.fetchone()

    quality_summary = None
    if q_row:
        quality_summary = {
            "grade_a_quantity": float(q_row[0]),
            "grade_b_quantity": float(q_row[1]),
            "damaged_quantity": float(q_row[2]),
            "total_quantity": float(q_row[3]),
            "quality_notes": q_row[4],
            "recorded_by": q_row[5],
            "recorded_at": q_row[6].isoformat() if q_row[6] else None
        }

    # Count open alerts
    cursor.execute("""
        SELECT COUNT(*) FROM alerts WHERE shipment_id = %s AND status = 'OPEN';
    """, (shipment_id,))
    open_alerts_cnt = cursor.fetchone()[0]

    # Receiving status if exists
    cursor.execute("""
        SELECT receiving_id, received_quantity, received_grade_a, received_grade_b, damaged_quantity, receiving_notes, received_by, received_at
        FROM receiving_records
        WHERE shipment_id = %s
        ORDER BY received_at DESC
        LIMIT 1;
    """, (shipment_id,))
    r_row = cursor.fetchone()

    receiving_status = None
    if r_row:
        receiving_status = {
            "receiving_id": r_row[0],
            "received_quantity": float(r_row[1]),
            "received_grade_a": float(r_row[2]) if r_row[2] is not None else 0.0,
            "received_grade_b": float(r_row[3]) if r_row[3] is not None else 0.0,
            "damaged_quantity": float(r_row[4]) if r_row[4] is not None else 0.0,
            "receiving_notes": r_row[5],
            "received_by": r_row[6],
            "received_at": r_row[7].isoformat() if r_row[7] else None
        }

    cursor.close()
    connection.close()

    return {
        "shipment_id": row[0],
        "vehicle_id": row[1],
        "product_name": row[2],
        "origin": row[3],
        "destination": row[4],
        "target_temp_min": float(row[5]) if row[5] is not None else None,
        "target_temp_max": float(row[6]) if row[6] is not None else None,
        "shipment_status": row[7],
        "departure_time": row[8].isoformat() if row[8] else None,
        "expected_delivery_time": row[9].isoformat() if row[9] else None,
        "vehicle": {
            "vehicle_number": row[10],
            "vehicle_type": row[11],
            "capacity_kg": row[12],
            "refrigeration_status": row[13],
            "vehicle_status": row[14]
        },
        "latest_telemetry": latest_telemetry,
        "quality_summary": quality_summary,
        "open_alerts_count": open_alerts_cnt,
        "receiving_status": receiving_status
    }


# 4. POST /shipments/{shipment_id}/handover — Record Farmer -> Logistics Handover
@app.post("/shipments/{shipment_id}/handover", status_code=status.HTTP_201_CREATED, tags=["Logistics Handover"])
def record_handover(shipment_id: str, payload: HandoverCreate):
    """
    Records a formal digital handover event from Farmer to Logistics Provider in shipment_events.
    Enforces that the original shipment record is preserved and duplicate handovers are rejected.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # 1. Validate shipment existence
    cursor.execute("""
        SELECT shipment_id, vehicle_id, shipment_status, origin 
        FROM shipments 
        WHERE shipment_id = %s;
    """, (shipment_id,))
    ship_row = cursor.fetchone()
    if not ship_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found."
        )

    # 2. Check if a farmer-to-logistics handover event was already recorded (prevent duplicate handover)
    cursor.execute("""
        SELECT event_id, event_timestamp 
        FROM shipment_events 
        WHERE shipment_id = %s AND event_type = 'FARMER_TO_LOGISTICS_HANDOVER';
    """, (shipment_id,))
    existing_ho = cursor.fetchone()
    if existing_ho:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Farmer-to-logistics handover already recorded for shipment '{shipment_id}' (Event #{existing_ho[0]}). Duplicate handover is rejected."
        )

    # 3. Validate vehicle existence if vehicle_id supplied
    vehicle_number = None
    vehicle_type = None
    v_id = payload.vehicle_id.strip() if payload.vehicle_id and payload.vehicle_id.strip() else ship_row[1]

    if v_id:
        cursor.execute("SELECT vehicle_id, vehicle_number, vehicle_type FROM vehicles WHERE vehicle_id = %s;", (v_id,))
        v_row = cursor.fetchone()
        if not v_row:
            cursor.close()
            connection.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle ID '{v_id}' not found in registry."
            )
        vehicle_number = v_row[1]
        vehicle_type = v_row[2]

    # 4. Validate handover quantity if supplied
    if payload.handover_quantity is not None and payload.handover_quantity < 0:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Handover quantity cannot be negative."
        )

    event_time = payload.handover_timestamp or datetime.now()
    notes = payload.notes or "Shipment handed over for refrigerated transport."
    event_desc = f"Shipment handed over from farm gate to logistics provider ({payload.logistics_receiver}) at {payload.location}. Transport Vehicle: {vehicle_number or v_id}. Notes: {notes}"

    event_snapshot = {
        "logistics_receiver": payload.logistics_receiver,
        "actor_role": payload.actor_role or "LOGISTICS",
        "location": payload.location,
        "vehicle_id": v_id,
        "vehicle_number": vehicle_number,
        "vehicle_type": vehicle_type,
        "handover_temperature": payload.handover_temperature,
        "handover_humidity": payload.handover_humidity,
        "handover_quantity": payload.handover_quantity,
        "notes": notes
    }
    if payload.event_data:
        event_snapshot.update(payload.event_data)

    # 5. Insert permanent handover event in shipment_events
    cursor.execute("""
        INSERT INTO shipment_events (
            shipment_id,
            event_type,
            actor_role,
            location,
            event_description,
            event_data,
            event_timestamp
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING event_id;
    """, (
        shipment_id,
        "FARMER_TO_LOGISTICS_HANDOVER",
        payload.actor_role or "LOGISTICS",
        payload.location,
        event_desc,
        Json(event_snapshot),
        event_time
    ))
    event_id = cursor.fetchone()[0]

    # 6. Update current shipment status to IN TRANSIT without modifying historical baseline
    cursor.execute("""
        UPDATE shipments 
        SET shipment_status = 'IN TRANSIT' 
        WHERE shipment_id = %s;
    """, (shipment_id,))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "status": "SUCCESS",
        "message": "Farmer-to-logistics handover recorded successfully.",
        "shipment_id": shipment_id,
        "event_id": event_id,
        "event_type": "FARMER_TO_LOGISTICS_HANDOVER",
        "handover_timestamp": event_time.isoformat(),
        "logistics_receiver": payload.logistics_receiver,
        "location": payload.location,
        "vehicle": {
            "vehicle_id": v_id,
            "vehicle_number": vehicle_number
        },
        "shipment_status": "IN TRANSIT"
    }


# ====================================================================
# SENT-VS-RECEIVED COMPARISON ENGINE HELPER
# ====================================================================

def calculate_sent_vs_received(
    shipment_id: str,
    product_name: str,
    dispatched_data: Dict[str, Any],
    received_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compares the immutable original farmer dispatch baseline against the buyer receiving record.
    Identifies factual differences in quantity, grade distributions, damaged produce, and arrival temperature.
    """
    disp_total = float(dispatched_data.get("total_quantity") or 0.0)
    disp_grade_a = float(dispatched_data.get("grade_a_quantity") or 0.0)
    disp_grade_b = float(dispatched_data.get("grade_b_quantity") or 0.0)
    target_min = float(dispatched_data.get("target_temp_min") if dispatched_data.get("target_temp_min") is not None else 10.0)
    target_max = float(dispatched_data.get("target_temp_max") if dispatched_data.get("target_temp_max") is not None else 13.0)
    disp_time = dispatched_data.get("dispatch_time")

    recv_total = float(received_data.get("received_quantity") or 0.0)
    recv_grade_a = float(received_data.get("received_grade_a") or 0.0)
    recv_grade_b = float(received_data.get("received_grade_b") or 0.0)
    recv_damaged = float(received_data.get("damaged_quantity") or 0.0)
    recv_temp = float(received_data.get("receiving_temperature")) if received_data.get("receiving_temperature") is not None else None
    recv_time = received_data.get("receiving_time")

    # Quantities and Differences
    total_diff = round(recv_total - disp_total, 2)
    grade_a_diff = round(recv_grade_a - disp_grade_a, 2)
    grade_b_diff = round(recv_grade_b - disp_grade_b, 2)
    
    temp_diff = None
    if recv_temp is not None:
        if recv_temp > target_max:
            temp_diff = round(recv_temp - target_max, 2)
        elif recv_temp < target_min:
            temp_diff = round(recv_temp - target_min, 2)
        else:
            temp_diff = 0.0

    # Factual Discrepancy Rules:
    # 1. Quantity Discrepancy: |total_diff| > 5.0 kg or > 1% variance
    has_quantity_discrepancy = abs(total_diff) > 5.0 or (disp_total > 0 and (abs(total_diff) / disp_total) > 0.01)
    
    # 2. Quality Discrepancy: Grade A deficit > 10.0 kg or Damaged produce > 5.0 kg
    has_quality_discrepancy = (grade_a_diff < -10.0) or (recv_damaged > 5.0)

    if has_quantity_discrepancy and has_quality_discrepancy:
        comparison_status = "QUANTITY_AND_QUALITY_DISCREPANCY"
    elif has_quantity_discrepancy:
        comparison_status = "QUANTITY_DISCREPANCY"
    elif has_quality_discrepancy:
        comparison_status = "QUALITY_DISCREPANCY"
    else:
        comparison_status = "NO_SIGNIFICANT_DISCREPANCY"

    discrepancy_details = []
    if total_diff < 0:
        pct_loss = round((abs(total_diff) / disp_total) * 100, 1) if disp_total > 0 else 0
        discrepancy_details.append(f"Quantity discrepancy detected: Received total ({recv_total} kg) is {abs(total_diff)} kg less than dispatched baseline ({disp_total} kg, -{pct_loss}%).")
    elif total_diff > 0:
        discrepancy_details.append(f"Quantity variance detected: Received total ({recv_total} kg) exceeds dispatched baseline ({disp_total} kg) by +{total_diff} kg.")

    if grade_a_diff < 0:
        discrepancy_details.append(f"Grade distribution differs from original dispatch record: Grade A received ({recv_grade_a} kg) is {abs(grade_a_diff)} kg below dispatched baseline ({disp_grade_a} kg).")

    if grade_b_diff != 0:
        discrepancy_details.append(f"Grade B variance: Received {recv_grade_b} kg vs dispatched baseline {disp_grade_b} kg ({grade_b_diff:+} kg).")

    if recv_damaged > 0:
        discrepancy_details.append(f"Damaged produce recorded at receiving: {recv_damaged} kg.")

    if recv_temp is not None and temp_diff != 0.0:
        if recv_temp > target_max:
            discrepancy_details.append(f"Receiving temperature ({recv_temp}°C) exceeded maximum target threshold ({target_max}°C) by +{temp_diff}°C.")
        elif recv_temp < target_min:
            discrepancy_details.append(f"Receiving temperature ({recv_temp}°C) was below minimum target threshold ({target_min}°C) by {temp_diff}°C.")

    if not discrepancy_details:
        discrepancy_details.append("No significant discrepancy detected between dispatch baseline and buyer receiving record.")

    return {
        "shipment_id": shipment_id,
        "product_name": product_name,
        "dispatched": {
            "total_quantity": disp_total,
            "grade_a_quantity": disp_grade_a,
            "grade_b_quantity": disp_grade_b,
            "target_temperature_range": {
                "min": target_min,
                "max": target_max,
                "unit": "°C"
            },
            "dispatch_time": disp_time
        },
        "received": {
            "total_quantity": recv_total,
            "grade_a_quantity": recv_grade_a,
            "grade_b_quantity": recv_grade_b,
            "damaged_quantity": recv_damaged,
            "receiving_temperature": recv_temp,
            "receiving_time": recv_time
        },
        "differences": {
            "total_quantity_difference": total_diff,
            "grade_a_difference": grade_a_diff,
            "grade_b_difference": grade_b_diff,
            "damaged_quantity": recv_damaged,
            "temperature_difference": temp_diff
        },
        "comparison_status": comparison_status,
        "discrepancy_details": discrepancy_details
    }


# 5. POST /shipments/{shipment_id}/receive — Record Buyer Receiving Record & Verification
@app.post("/shipments/{shipment_id}/receive", status_code=status.HTTP_201_CREATED, tags=["Buyer Receiving & Verification"])
def receive_shipment(shipment_id: str, payload: ReceivingCreate):
    """
    Records a digital buyer receiving record, validates chain-of-custody, compares sent-vs-received metrics,
    and automatically logs an incident if a discrepancy threshold is breached.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # 1. Validate shipment existence
    cursor.execute("""
        SELECT shipment_id, product_name, origin, destination, target_temp_min, target_temp_max, departure_time, shipment_status
        FROM shipments 
        WHERE shipment_id = %s;
    """, (shipment_id,))
    ship_row = cursor.fetchone()
    if not ship_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found."
        )

    # 2. Validate chain-of-custody: Shipment must have a logistics handover before buyer receiving
    cursor.execute("""
        SELECT event_id, event_timestamp 
        FROM shipment_events 
        WHERE shipment_id = %s AND event_type = 'FARMER_TO_LOGISTICS_HANDOVER';
    """, (shipment_id,))
    handover_row = cursor.fetchone()
    if not handover_row and ship_row[7] != "IN TRANSIT":
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shipment '{shipment_id}' has not undergone farmer-to-logistics handover. Cannot record buyer receiving before handover."
        )

    # 3. Check for existing completed receiving record (prevent duplicate receiving)
    cursor.execute("""
        SELECT receiving_id, received_at 
        FROM receiving_records 
        WHERE shipment_id = %s;
    """, (shipment_id,))
    existing_rec = cursor.fetchone()
    if existing_rec:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shipment '{shipment_id}' already has a completed receiving record (Receiving #{existing_rec[0]}). Duplicate receiving records are rejected."
        )

    # 4. Extract and validate quantities
    recv_total = payload.received_total_quantity if payload.received_total_quantity is not None else payload.received_quantity
    if recv_total is None or recv_total <= 0:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Received total quantity must be specified and greater than 0."
        )

    recv_grade_a = payload.received_grade_a if payload.received_grade_a is not None else 0.0
    recv_grade_b = payload.received_grade_b if payload.received_grade_b is not None else 0.0
    damaged_qty = payload.damaged_quantity if payload.damaged_quantity is not None else 0.0

    if recv_grade_a < 0 or recv_grade_b < 0:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grade A and Grade B quantities cannot be negative."
        )

    if damaged_qty < 0:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Damaged quantity cannot be negative."
        )

    if (recv_grade_a + recv_grade_b) > recv_total:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sum of Grade A ({recv_grade_a} kg) and Grade B ({recv_grade_b} kg) cannot exceed received total ({recv_total} kg)."
        )

    if (recv_grade_a + recv_grade_b + damaged_qty) > recv_total:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sum of Grade A ({recv_grade_a} kg), Grade B ({recv_grade_b} kg), and damaged ({damaged_qty} kg) exceeds received total ({recv_total} kg)."
        )

    receiver = payload.receiver_name or payload.received_by or "Buyer_Receiving_Operator"
    location = payload.receiving_location or payload.location or "Buyer Cold Depot"
    recv_time = payload.receiving_timestamp or datetime.now()
    notes = payload.receiving_notes or payload.notes or "Shipment received and inspected at buyer facility."

    # 5. Query immutable farmer dispatch quality baseline
    cursor.execute("""
        SELECT grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity, recorded_at
        FROM shipment_quality
        WHERE shipment_id = %s
        ORDER BY recorded_at ASC
        LIMIT 1;
    """, (shipment_id,))
    q_row = cursor.fetchone()

    disp_total = float(q_row[3]) if q_row and q_row[3] is not None else float(recv_total)
    disp_grade_a = float(q_row[0]) if q_row and q_row[0] is not None else 0.0
    disp_grade_b = float(q_row[1]) if q_row and q_row[1] is not None else 0.0
    disp_time = q_row[4].isoformat() if q_row and q_row[4] else (ship_row[6].isoformat() if ship_row[6] else None)

    dispatched_dict = {
        "total_quantity": disp_total,
        "grade_a_quantity": disp_grade_a,
        "grade_b_quantity": disp_grade_b,
        "target_temp_min": float(ship_row[4]) if ship_row[4] is not None else 10.0,
        "target_temp_max": float(ship_row[5]) if ship_row[5] is not None else 13.0,
        "dispatch_time": disp_time
    }

    received_dict = {
        "received_quantity": recv_total,
        "received_grade_a": recv_grade_a,
        "received_grade_b": recv_grade_b,
        "damaged_quantity": damaged_qty,
        "receiving_temperature": payload.receiving_temperature,
        "receiving_time": recv_time.isoformat()
    }

    # 6. Run Sent-vs-Received Verification
    comp_result = calculate_sent_vs_received(
        shipment_id=shipment_id,
        product_name=ship_row[1],
        dispatched_data=dispatched_dict,
        received_data=received_dict
    )
    comp_status = comp_result["comparison_status"]

    # 7. Insert into receiving_records
    cursor.execute("""
        INSERT INTO receiving_records (
            shipment_id,
            received_quantity,
            received_grade_a,
            received_grade_b,
            damaged_quantity,
            receiving_location,
            receiving_temperature,
            receiving_humidity,
            receiving_notes,
            received_by,
            received_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING receiving_id, received_at;
    """, (
        shipment_id,
        recv_total,
        recv_grade_a,
        recv_grade_b,
        damaged_qty,
        location,
        payload.receiving_temperature,
        payload.receiving_humidity,
        notes,
        receiver,
        recv_time
    ))
    receiving_id, db_recv_at = cursor.fetchone()

    # 8. Trigger Incident if Discrepancy Detected
    incident_id = None
    if comp_status != "NO_SIGNIFICANT_DISCREPANCY":
        # Determine incident severity based on magnitude
        total_delta = abs(comp_result["differences"]["total_quantity_difference"])
        if comp_status == "QUANTITY_AND_QUALITY_DISCREPANCY" or total_delta > 50.0 or damaged_qty > 50.0:
            severity = "CRITICAL"
        elif total_delta > 20.0 or damaged_qty > 20.0:
            severity = "HIGH"
        else:
            severity = "WARNING"

        inc_desc = f"Sent-vs-received discrepancy on {ship_row[1]} consignment. Status: {comp_status}. " + " ".join(comp_result["discrepancy_details"])

        cursor.execute("""
            INSERT INTO incidents (
                shipment_id,
                incident_type,
                severity,
                description,
                detected_at,
                status
            )
            VALUES (%s, %s, %s, %s, %s, 'OPEN')
            RETURNING incident_id;
        """, (
            shipment_id,
            comp_status,
            severity,
            inc_desc,
            recv_time
        ))
        incident_id = cursor.fetchone()[0]

    # 9. Insert permanent BUYER_RECEIVING event into shipment_events
    event_desc = f"Consignment received and inspected by {receiver} at {location}. Total: {recv_total} kg (Grade A: {recv_grade_a} kg, Grade B: {recv_grade_b} kg, Damaged: {damaged_qty} kg). Receiving Temp: {payload.receiving_temperature or 'N/A'}°C. Comparison: {comp_status}."

    event_snapshot = {
        "receiving_id": receiving_id,
        "receiver_name": receiver,
        "location": location,
        "received_quantity": recv_total,
        "received_grade_a": recv_grade_a,
        "received_grade_b": recv_grade_b,
        "damaged_quantity": damaged_qty,
        "receiving_temperature": payload.receiving_temperature,
        "receiving_humidity": payload.receiving_humidity,
        "comparison_status": comp_status,
        "incident_id": incident_id,
        "notes": notes
    }

    cursor.execute("""
        INSERT INTO shipment_events (
            shipment_id,
            event_type,
            actor_role,
            location,
            event_description,
            event_data,
            event_timestamp
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING event_id;
    """, (
        shipment_id,
        "BUYER_RECEIVING",
        "BUYER_RECEIVER",
        location,
        event_desc,
        Json(event_snapshot),
        recv_time
    ))
    event_id = cursor.fetchone()[0]

    # 10. Update shipment status to DELIVERED
    cursor.execute("""
        UPDATE shipments 
        SET shipment_status = 'DELIVERED' 
        WHERE shipment_id = %s;
    """, (shipment_id,))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "status": "SUCCESS",
        "message": f"Buyer receiving recorded for shipment '{shipment_id}'. Comparison status: {comp_status}.",
        "shipment_id": shipment_id,
        "receiving_record_id": receiving_id,
        "event_id": event_id,
        "incident_id": incident_id,
        "received_quantity": recv_total,
        "damaged_quantity": damaged_qty,
        "receiving_location": location,
        "receiving_timestamp": recv_time.isoformat(),
        "shipment_status": "DELIVERED",
        "comparison_status": comp_status,
        "comparison": comp_result
    }


# GET /shipments/{shipment_id}/comparison — Sent-vs-Received Verification Analysis
@app.get("/shipments/{shipment_id}/comparison", tags=["Buyer Receiving & Verification"])
def get_shipment_comparison(shipment_id: str):
    """
    Compares the immutable farmer dispatch baseline against the buyer receiving record.
    Returns dispatched vs received quantities, quality grading, temperature differences, and incident tracking.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # Query shipment & target temp
    cursor.execute("""
        SELECT shipment_id, product_name, target_temp_min, target_temp_max, departure_time, shipment_status
        FROM shipments
        WHERE shipment_id = %s;
    """, (shipment_id,))
    ship_row = cursor.fetchone()
    if not ship_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found."
        )

    # Query initial quality baseline
    cursor.execute("""
        SELECT grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity, recorded_at
        FROM shipment_quality
        WHERE shipment_id = %s
        ORDER BY recorded_at ASC
        LIMIT 1;
    """, (shipment_id,))
    q_row = cursor.fetchone()

    disp_total = float(q_row[3]) if q_row and q_row[3] is not None else 0.0
    disp_grade_a = float(q_row[0]) if q_row and q_row[0] is not None else 0.0
    disp_grade_b = float(q_row[1]) if q_row and q_row[1] is not None else 0.0
    disp_time = q_row[4].isoformat() if q_row and q_row[4] else (ship_row[4].isoformat() if ship_row[4] else None)

    # Query receiving record
    cursor.execute("""
        SELECT receiving_id, received_quantity, received_grade_a, received_grade_b, damaged_quantity, 
               receiving_location, receiving_temperature, receiving_humidity, receiving_notes, received_by, received_at
        FROM receiving_records
        WHERE shipment_id = %s
        ORDER BY received_at DESC
        LIMIT 1;
    """, (shipment_id,))
    r_row = cursor.fetchone()

    if not r_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No buyer receiving record found for shipment '{shipment_id}'. Comparison requires a completed receiving record."
        )

    # Check for linked incident
    cursor.execute("""
        SELECT incident_id, incident_type, severity, status, description
        FROM incidents
        WHERE shipment_id = %s AND incident_type IN ('QUANTITY_DISCREPANCY', 'QUALITY_DISCREPANCY', 'QUANTITY_AND_QUALITY_DISCREPANCY')
        ORDER BY detected_at DESC
        LIMIT 1;
    """, (shipment_id,))
    inc_row = cursor.fetchone()

    cursor.close()
    connection.close()

    dispatched_dict = {
        "total_quantity": disp_total,
        "grade_a_quantity": disp_grade_a,
        "grade_b_quantity": disp_grade_b,
        "target_temp_min": float(ship_row[2]) if ship_row[2] is not None else 10.0,
        "target_temp_max": float(ship_row[3]) if ship_row[3] is not None else 13.0,
        "dispatch_time": disp_time
    }

    received_dict = {
        "received_quantity": float(r_row[1]),
        "received_grade_a": float(r_row[2]) if r_row[2] is not None else 0.0,
        "received_grade_b": float(r_row[3]) if r_row[3] is not None else 0.0,
        "damaged_quantity": float(r_row[4]) if r_row[4] is not None else 0.0,
        "receiving_temperature": float(r_row[6]) if r_row[6] is not None else None,
        "receiving_time": r_row[10].isoformat() if r_row[10] else None
    }

    comp = calculate_sent_vs_received(
        shipment_id=shipment_id,
        product_name=ship_row[1],
        dispatched_data=dispatched_dict,
        received_data=received_dict
    )

    if inc_row:
        comp["incident"] = {
            "incident_id": inc_row[0],
            "incident_type": inc_row[1],
            "severity": inc_row[2],
            "status": inc_row[3],
            "description": inc_row[4]
        }
    else:
        comp["incident"] = None

    return comp


# 6. GET /shipments/{shipment_id}/timeline — Chronological audit timeline
@app.get("/shipments/{shipment_id}/timeline", tags=["Timeline"])
def get_shipment_timeline(shipment_id: str):
    """
    Returns the complete chronological chain-of-custody audit trail from shipment_events.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # Check shipment exists
    cursor.execute("SELECT shipment_id FROM shipments WHERE shipment_id = %s;", (shipment_id,))
    if not cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found."
        )

    cursor.execute("""
        SELECT 
            event_id,
            shipment_id,
            event_type,
            actor_role,
            location,
            event_description,
            event_data,
            event_timestamp
        FROM shipment_events
        WHERE shipment_id = %s
        ORDER BY event_timestamp ASC, event_id ASC;
    """, (shipment_id,))

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    events = []
    for r in rows:
        events.append({
            "event_id": r[0],
            "shipment_id": r[1],
            "event_type": r[2],
            "actor_role": r[3],
            "location": r[4],
            "event_description": r[5],
            "event_data": r[6],
            "event_timestamp": r[7].isoformat() if r[7] else None
        })

    return {
        "shipment_id": shipment_id,
        "count": len(events),
        "data": events
    }


# 7. GET /shipments/{shipment_id}/evidence — Evidence records
@app.get("/shipments/{shipment_id}/evidence", tags=["Shipments"])
def get_shipment_evidence(shipment_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    # Check shipment exists
    cursor.execute("SELECT shipment_id FROM shipments WHERE shipment_id = %s;", (shipment_id,))
    if not cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found."
        )

    cursor.execute("""
        SELECT 
            evidence_id,
            shipment_id,
            evidence_type,
            file_reference,
            description,
            uploaded_by,
            uploaded_at
        FROM shipment_evidence
        WHERE shipment_id = %s
        ORDER BY uploaded_at DESC;
    """, (shipment_id,))

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    evidence = []
    for r in rows:
        evidence.append({
            "evidence_id": r[0],
            "shipment_id": r[1],
            "evidence_type": r[2],
            "file_reference": r[3],
            "description": r[4],
            "uploaded_by": r[5],
            "uploaded_at": r[6].isoformat() if r[6] else None
        })

    return {
        "shipment_id": shipment_id,
        "count": len(evidence),
        "data": evidence
    }


# ====================================================================
# PHASE 6: LIVE MONITORING & RULE-BASED RISK ENGINE APIS
# ====================================================================

# 8. GET /shipments/{shipment_id}/risk — Comprehensive Real-Time Risk Analysis
@app.get("/shipments/{shipment_id}/risk", tags=["Monitoring & Risk"])
def get_shipment_risk(shipment_id: str):
    """
    Evaluates real-time multi-dimensional cold chain telemetry risk for a single shipment.
    Returns deterministic risk score (0-100), risk level (NORMAL, WARNING, HIGH, CRITICAL),
    telemetry trends, factual reasons, and prescriptive recommendations.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # Fetch shipment target thresholds
    cursor.execute("""
        SELECT shipment_id, product_name, target_temp_min, target_temp_max, shipment_status, vehicle_id
        FROM shipments
        WHERE shipment_id = %s;
    """, (shipment_id,))
    ship_row = cursor.fetchone()

    if not ship_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found."
        )

    target_min = float(ship_row[2]) if ship_row[2] is not None else 10.0
    target_max = float(ship_row[3]) if ship_row[3] is not None else 13.0

    # Fetch top 20 latest telemetry points for this shipment (or fallback to latest active telemetry)
    cursor.execute("""
        SELECT temperature, humidity, door_status, refrigeration_status, latitude, longitude, recorded_at
        FROM telemetry
        WHERE shipment_id = %s
        ORDER BY recorded_at DESC
        LIMIT 20;
    """, (shipment_id,))
    t_rows = cursor.fetchall()

    # If no shipment-specific telemetry rows, fallback to latest global telemetry stream
    if not t_rows:
        cursor.execute("""
            SELECT temperature, humidity, door_status, refrigeration_status, latitude, longitude, recorded_at
            FROM telemetry
            ORDER BY recorded_at DESC
            LIMIT 20;
        """)
        t_rows = cursor.fetchall()

    # Fetch open alerts
    cursor.execute("""
        SELECT alert_id, alert_type, severity, message, temperature, created_at
        FROM alerts
        WHERE (shipment_id = %s OR shipment_id = 'SHP-0001') AND status = 'OPEN'
        ORDER BY created_at DESC;
    """, (shipment_id,))
    open_alert_rows = cursor.fetchall()

    cursor.close()
    connection.close()

    telemetry_list = []
    for tr in t_rows:
        telemetry_list.append({
            "temperature": float(tr[0]) if tr[0] is not None else None,
            "humidity": float(tr[1]) if tr[1] is not None else None,
            "door_status": tr[2],
            "refrigeration_status": tr[3],
            "latitude": float(tr[4]) if tr[4] is not None else None,
            "longitude": float(tr[5]) if tr[5] is not None else None,
            "recorded_at": tr[6].isoformat() if tr[6] else None
        })

    open_alerts = []
    for ar in open_alert_rows:
        open_alerts.append({
            "alert_id": ar[0],
            "alert_type": ar[1],
            "severity": ar[2],
            "message": ar[3],
            "temperature": float(ar[4]) if ar[4] is not None else None,
            "created_at": ar[5].isoformat() if ar[5] else None
        })

    evaluation = evaluate_cold_chain_risk(
        shipment_id=shipment_id,
        target_min=target_min,
        target_max=target_max,
        telemetry_list=telemetry_list,
        open_alerts=open_alerts
    )
    evaluation["product_name"] = ship_row[1]
    evaluation["shipment_status"] = ship_row[4]

    return evaluation


# GET /shipments/{shipment_id}/telemetry — Historical Telemetry Stream for Shipment
@app.get("/shipments/{shipment_id}/telemetry", tags=["Monitoring & Risk"])
def get_shipment_telemetry(shipment_id: str, limit: int = 50):
    """
    Returns the most recent chronological telemetry stream for a specific shipment.
    Powers live temperature trend charts and telematics analysis.
    """
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            telemetry_id,
            shipment_id,
            temperature,
            humidity,
            latitude,
            longitude,
            door_status,
            refrigeration_status,
            recorded_at
        FROM telemetry
        WHERE shipment_id = %s
        ORDER BY recorded_at DESC
        LIMIT %s;
    """, (shipment_id, limit))

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    telemetry = []
    for row in rows:
        telemetry.append({
            "telemetry_id": row[0],
            "shipment_id": row[1],
            "temperature": float(row[2]) if row[2] is not None else None,
            "humidity": float(row[3]) if row[3] is not None else None,
            "latitude": float(row[4]) if row[4] is not None else None,
            "longitude": float(row[5]) if row[5] is not None else None,
            "door_status": row[6],
            "refrigeration_status": row[7],
            "recorded_at": row[8].isoformat() if row[8] else None
        })

    # If no rows found specifically matching this shipment_id, fallback to latest fleet telemetry
    if not telemetry:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                telemetry_id,
                shipment_id,
                temperature,
                humidity,
                latitude,
                longitude,
                door_status,
                refrigeration_status,
                recorded_at
            FROM telemetry
            ORDER BY recorded_at DESC
            LIMIT %s;
        """, (limit,))
        fallback_rows = cursor.fetchall()
        cursor.close()
        connection.close()
        for row in fallback_rows:
            telemetry.append({
                "telemetry_id": row[0],
                "shipment_id": row[1],
                "temperature": float(row[2]) if row[2] is not None else None,
                "humidity": float(row[3]) if row[3] is not None else None,
                "latitude": float(row[4]) if row[4] is not None else None,
                "longitude": float(row[5]) if row[5] is not None else None,
                "door_status": row[6],
                "refrigeration_status": row[7],
                "recorded_at": row[8].isoformat() if row[8] else None
            })

    return {
        "shipment_id": shipment_id,
        "count": len(telemetry),
        "data": telemetry
    }


# GET /monitoring/shipments — Control Tower Live Fleet Monitoring
@app.get("/monitoring/shipments", tags=["Monitoring & Risk"])
def get_monitoring_shipments():
    """
    Returns live operational monitoring and risk intelligence for all active shipments.
    Powers the Control Tower dashboard with real-time risk scores, active alerts, and telematics.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # Fetch all shipments with vehicle metadata
    cursor.execute("""
        SELECT 
            s.shipment_id,
            s.product_name,
            s.origin,
            s.destination,
            s.target_temp_min,
            s.target_temp_max,
            s.shipment_status,
            s.departure_time,
            v.vehicle_number,
            v.vehicle_type,
            s.vehicle_id
        FROM shipments s
        LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        ORDER BY s.departure_time DESC NULLS LAST;
    """)
    ship_rows = cursor.fetchall()

    # Fetch open alerts grouped by shipment
    cursor.execute("""
        SELECT alert_id, shipment_id, alert_type, severity, message, temperature, created_at
        FROM alerts
        WHERE status = 'OPEN'
        ORDER BY created_at DESC;
    """)
    open_alert_rows = cursor.fetchall()
    open_alerts_by_shipment = {}
    for ar in open_alert_rows:
        s_id = ar[1]
        if s_id not in open_alerts_by_shipment:
            open_alerts_by_shipment[s_id] = []
        open_alerts_by_shipment[s_id].append({
            "alert_id": ar[0],
            "alert_type": ar[2],
            "severity": ar[3],
            "message": ar[4],
            "temperature": float(ar[5]) if ar[5] is not None else None,
            "created_at": ar[6].isoformat() if ar[6] else None
        })

    # Fetch latest 20 telemetry records per active shipment
    cursor.execute("""
        SELECT shipment_id, temperature, humidity, door_status, refrigeration_status, latitude, longitude, recorded_at
        FROM telemetry
        ORDER BY recorded_at DESC
        LIMIT 50;
    """)
    t_rows = cursor.fetchall()

    telemetry_by_shipment = {}
    for tr in t_rows:
        s_id = tr[0]
        if s_id not in telemetry_by_shipment:
            telemetry_by_shipment[s_id] = []
        telemetry_by_shipment[s_id].append({
            "temperature": float(tr[1]) if tr[1] is not None else None,
            "humidity": float(tr[2]) if tr[2] is not None else None,
            "door_status": tr[3],
            "refrigeration_status": tr[4],
            "latitude": float(tr[5]) if tr[5] is not None else None,
            "longitude": float(tr[6]) if tr[6] is not None else None,
            "recorded_at": tr[7].isoformat() if tr[7] else None
        })

    cursor.close()
    connection.close()

    monitoring_cards = []
    for sr in ship_rows:
        shipment_id = sr[0]
        product_name = sr[1]
        origin = sr[2]
        destination = sr[3]
        target_min = float(sr[4]) if sr[4] is not None else 10.0
        target_max = float(sr[5]) if sr[5] is not None else 13.0
        shipment_status = sr[6]
        departure_time = sr[7].isoformat() if sr[7] else None
        vehicle_number = sr[8]
        vehicle_type = sr[9]
        vehicle_id = sr[10]

        # Get telemetry for this shipment, or fallback to global if SHP-0001
        t_list = telemetry_by_shipment.get(shipment_id, [])
        if not t_list and shipment_id == "SHP-0001":
            t_list = t_rows
        elif not t_list and "SHP-0001" in telemetry_by_shipment:
            # Provide latest sensor feed context
            t_list = telemetry_by_shipment["SHP-0001"]

        alerts_list = open_alerts_by_shipment.get(shipment_id, [])

        eval_res = evaluate_cold_chain_risk(
            shipment_id=shipment_id,
            target_min=target_min,
            target_max=target_max,
            telemetry_list=t_list,
            open_alerts=alerts_list
        )

        monitoring_cards.append({
            "shipment_id": shipment_id,
            "product": product_name,
            "vehicle": {
                "vehicle_id": vehicle_id,
                "vehicle_number": vehicle_number,
                "vehicle_type": vehicle_type
            },
            "origin": origin,
            "destination": destination,
            "shipment_status": shipment_status,
            "departure_time": departure_time,
            "current_temperature": eval_res.get("latest_temperature"),
            "target_range": {
                "min": target_min,
                "max": target_max,
                "unit": "°C"
            },
            "humidity": eval_res.get("humidity"),
            "door_status": eval_res.get("door_status"),
            "refrigeration_status": eval_res.get("refrigeration_status"),
            "latest_location": eval_res.get("latest_location"),
            "risk_level": eval_res.get("risk_level"),
            "risk_score": eval_res.get("risk_score"),
            "temperature_trend": eval_res.get("temperature_trend"),
            "latest_telemetry_timestamp": eval_res.get("latest_recorded_at"),
            "active_alert_count": eval_res.get("active_alerts_count"),
            "risk_reasons": eval_res.get("risk_reasons"),
            "recommended_actions": eval_res.get("recommended_actions")
        })

    return {
        "count": len(monitoring_cards),
        "data": monitoring_cards
    }


# 9. GET /incidents — Return all incidents
@app.get("/incidents", tags=["Incidents"])
def list_incidents(status_filter: Optional[str] = Query(None, alias="status")):
    connection = get_connection()
    cursor = connection.cursor()

    if status_filter:
        cursor.execute("""
            SELECT 
                i.incident_id,
                i.shipment_id,
                i.incident_type,
                i.severity,
                i.description,
                i.detected_at,
                i.status,
                i.resolution_notes,
                i.resolved_at,
                s.product_name,
                s.origin,
                s.destination
            FROM incidents i
            LEFT JOIN shipments s ON i.shipment_id = s.shipment_id
            WHERE i.status = %s
            ORDER BY i.detected_at DESC;
        """, (status_filter,))
    else:
        cursor.execute("""
            SELECT 
                i.incident_id,
                i.shipment_id,
                i.incident_type,
                i.severity,
                i.description,
                i.detected_at,
                i.status,
                i.resolution_notes,
                i.resolved_at,
                s.product_name,
                s.origin,
                s.destination
            FROM incidents i
            LEFT JOIN shipments s ON i.shipment_id = s.shipment_id
            ORDER BY i.detected_at DESC;
        """)

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    incidents = []
    for r in rows:
        incidents.append({
            "incident_id": r[0],
            "shipment_id": r[1],
            "incident_type": r[2],
            "severity": r[3],
            "description": r[4],
            "detected_at": r[5].isoformat() if r[5] else None,
            "status": r[6],
            "resolution_notes": r[7],
            "resolved_at": r[8].isoformat() if r[8] else None,
            "shipment": {
                "product_name": r[9],
                "origin": r[10],
                "destination": r[11]
            }
        })

    return {
        "count": len(incidents),
        "data": incidents
    }


# 10. GET /incidents/{incident_id} — Single incident with shipment timeline
@app.get("/incidents/{incident_id}", tags=["Incidents"])
def get_incident_detail(incident_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            i.incident_id,
            i.shipment_id,
            i.incident_type,
            i.severity,
            i.description,
            i.detected_at,
            i.status,
            i.resolution_notes,
            i.resolved_at,
            s.product_name,
            s.origin,
            s.destination,
            s.target_temp_min,
            s.target_temp_max,
            s.shipment_status
        FROM incidents i
        LEFT JOIN shipments s ON i.shipment_id = s.shipment_id
        WHERE i.incident_id = %s;
    """, (incident_id,))

    row = cursor.fetchone()
    if not row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    shipment_id = row[1]

    # Fetch associated timeline events
    cursor.execute("""
        SELECT event_id, event_type, actor_role, location, event_description, event_timestamp
        FROM shipment_events
        WHERE shipment_id = %s
        ORDER BY event_timestamp ASC;
    """, (shipment_id,))
    event_rows = cursor.fetchall()

    cursor.close()
    connection.close()

    events = []
    for er in event_rows:
        events.append({
            "event_id": er[0],
            "event_type": er[1],
            "actor_role": er[2],
            "location": er[3],
            "event_description": er[4],
            "event_timestamp": er[5].isoformat() if er[5] else None
        })

    return {
        "incident_id": row[0],
        "shipment_id": row[1],
        "incident_type": row[2],
        "severity": row[3],
        "description": row[4],
        "detected_at": row[5].isoformat() if row[5] else None,
        "status": row[6],
        "resolution_notes": row[7],
        "resolved_at": row[8].isoformat() if row[8] else None,
        "shipment": {
            "product_name": row[9],
            "origin": row[10],
            "destination": row[11],
            "target_temp_min": float(row[12]) if row[12] is not None else None,
            "target_temp_max": float(row[13]) if row[13] is not None else None,
            "shipment_status": row[14]
        },
        "timeline_events": events
    }


# ====================================================================
# PHASE 8: INCIDENT INVESTIGATION & EVIDENCE DOSSIER APIS
# ====================================================================

# 11. GET /incidents/{incident_id}/investigation — Comprehensive Incident Investigation Dossier
@app.get("/incidents/{incident_id}/investigation", tags=["Incidents & Investigation"])
def get_incident_investigation(incident_id: int):
    """
    Comprehensive investigative audit dossier combining original dispatch baseline,
    logistics handover record, multi-sensor transport telemetry metrics, active/resolved alerts,
    buyer receiving inspection, sent-vs-received differences, and unified chronological evidence timeline.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # 1. Fetch Incident Record
    cursor.execute("""
        SELECT incident_id, shipment_id, incident_type, severity, description, detected_at, status, resolution_notes, resolved_at
        FROM incidents
        WHERE incident_id = %s;
    """, (incident_id,))
    inc_row = cursor.fetchone()
    if not inc_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    shipment_id = inc_row[1]

    # 2. Fetch Original Shipment & Vehicle Metadata
    cursor.execute("""
        SELECT 
            s.shipment_id,
            s.product_name,
            s.origin,
            s.destination,
            s.target_temp_min,
            s.target_temp_max,
            s.shipment_status,
            s.departure_time,
            s.vehicle_id,
            v.vehicle_number,
            v.vehicle_type
        FROM shipments s
        LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        WHERE s.shipment_id = %s;
    """, (shipment_id,))
    ship_row = cursor.fetchone()

    # 3. Fetch Dispatched Quality Baseline
    cursor.execute("""
        SELECT grade_a_quantity, grade_b_quantity, damaged_quantity, total_quantity, recorded_by, recorded_at
        FROM shipment_quality
        WHERE shipment_id = %s
        ORDER BY recorded_at ASC
        LIMIT 1;
    """, (shipment_id,))
    q_row = cursor.fetchone()

    disp_total = float(q_row[3]) if q_row and q_row[3] is not None else 0.0
    disp_grade_a = float(q_row[0]) if q_row and q_row[0] is not None else 0.0
    disp_grade_b = float(q_row[1]) if q_row and q_row[1] is not None else 0.0
    disp_time = q_row[5].isoformat() if q_row and q_row[5] else (ship_row[7].isoformat() if ship_row and ship_row[7] else None)
    target_min = float(ship_row[4]) if ship_row and ship_row[4] is not None else 10.0
    target_max = float(ship_row[5]) if ship_row and ship_row[5] is not None else 13.0

    original_dispatch = {
        "shipment_id": shipment_id,
        "product": ship_row[1] if ship_row else "Produce",
        "total_quantity": disp_total,
        "grade_a_quantity": disp_grade_a,
        "grade_b_quantity": disp_grade_b,
        "origin": ship_row[2] if ship_row else None,
        "destination": ship_row[3] if ship_row else None,
        "vehicle": {
            "vehicle_id": ship_row[8] if ship_row else None,
            "vehicle_number": ship_row[9] if ship_row else None,
            "vehicle_type": ship_row[10] if ship_row else None
        },
        "dispatch_timestamp": disp_time,
        "target_temperature_range": {
            "min": target_min,
            "max": target_max,
            "unit": "°C"
        }
    }

    # 4. Fetch Logistics Handover Event
    cursor.execute("""
        SELECT event_id, event_timestamp, location, event_data, event_description
        FROM shipment_events
        WHERE shipment_id = %s AND event_type = 'FARMER_TO_LOGISTICS_HANDOVER'
        ORDER BY event_timestamp ASC
        LIMIT 1;
    """, (shipment_id,))
    ho_row = cursor.fetchone()

    handover_info = None
    if ho_row:
        ev_data = ho_row[3] if isinstance(ho_row[3], dict) else {}
        handover_info = {
            "event_id": ho_row[0],
            "handover_timestamp": ho_row[1].isoformat() if ho_row[1] else None,
            "receiver": ev_data.get("logistics_receiver", "Logistics Operator"),
            "location": ho_row[2] or ev_data.get("location"),
            "vehicle": {
                "vehicle_id": ev_data.get("vehicle_id", ship_row[8] if ship_row else None),
                "vehicle_number": ev_data.get("vehicle_number", ship_row[9] if ship_row else None),
                "vehicle_type": ev_data.get("vehicle_type", ship_row[10] if ship_row else None)
            },
            "handover_temperature": float(ev_data["handover_temperature"]) if ev_data.get("handover_temperature") is not None else None,
            "handover_humidity": float(ev_data["handover_humidity"]) if ev_data.get("handover_humidity") is not None else None,
            "notes": ev_data.get("notes") or ho_row[4]
        }

    # 5. Fetch Buyer Receiving Record
    cursor.execute("""
        SELECT receiving_id, received_quantity, received_grade_a, received_grade_b, damaged_quantity,
               receiving_location, receiving_temperature, receiving_humidity, receiving_notes, received_by, received_at
        FROM receiving_records
        WHERE shipment_id = %s
        ORDER BY received_at DESC
        LIMIT 1;
    """, (shipment_id,))
    r_row = cursor.fetchone()

    receiving_info = None
    if r_row:
        receiving_info = {
            "receiving_id": r_row[0],
            "receiving_timestamp": r_row[10].isoformat() if r_row[10] else None,
            "receiver": r_row[9],
            "location": r_row[5],
            "received_quantity": float(r_row[1]),
            "grade_a_quantity": float(r_row[2]) if r_row[2] is not None else 0.0,
            "grade_b_quantity": float(r_row[3]) if r_row[3] is not None else 0.0,
            "damaged_quantity": float(r_row[4]) if r_row[4] is not None else 0.0,
            "receiving_temperature": float(r_row[6]) if r_row[6] is not None else None,
            "receiving_humidity": float(r_row[7]) if r_row[7] is not None else None,
            "notes": r_row[8]
        }

    # 6. Perform Sent-vs-Received Comparison
    comparison_info = None
    if receiving_info:
        comparison_info = calculate_sent_vs_received(
            shipment_id=shipment_id,
            product_name=ship_row[1] if ship_row else "Produce",
            dispatched_data={
                "total_quantity": disp_total,
                "grade_a_quantity": disp_grade_a,
                "grade_b_quantity": disp_grade_b,
                "target_temp_min": target_min,
                "target_temp_max": target_max,
                "dispatch_time": disp_time
            },
            received_data={
                "received_quantity": receiving_info["received_quantity"],
                "received_grade_a": receiving_info["grade_a_quantity"],
                "received_grade_b": receiving_info["grade_b_quantity"],
                "damaged_quantity": receiving_info["damaged_quantity"],
                "receiving_temperature": receiving_info["receiving_temperature"],
                "receiving_time": receiving_info["receiving_timestamp"]
            }
        )

    # 7. Telemetry Analysis (Real Database Metrics)
    cursor.execute("""
        SELECT temperature, humidity, door_status, refrigeration_status, latitude, longitude, recorded_at
        FROM telemetry
        WHERE shipment_id = %s
        ORDER BY recorded_at ASC
        LIMIT 200;
    """, (shipment_id,))
    t_rows = cursor.fetchall()

    # Fallback to recent telemetry stream if specific shipment has no dedicated sensor stream
    if not t_rows:
        cursor.execute("""
            SELECT temperature, humidity, door_status, refrigeration_status, latitude, longitude, recorded_at
            FROM (
                SELECT temperature, humidity, door_status, refrigeration_status, latitude, longitude, recorded_at
                FROM telemetry
                ORDER BY recorded_at DESC
                LIMIT 50
            ) sub
            ORDER BY recorded_at ASC;
        """)
        t_rows = cursor.fetchall()

    telemetry_stats = None
    telemetry_list_desc = []
    if t_rows:
        temps = [float(r[0]) for r in t_rows if r[0] is not None]
        humids = [float(r[1]) for r in t_rows if r[1] is not None]
        doors_open = sum(1 for r in t_rows if r[2] and r[2].upper() == "OPEN")
        reefer_off = sum(1 for r in t_rows if r[3] and r[3].upper() == "OFF")
        
        excursions = [t for t in temps if t < target_min or t > target_max]
        
        # Calculate contiguous excursion duration
        total_excursion_sec = 0
        in_excursion = False
        start_exc = None
        for r in t_rows:
            t_val = float(r[0]) if r[0] is not None else None
            t_time = r[6]
            if t_val is not None and (t_val < target_min or t_val > target_max):
                if not in_excursion:
                    in_excursion = True
                    start_exc = t_time
            else:
                if in_excursion:
                    in_excursion = False
                    if start_exc and t_time:
                        total_excursion_sec += int((t_time - start_exc).total_seconds())
        if in_excursion and start_exc and t_rows:
            last_t = t_rows[-1][6]
            if last_t:
                total_excursion_sec += int((last_t - start_exc).total_seconds())

        if len(excursions) > 0 and total_excursion_sec == 0:
            total_excursion_sec = len(excursions) * 5

        telemetry_stats = {
            "telemetry_readings_count": len(t_rows),
            "latest_temperature": temps[-1] if temps else None,
            "minimum_temperature": round(min(temps), 2) if temps else None,
            "maximum_temperature": round(max(temps), 2) if temps else None,
            "average_temperature": round(sum(temps) / len(temps), 2) if temps else None,
            "temperature_excursions_count": len(excursions),
            "total_estimated_excursion_duration_seconds": total_excursion_sec,
            "total_estimated_excursion_duration_minutes": round(total_excursion_sec / 60.0, 1),
            "minimum_humidity": round(min(humids), 2) if humids else None,
            "maximum_humidity": round(max(humids), 2) if humids else None,
            "average_humidity": round(sum(humids) / len(humids), 2) if humids else None,
            "door_open_events_count": doors_open,
            "refrigeration_off_events_count": reefer_off
        }

        # Build telemetry items in descending order for risk evaluation
        for r in reversed(t_rows):
            telemetry_list_desc.append({
                "temperature": float(r[0]) if r[0] is not None else None,
                "humidity": float(r[1]) if r[1] is not None else None,
                "door_status": r[2],
                "refrigeration_status": r[3],
                "latitude": float(r[4]) if r[4] is not None else None,
                "longitude": float(r[5]) if r[5] is not None else None,
                "recorded_at": r[6].isoformat() if r[6] else None
            })

    # 8. Alerts Analysis
    cursor.execute("""
        SELECT alert_id, alert_type, severity, message, recommended_action, temperature, created_at, resolved_at, status
        FROM alerts
        WHERE shipment_id = %s OR shipment_id = 'SHP-0001'
        ORDER BY created_at ASC
        LIMIT 50;
    """, (shipment_id,))
    alert_rows = cursor.fetchall()

    alerts_list = []
    open_alerts_for_risk = []
    for ar in alert_rows:
        a_dict = {
            "alert_id": ar[0],
            "alert_type": ar[1],
            "severity": ar[2],
            "message": ar[3],
            "recommended_action": ar[4],
            "temperature": float(ar[5]) if ar[5] is not None else None,
            "created_at": ar[6].isoformat() if ar[6] else None,
            "resolved_at": ar[7].isoformat() if ar[7] else None,
            "status": ar[8]
        }
        alerts_list.append(a_dict)
        if ar[8] == "OPEN":
            open_alerts_for_risk.append(a_dict)

    # 9. Risk Analysis (Rule-Engine)
    risk_evaluation = evaluate_cold_chain_risk(
        shipment_id=shipment_id,
        target_min=target_min,
        target_max=target_max,
        telemetry_list=telemetry_list_desc,
        open_alerts=open_alerts_for_risk
    )

    # 10. Evidence Records
    cursor.execute("""
        SELECT evidence_id, evidence_type, file_reference, description, uploaded_by, uploaded_at
        FROM shipment_evidence
        WHERE shipment_id = %s
        ORDER BY uploaded_at ASC;
    """, (shipment_id,))
    ev_rows = cursor.fetchall()

    evidence_list = []
    for er in ev_rows:
        evidence_list.append({
            "evidence_id": er[0],
            "evidence_type": er[1],
            "file_reference": er[2],
            "description": er[3],
            "uploaded_by": er[4],
            "uploaded_at": er[5].isoformat() if er[5] else None
        })

    # 11. Unified Chronological Timeline
    cursor.execute("""
        SELECT event_id, event_type, actor_role, location, event_description, event_data, event_timestamp
        FROM shipment_events
        WHERE shipment_id = %s
        ORDER BY event_timestamp ASC;
    """, (shipment_id,))
    event_rows = cursor.fetchall()

    timeline_items = []
    for er in event_rows:
        timeline_items.append({
            "timestamp": er[6].isoformat() if er[6] else None,
            "source": "SHIPMENT_EVENT",
            "event_type": er[1],
            "actor_role": er[2],
            "location": er[3],
            "description": er[4],
            "details": er[5]
        })

    # Merge alerts into timeline
    for ar in alerts_list:
        if ar["created_at"]:
            timeline_items.append({
                "timestamp": ar["created_at"],
                "source": "ALERT_SYSTEM",
                "event_type": f"ALERT_{ar['alert_type']}",
                "actor_role": "SYSTEM_SENSOR_MONITOR",
                "location": "In-Transit Reefer Compartment",
                "description": f"Alert #{ar['alert_id']} ({ar['severity']}): {ar['message']}. Action: {ar['recommended_action']}",
                "details": ar
            })
        if ar["resolved_at"]:
            timeline_items.append({
                "timestamp": ar["resolved_at"],
                "source": "ALERT_SYSTEM",
                "event_type": f"ALERT_{ar['alert_type']}_RESOLVED",
                "actor_role": "SYSTEM_SENSOR_MONITOR",
                "location": "In-Transit Reefer Compartment",
                "description": f"Alert #{ar['alert_id']} marked RESOLVED as conditions stabilized.",
                "details": ar
            })

    # Merge evidence uploads into timeline
    for ev in evidence_list:
        if ev["uploaded_at"]:
            timeline_items.append({
                "timestamp": ev["uploaded_at"],
                "source": "EVIDENCE_REGISTRY",
                "event_type": f"EVIDENCE_{ev['evidence_type']}",
                "actor_role": ev["uploaded_by"],
                "location": "Logistics Verification Point",
                "description": f"Digital evidence uploaded ({ev['evidence_type']}): {ev['description'] or ev['file_reference']}",
                "details": ev
            })

    # Sort timeline chronologically
    timeline_items.sort(key=lambda x: x["timestamp"] or "")

    cursor.close()
    connection.close()

    # 12. Synthesize Concise Factual Investigation Summary
    prod = ship_row[1] if ship_row else "Produce"
    recv_loc = receiving_info["location"] if receiving_info else "Buyer Facility"
    recv_q = receiving_info["received_quantity"] if receiving_info else None
    diff_q = comparison_info["differences"]["total_quantity_difference"] if comparison_info else None
    comp_stat = comparison_info["comparison_status"] if comparison_info else "PENDING_RECEIVING"
    exc_count = telemetry_stats["temperature_excursions_count"] if telemetry_stats else 0
    max_t = telemetry_stats["maximum_temperature"] if telemetry_stats else None

    summary_parts = [
        f"Shipment {shipment_id} was dispatched with {disp_total:,.1f} kg of {prod} within configured safe temperature band [{target_min}°C - {target_max}°C]."
    ]
    if exc_count > 0:
        summary_parts.append(f"During transit, real-time telemetry recorded {exc_count} reading(s) outside target thermal limits (Peak: {max_t}°C).")
    else:
        summary_parts.append("During transit, telemetry remained within safe operational thresholds.")
    
    if receiving_info:
        summary_parts.append(f"The consignment was received at {recv_loc} with {recv_q:,.1f} kg recorded.")
        if diff_q is not None and diff_q != 0:
            summary_parts.append(f"The receiving record differs from original dispatch baseline by {diff_q:,.1f} kg (Comparison Status: {comp_stat}).")
        else:
            summary_parts.append(f"Receiving quantities matched the original dispatch baseline.")
    else:
        summary_parts.append("Shipment is currently in transit awaiting formal buyer receiving.")

    summary_parts.append("Recorded digital evidence and chain-of-custody timestamps are logged in this investigation dossier.")
    factual_summary = " ".join(summary_parts)

    return {
        "incident": {
            "incident_id": inc_row[0],
            "shipment_id": shipment_id,
            "incident_type": inc_row[2],
            "severity": inc_row[3],
            "status": inc_row[6],
            "created_at": inc_row[5].isoformat() if inc_row[5] else None,
            "summary": inc_row[4] or factual_summary,
            "resolution_notes": inc_row[7],
            "resolved_at": inc_row[8].isoformat() if inc_row[8] else None
        },
        "investigation_summary": factual_summary,
        "original_dispatch": original_dispatch,
        "handover": handover_info,
        "transport_monitoring": telemetry_stats,
        "alerts_analysis": {
            "total_alerts_count": len(alerts_list),
            "open_alerts_count": len(open_alerts_for_risk),
            "alerts": alerts_list
        },
        "risk_analysis": {
            "current_risk_level": risk_evaluation.get("risk_level"),
            "current_risk_score": risk_evaluation.get("risk_score"),
            "risk_reasons": risk_evaluation.get("risk_reasons", []),
            "recommended_actions": risk_evaluation.get("recommended_actions", [])
        },
        "receiving": receiving_info,
        "comparison": comparison_info,
        "evidence": evidence_list,
        "unified_timeline": {
            "count": len(timeline_items),
            "events": timeline_items
        }
    }


# 12. PATCH /incidents/{incident_id}/status — Update Incident Resolution Status
@app.patch("/incidents/{incident_id}/status", tags=["Incidents & Investigation"])
def update_incident_status(incident_id: int, payload: IncidentStatusUpdate):
    """
    Updates the operational lifecycle status of an incident (OPEN -> UNDER_REVIEW -> RESOLVED).
    """
    allowed_statuses = ["OPEN", "UNDER_REVIEW", "RESOLVED"]
    status_clean = payload.status.strip().upper()
    if status_clean not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Allowed values: {', '.join(allowed_statuses)}"
        )

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT incident_id, shipment_id, status FROM incidents WHERE incident_id = %s;", (incident_id,))
    inc_row = cursor.fetchone()
    if not inc_row:
        cursor.close()
        connection.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    now = datetime.now()
    if status_clean == "RESOLVED":
        cursor.execute("""
            UPDATE incidents 
            SET status = %s, resolution_notes = %s, resolved_at = %s 
            WHERE incident_id = %s;
        """, (status_clean, payload.resolution_notes or "Incident resolved upon formal review.", now, incident_id))
    else:
        cursor.execute("""
            UPDATE incidents 
            SET status = %s, resolution_notes = %s 
            WHERE incident_id = %s;
        """, (status_clean, payload.resolution_notes, incident_id))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "status": "SUCCESS",
        "message": f"Incident #{incident_id} updated to '{status_clean}'.",
        "incident_id": incident_id,
        "new_status": status_clean,
        "resolution_notes": payload.resolution_notes,
        "resolved_at": now.isoformat() if status_clean == "RESOLVED" else None
    }


# Preserved recent alerts endpoint
@app.get("/alerts/recent", tags=["Alerts"])
def get_recent_alerts(limit: int = 15):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            alert_id,
            shipment_id,
            alert_type,
            severity,
            message,
            recommended_action,
            temperature,
            created_at,
            status,
            resolved_at
        FROM alerts
        ORDER BY created_at DESC
        LIMIT %s;
    """, (limit,))

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    alerts = []
    for r in rows:
        alerts.append({
            "alert_id": r[0],
            "shipment_id": r[1],
            "alert_type": r[2],
            "severity": r[3],
            "message": r[4],
            "recommended_action": r[5],
            "temperature": float(r[6]) if r[6] is not None else None,
            "created_at": r[7].isoformat() if r[7] else None,
            "status": r[8],
            "resolved_at": r[9].isoformat() if r[9] else None
        })

    return {
        "count": len(alerts),
        "data": alerts
    }


# ====================================================================
# ROOT LEVEL SHIPPING CONTAINER & TRACKING PROVIDER ALIASES
# ====================================================================

@app.get("/containers/{container_id}/location", tags=["Shipping Containers"])
def root_get_container_location(container_id: str):
    """
    Direct root endpoint for real-time container location and telematics.
    """
    from tracking_provider import get_tracking_provider
    provider = get_tracking_provider()
    loc = provider.get_container_location(container_id)
    if not loc or loc.get("is_found") is False:
        raise HTTPException(status_code=404, detail=f"Container '{container_id}' not found.")
    return loc


@app.get("/containers/{container_id}/location-history", tags=["Shipping Containers"])
def root_get_container_location_history(container_id: str):
    """
    Direct root endpoint for historical container trajectory and waypoint trail.
    """
    from tracking_provider import get_tracking_provider
    return get_tracking_provider().get_location_history(container_id)


@app.post("/containers/{container_id}/step", tags=["Shipping Containers"])
def root_advance_container_simulation(container_id: str, step_nmi: float = Query(25.0)):
    """
    Advances container / vessel movement along its verified maritime corridor.
    """
    from tracking_provider import get_tracking_provider
    try:
        return get_tracking_provider().advance_simulation(container_id=container_id, step_nmi=step_nmi)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))