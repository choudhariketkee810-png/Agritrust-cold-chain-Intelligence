"""
AGRITrust — Advanced Marine Route & Multimodal Intelligence Router
Provides enterprise endpoints for:
- Marine Route Risk Predictor
- Container Black Box Chronological Event Trail
- Shelf-Life Consumption Engine & Spoilage Cost Predictor
- Sell Before Spoilage Engine & Dynamic Destination Recommender
- Port Dwell-Time Intelligence & Transshipment Risk
- Reefer Health Score & Predictive Compressor Degradation
- Sensor Data Trust Score & GPS Anomaly Detection
- Digital Container Seal Monitoring
- Marine Weather Risk Tracking
- Interactive AI What-If Simulator
- "Where Did The Loss Happen?" Root Cause & Neutral AI Investigation Summary
"""

import os
import uuid
from fastapi import APIRouter, HTTPException, Query, status, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor, Json

from marine_intelligence_engine import (
    calculate_marine_route_risk,
    calculate_shelf_life_intelligence,
    calculate_spoilage_cost,
    evaluate_sell_before_spoilage_allocations,
    calculate_reefer_health,
    evaluate_sensor_data_trust,
    investigate_multimodal_journey_loss,
    simulate_what_if_scenario
)

from tracking_provider import (
    get_tracking_provider,
    set_tracking_provider,
    SimulatedTrackingProvider,
    AISCarrierTrackingProvider
)

router = APIRouter(prefix="/marine", tags=["Marine & Multimodal Intelligence"])

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        database=os.environ.get("DB_NAME", "ftl_cold_chain"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "1234")
    )


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class ContainerEventCreate(BaseModel):
    event_type: str = Field(..., example="TEMP_EXCURSION")
    location_name: str = Field(..., example="Arabian Sea Central Corridor")
    latitude: Optional[float] = Field(None, example=15.1000)
    longitude: Optional[float] = Field(None, example=59.8000)
    temperature: Optional[float] = Field(None, example=8.7)
    humidity: Optional[float] = Field(None, example=65.0)
    door_status: Optional[str] = Field("CLOSED", example="CLOSED")
    reefer_status: Optional[str] = Field("ACTIVE_COOLING", example="ACTIVE_COOLING")
    actor_role: Optional[str] = Field("Ocean Carrier Engineer", example="Ocean Carrier Engineer")
    evidence_ref: Optional[str] = Field(None, example="LOG-RECON-8802")
    notes: Optional[str] = Field(None, example="Auxiliary compressor switched on.")
    severity: Optional[str] = Field("INFO", example="WARNING")


class WhatIfSimulateRequest(BaseModel):
    container_id: Optional[str] = Field(None, example="MEDU7719203")
    shipment_id: Optional[str] = Field(None, example="AGRI-SHP-9905")
    simulation_type: str = Field(..., example="ALTERNATIVE_PORT") # ALTERNATIVE_PORT, ALTERNATIVE_BUYER, REEFER_RESET
    simulation_params: Optional[Dict[str, Any]] = Field(default_factory=dict)


# ==============================================================================
# 1. MARINE CONTROL CENTER & KPI SUMMARY
# ==============================================================================

@router.get("/dashboard/kpis")
def get_marine_dashboard_kpis():
    """
    Returns aggregated real-time KPIs for the Marine Control Center dashboard.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT * FROM shipping_containers ORDER BY container_id ASC;")
    containers = cur.fetchall()

    cur.execute("SELECT * FROM multimodal_shipments ORDER BY shipment_id ASC;")
    shipments = cur.fetchall()

    cur.execute("SELECT COUNT(*) as count FROM container_black_box_events WHERE severity IN ('WARNING', 'CRITICAL');")
    alert_events_count = cur.fetchone()["count"]

    cur.close()
    conn.close()

    total_containers = len(containers)
    at_sea_count = sum(1 for c in containers if c["current_status"] == "AT_SEA")
    at_port_count = sum(1 for c in containers if "PORT" in c["current_status"])
    delayed_count = sum(1 for c in containers if float(c.get("actual_dwell_hours") or 0) > float(c.get("expected_dwell_hours") or 8))
    high_risk_count = sum(1 for s in shipments if s.get("overall_risk_score", 0) >= 60)
    shelf_life_risk_count = sum(1 for s in shipments if "RISK" in str(s.get("spoilage_status", "")))
    
    # Calculate estimated potential loss exposure across all active shipments
    total_potential_loss = 0.0
    for s in shipments:
        qty = float(s.get("current_quantity_kg") or 1000.0)
        price = float(s.get("unit_price_per_kg_inr") or 60.0)
        score = int(s.get("overall_risk_score") or 20)
        if score > 60:
            total_potential_loss += (qty * price * 0.35)
        elif score > 30:
            total_potential_loss += (qty * price * 0.10)

    return {
        "active_marine_shipments": len(shipments),
        "total_containers": total_containers,
        "containers_at_sea": at_sea_count,
        "containers_at_port": at_port_count,
        "delayed_containers": delayed_count,
        "high_risk_containers": high_risk_count,
        "reefer_alerts_count": alert_events_count,
        "shelf_life_risk_count": shelf_life_risk_count,
        "total_potential_loss_inr": round(total_potential_loss, 2),
        "data_notice": "DEMO / SIMULATED DATA",
        "last_updated": datetime.now().isoformat()
    }


# ==============================================================================
# 2. NAUTICAL CORRIDOR WAYPOINTS
# ==============================================================================

@router.get("/waypoints")
def get_nautical_waypoints(route_code: Optional[str] = None):
    """
    Returns verified nautical corridor waypoints for maritime map rendering.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if route_code:
        cur.execute("""
            SELECT waypoint_id, route_code, sequence_order, waypoint_name,
                   latitude, longitude, segment_type, sea_region, distance_from_origin_nmi
            FROM marine_route_waypoints
            WHERE route_code = %s
            ORDER BY sequence_order ASC;
        """, (route_code,))
    else:
        cur.execute("""
            SELECT waypoint_id, route_code, sequence_order, waypoint_name,
                   latitude, longitude, segment_type, sea_region, distance_from_origin_nmi
            FROM marine_route_waypoints
            ORDER BY route_code ASC, sequence_order ASC;
        """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    # Convert numeric fields to float
    waypoints = []
    for r in rows:
        waypoints.append({
            **r,
            "latitude": float(r["latitude"]),
            "longitude": float(r["longitude"]),
            "distance_from_origin_nmi": float(r["distance_from_origin_nmi"])
        })

    return {
        "count": len(waypoints),
        "data": waypoints
    }


# ==============================================================================
# 3. MULTIMODAL SHIPMENTS LIST & DETAIL
# ==============================================================================

@router.get("/shipments")
def list_marine_shipments():
    """
    Returns all multimodal agricultural shipments with linked container telematics and risk scores.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT ms.*, sc.current_vessel_name, sc.current_temperature, sc.set_temperature,
               sc.current_humidity, sc.reefer_power_status, sc.compressor_status,
               sc.door_status, sc.current_latitude, sc.current_longitude, sc.speed_knots,
               sc.heading_degrees, sc.current_sea_region, sc.current_status as container_status,
               sc.reefer_health_score, sc.reefer_health_status, sc.sensor_trust_score,
               sc.expected_dwell_hours, sc.actual_dwell_hours, sc.transshipment_count
        FROM multimodal_shipments ms
        LEFT JOIN shipping_containers sc ON ms.container_id = sc.container_id
        ORDER BY ms.created_at DESC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    shipments = []
    for r in rows:
        shipments.append({
            **r,
            "initial_shelf_life_hours": float(r["initial_shelf_life_hours"]),
            "shelf_life_remaining_hours": float(r["shelf_life_remaining_hours"]),
            "initial_quantity_kg": float(r["initial_quantity_kg"]),
            "current_quantity_kg": float(r["current_quantity_kg"]),
            "quantity_loss_kg": float(r["quantity_loss_kg"]) if r.get("quantity_loss_kg") is not None else 0.0,
            "unit_price_per_kg_inr": float(r.get("unit_price_per_kg_inr") or 60.0),
            "temperature_setpoint": float(r["temperature_setpoint"]),
            "temperature_min_limit": float(r["temperature_min_limit"]),
            "temperature_max_limit": float(r["temperature_max_limit"]),
            "target_humidity": float(r["target_humidity"]),
            "eta_destination_hours": float(r["eta_destination_hours"]),
            "current_temperature": float(r["current_temperature"]) if r.get("current_temperature") is not None else None,
            "current_latitude": float(r["current_latitude"]) if r.get("current_latitude") is not None else None,
            "current_longitude": float(r["current_longitude"]) if r.get("current_longitude") is not None else None,
            "departure_time": r["departure_time"].isoformat() if r.get("departure_time") else None,
            "expected_delivery_time": r["expected_delivery_time"].isoformat() if r.get("expected_delivery_time") else None,
            "actual_delivery_time": r["actual_delivery_time"].isoformat() if r.get("actual_delivery_time") else None,
            "harvest_date": str(r["harvest_date"]) if r.get("harvest_date") else None,
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None
        })

    return {
        "count": len(shipments),
        "data": shipments
    }


# ==============================================================================
# 4. SHIPPING CONTAINERS LIST & TELEMATICS
# ==============================================================================

@router.get("/containers")
def list_shipping_containers():
    """
    Returns all monitored smart reefer shipping containers.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT sc.*, ms.shipment_id, ms.produce_name, ms.initial_quantity_kg,
               ms.current_quantity_kg, ms.initial_shelf_life_hours,
               ms.shelf_life_remaining_hours, ms.eta_destination_hours,
               ms.overall_risk_score, ms.risk_category, ms.spoilage_status
        FROM shipping_containers sc
        LEFT JOIN multimodal_shipments ms ON sc.container_id = ms.container_id
        ORDER BY sc.container_id ASC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    containers = []
    for r in rows:
        containers.append({
            **r,
            "set_temperature": float(r["set_temperature"]),
            "current_temperature": float(r["current_temperature"]),
            "target_temp_min": float(r["target_temp_min"]),
            "target_temp_max": float(r["target_temp_max"]),
            "current_humidity": float(r["current_humidity"]),
            "target_humidity": float(r["target_humidity"]),
            "current_latitude": float(r["current_latitude"]),
            "current_longitude": float(r["current_longitude"]),
            "speed_knots": float(r["speed_knots"]),
            "heading_degrees": float(r["heading_degrees"]),
            "total_distance_nmi": float(r["total_distance_nmi"]),
            "distance_travelled_nmi": float(r["distance_travelled_nmi"]),
            "distance_remaining_nmi": float(r["distance_remaining_nmi"]),
            "route_progress_pct": float(r["route_progress_pct"]),
            "expected_dwell_hours": float(r.get("expected_dwell_hours") or 8.0),
            "actual_dwell_hours": float(r.get("actual_dwell_hours") or 8.0),
            "departure_time": r["departure_time"].isoformat() if r.get("departure_time") else None,
            "estimated_arrival_time": r["estimated_arrival_time"].isoformat() if r.get("estimated_arrival_time") else None,
            "last_telemetry_at": r["last_telemetry_at"].isoformat() if r.get("last_telemetry_at") else None
        })

    return {
        "count": len(containers),
        "data": containers
    }


@router.get("/containers/{container_id}/location")
def get_container_location(container_id: str):
    """
    Returns real-time container location, vessel telemetry, and simulated data notice.
    Adheres to TrackingProvider abstraction (Simulated vs Live AIS).
    """
    provider = get_tracking_provider()
    loc = provider.get_container_location(container_id)
    if not loc or loc.get("is_found") is False:
        raise HTTPException(status_code=404, detail=f"Container '{container_id}' not found.")
    return loc


@router.get("/containers/{container_id}/location-history")
def get_container_location_history(container_id: str):
    """
    Returns historical telemetry trajectory and waypoint trail for the container.
    """
    provider = get_tracking_provider()
    return provider.get_location_history(container_id)


@router.post("/containers/{container_id}/step")
def advance_container_simulation(container_id: str, step_nmi: float = Query(25.0, description="Nautical miles to advance along route")):
    """
    Advances container / vessel movement along its verified maritime waypoint corridor,
    smoothly updating coordinates, heading, ETA, and logging location history in PostgreSQL.
    """
    provider = get_tracking_provider()
    try:
        return provider.advance_simulation(container_id=container_id, step_nmi=step_nmi)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tracking-provider/metadata")
def get_tracking_provider_info():
    """
    Returns current tracking provider metadata, data source mode, and live carrier API readiness.
    """
    provider = get_tracking_provider()
    return provider.get_provider_metadata()


@router.post("/tracking-provider/mode")
def set_tracking_provider_mode(mode: str = Query(..., example="SIMULATED")): # SIMULATED or AIS_LIVE
    """
    Dynamically toggles tracking provider mode between SIMULATED and AIS_LIVE.
    """
    if mode.upper() == "AIS_LIVE":
        set_tracking_provider(AISCarrierTrackingProvider())
    else:
        set_tracking_provider(SimulatedTrackingProvider())
    return {
        "status": "SUCCESS",
        "active_mode": mode.upper(),
        "provider": get_tracking_provider().get_provider_metadata()
    }


@router.get("/containers/{container_id}")
def get_container_detail(container_id: str):
    """
    Returns full comprehensive container intelligence dossier.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT * FROM shipping_containers WHERE container_id = %s;", (container_id,))
    c = cur.fetchone()
    if not c:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail=f"Container '{container_id}' not found.")

    cur.execute("SELECT * FROM multimodal_shipments WHERE container_id = %s;", (container_id,))
    s = cur.fetchone()

    cur.execute("SELECT * FROM container_location_history WHERE container_id = %s ORDER BY recorded_at ASC;", (container_id,))
    hist_rows = cur.fetchall()

    cur.execute("SELECT * FROM container_black_box_events WHERE container_id = %s ORDER BY event_timestamp ASC;", (container_id,))
    bb_rows = cur.fetchall()

    cur.execute("SELECT * FROM digital_seals WHERE container_id = %s;", (container_id,))
    seal = cur.fetchone()

    cur.execute("SELECT * FROM marine_weather_events WHERE container_id = %s ORDER BY recorded_at DESC;", (container_id,))
    weather_events = cur.fetchall()

    cur.execute("SELECT * FROM port_handover_events WHERE container_id = %s ORDER BY event_timestamp ASC;", (container_id,))
    port_events = cur.fetchall()

    cur.execute("SELECT * FROM marine_alternative_buyers ORDER BY match_compatibility_score DESC; ")
    alt_buyers = cur.fetchall()

    cur.close()
    conn.close()

    # Cast floats
    container_dict = {
        **c,
        "set_temperature": float(c["set_temperature"]),
        "current_temperature": float(c["current_temperature"]),
        "target_temp_min": float(c["target_temp_min"]),
        "target_temp_max": float(c["target_temp_max"]),
        "current_humidity": float(c["current_humidity"]),
        "target_humidity": float(c["target_humidity"]),
        "current_latitude": float(c["current_latitude"]),
        "current_longitude": float(c["current_longitude"]),
        "speed_knots": float(c["speed_knots"]),
        "heading_degrees": float(c["heading_degrees"]),
        "total_distance_nmi": float(c["total_distance_nmi"]),
        "distance_travelled_nmi": float(c["distance_travelled_nmi"]),
        "distance_remaining_nmi": float(c["distance_remaining_nmi"]),
        "route_progress_pct": float(c["route_progress_pct"]),
        "expected_dwell_hours": float(c.get("expected_dwell_hours") or 8.0),
        "actual_dwell_hours": float(c.get("actual_dwell_hours") or 8.0),
        "departure_time": c["departure_time"].isoformat() if c.get("departure_time") else None,
        "estimated_arrival_time": c["estimated_arrival_time"].isoformat() if c.get("estimated_arrival_time") else None,
        "last_telemetry_at": c["last_telemetry_at"].isoformat() if c.get("last_telemetry_at") else None
    }

    history_list = []
    for h in hist_rows:
        history_list.append({
            **h,
            "latitude": float(h["latitude"]),
            "longitude": float(h["longitude"]),
            "speed_knots": float(h["speed_knots"]) if h.get("speed_knots") is not None else 0.0,
            "heading_degrees": float(h["heading_degrees"]) if h.get("heading_degrees") is not None else 0.0,
            "temperature": float(h["temperature"]),
            "humidity": float(h["humidity"]),
            "distance_remaining_nmi": float(h["distance_remaining_nmi"]) if h.get("distance_remaining_nmi") is not None else 0.0,
            "route_progress_pct": float(h["route_progress_pct"]) if h.get("route_progress_pct") is not None else 0.0,
            "recorded_at": h["recorded_at"].isoformat() if h.get("recorded_at") else None
        })

    # Calculations via Intelligence Engines
    shelf_life_remaining = float(s.get("shelf_life_remaining_hours") or 180.0) if s else 180.0
    initial_shelf_life = float(s.get("initial_shelf_life_hours") or 360.0) if s else 360.0
    eta_hours = float(s.get("eta_destination_hours") or 140.0) if s else 140.0
    produce_name = s.get("produce_name", "Produce") if s else "Produce"
    dep_time = s.get("departure_time") or (datetime.now() - timedelta(days=3))
    qty = float(s.get("current_quantity_kg") or 1000.0) if s else 1000.0
    price = float(s.get("unit_price_per_kg_inr") or 60.0) if s else 60.0

    # 1. Route Risk
    route_risk = calculate_marine_route_risk(
        container=container_dict,
        location_history=history_list,
        weather_events=weather_events,
        port_events=port_events,
        shelf_life_remaining_hours=shelf_life_remaining,
        eta_hours=eta_hours
    )

    # 2. Shelf Life Engine
    shelf_life_info = calculate_shelf_life_intelligence(
        produce_name=produce_name,
        initial_shelf_life_hours=initial_shelf_life,
        departure_time=dep_time,
        eta_hours=eta_hours,
        telemetry_history=history_list,
        current_temp=container_dict["current_temperature"],
        optimal_temp=container_dict["set_temperature"]
    )

    # 3. Spoilage Cost
    spoilage_cost = calculate_spoilage_cost(
        quantity_kg=qty,
        produce_name=produce_name,
        market_price_per_kg=price,
        risk_score=route_risk["risk_score"],
        shelf_life_info=shelf_life_info
    )

    # 4. Reefer Health
    reefer_health = calculate_reefer_health(
        container=container_dict,
        recent_telemetry=history_list
    )

    # 5. Sensor Trust
    sensor_trust = evaluate_sensor_data_trust(telemetry_history=history_list)

    # 6. Port Dwell Time Intelligence
    expected_dwell = container_dict["expected_dwell_hours"]
    actual_dwell = container_dict["actual_dwell_hours"]
    dwell_delay = max(0.0, actual_dwell - expected_dwell)
    consumed_pct = round((dwell_delay / max(1.0, shelf_life_remaining)) * 100.0, 1)
    port_dwell_intel = {
        "expected_dwell_hours": expected_dwell,
        "actual_dwell_hours": actual_dwell,
        "dwell_delay_hours": dwell_delay,
        "shelf_life_consumed_by_port_delay_pct": consumed_pct,
        "warning_banner": f"⚠️ PORT DELAY CONSUMED {consumed_pct:.0f}% OF REMAINING SHELF LIFE" if dwell_delay > 2.0 else "PORT DWELL ON SCHEDULE",
        "has_delay_warning": dwell_delay > 2.0
    }

    # 7. Transshipment Risk
    transshipment_count = int(container_dict.get("transshipment_count") or 0)
    transshipment_risk = {
        "transshipment_count": transshipment_count,
        "handling_events_count": transshipment_count * 2 + 1,
        "additional_dwell_hours": transshipment_count * 8.0,
        "risk_level": "HIGH" if transshipment_count >= 2 else ("MEDIUM" if transshipment_count == 1 else "LOW"),
        "recommendation": "Consider a direct route if available." if transshipment_count >= 1 else "Direct route verified with minimal handling exposure."
    }

    # 8. Sell Before Spoilage & Dynamic Destination
    sell_before_spoilage = evaluate_sell_before_spoilage_allocations(
        shipment_id=s.get("shipment_id", "SHP-001") if s else "SHP-001",
        produce_name=produce_name,
        current_quantity_kg=qty,
        remaining_shelf_life_hours=shelf_life_remaining,
        current_destination_eta_hours=eta_hours,
        current_risk_score=route_risk["risk_score"],
        candidate_buyers=alt_buyers
    )

    return {
        "container": container_dict,
        "shipment": s,
        "route_risk": route_risk,
        "shelf_life_intelligence": shelf_life_info,
        "spoilage_cost": spoilage_cost,
        "reefer_health": reefer_health,
        "sensor_trust": sensor_trust,
        "port_dwell_intelligence": port_dwell_intel,
        "transshipment_risk": transshipment_risk,
        "sell_before_spoilage": sell_before_spoilage,
        "digital_seal": seal,
        "weather_events": weather_events,
        "port_events": port_events,
        "location_history": history_list,
        "black_box_events": bb_rows
    }


# ==============================================================================
# 5. CONTAINER BLACK BOX CHRONOLOGICAL EVENT TRAIL
# ==============================================================================

@router.get("/containers/{container_id}/black-box")
def get_container_black_box(container_id: str):
    """
    Returns the complete central chronological evidence trail for a specific container.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT * FROM container_black_box_events
        WHERE container_id = %s
        ORDER BY event_timestamp ASC;
    """, (container_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    events = []
    for r in rows:
        events.append({
            **r,
            "latitude": float(r["latitude"]) if r.get("latitude") is not None else None,
            "longitude": float(r["longitude"]) if r.get("longitude") is not None else None,
            "temperature": float(r["temperature"]) if r.get("temperature") is not None else None,
            "humidity": float(r["humidity"]) if r.get("humidity") is not None else None,
            "event_timestamp": r["event_timestamp"].isoformat() if r.get("event_timestamp") else None,
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None
        })

    return {
        "container_id": container_id,
        "count": len(events),
        "events": events
    }


@router.post("/containers/{container_id}/events")
def create_container_black_box_event(container_id: str, payload: ContainerEventCreate):
    """
    Appends a new chronological event to the Container Black Box.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT shipment_id FROM multimodal_shipments WHERE container_id = %s LIMIT 1;", (container_id,))
    c_row = cur.fetchone()
    shipment_id = c_row["shipment_id"] if c_row and c_row.get("shipment_id") else f"SHP-{container_id}"

    event_id = f"BB-EV-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now()

    cur.execute("""
        INSERT INTO container_black_box_events (
            event_id, shipment_id, container_id, event_timestamp, location_name,
            latitude, longitude, event_type, temperature, humidity, door_status,
            reefer_status, actor_role, evidence_ref, notes, severity
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *;
    """, (
        event_id, shipment_id, container_id, now, payload.location_name,
        payload.latitude, payload.longitude, payload.event_type, payload.temperature,
        payload.humidity, payload.door_status, payload.reefer_status, payload.actor_role,
        payload.evidence_ref, payload.notes, payload.severity
    ))
    new_ev = cur.fetchone()

    # Update container telemetry if temperature/location supplied
    if payload.temperature is not None or payload.latitude is not None:
        cur.execute("""
            UPDATE shipping_containers SET
                current_temperature = COALESCE(%s, current_temperature),
                current_humidity = COALESCE(%s, current_humidity),
                current_latitude = COALESCE(%s, current_latitude),
                current_longitude = COALESCE(%s, current_longitude),
                door_status = COALESCE(%s, door_status),
                compressor_status = COALESCE(%s, compressor_status),
                last_telemetry_at = CURRENT_TIMESTAMP
            WHERE container_id = %s;
        """, (payload.temperature, payload.humidity, payload.latitude, payload.longitude, payload.door_status, payload.reefer_status, container_id))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "status": "SUCCESS",
        "message": f"Black Box event '{event_id}' recorded successfully.",
        "event": {
            **new_ev,
            "latitude": float(new_ev["latitude"]) if new_ev.get("latitude") else None,
            "longitude": float(new_ev["longitude"]) if new_ev.get("longitude") else None,
            "temperature": float(new_ev["temperature"]) if new_ev.get("temperature") else None,
            "humidity": float(new_ev["humidity"]) if new_ev.get("humidity") else None,
            "event_timestamp": new_ev["event_timestamp"].isoformat()
        }
    }


# ==============================================================================
# 6. "WHERE DID THE LOSS HAPPEN?" — DEEP LOSS INVESTIGATION
# ==============================================================================

@router.get("/shipments/{shipment_id}/investigation")
def get_multimodal_loss_investigation(shipment_id: str):
    """
    Comprehensive multi-stage forensic audit across 7-to-9 journey milestones.
    Pinpoints the FIRST DETECTED ANOMALY and generates a NEUTRAL AI INVESTIGATION SUMMARY.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT * FROM multimodal_shipments WHERE shipment_id = %s;", (shipment_id,))
    s = cur.fetchone()
    if not s:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail=f"Multimodal shipment '{shipment_id}' not found.")

    container_id = s.get("container_id")
    c = {}
    seal = {}
    if container_id:
        cur.execute("SELECT * FROM shipping_containers WHERE container_id = %s;", (container_id,))
        c = cur.fetchone() or {}
        cur.execute("SELECT * FROM digital_seals WHERE container_id = %s;", (container_id,))
        seal = cur.fetchone() or {}

    cur.execute("""
        SELECT * FROM multimodal_journey_stages
        WHERE shipment_id = %s
        ORDER BY stage_order ASC;
    """, (shipment_id,))
    stages = cur.fetchall()

    cur.execute("""
        SELECT * FROM port_handover_events
        WHERE shipment_id = %s
        ORDER BY event_timestamp ASC;
    """, (shipment_id,))
    port_events = cur.fetchall()

    cur.close()
    conn.close()

    # Cast stages
    casted_stages = []
    for st in stages:
        casted_stages.append({
            **st,
            "recorded_quantity_kg": float(st["recorded_quantity_kg"]),
            "recorded_temp_c": float(st["recorded_temp_c"]) if st.get("recorded_temp_c") is not None else None,
            "recorded_humidity_pct": float(st["recorded_humidity_pct"]) if st.get("recorded_humidity_pct") is not None else None,
            "discrepancy_kg": float(st.get("discrepancy_kg") or 0.0),
            "temp_excursion_min": int(st.get("temp_excursion_min") or 0),
            "timestamp_recorded": st["timestamp_recorded"].isoformat() if st.get("timestamp_recorded") else None
        })

    investigation_result = investigate_multimodal_journey_loss(
        shipment_id=shipment_id,
        stages=casted_stages,
        container=c,
        port_events=port_events,
        seal_info=seal
    )

    return {
        "shipment": s,
        "container": c,
        "digital_seal": seal,
        "journey_stages": casted_stages,
        "investigation_result": investigation_result
    }


# ==============================================================================
# 7. AI WHAT-IF SIMULATOR
# ==============================================================================

@router.post("/what-if")
def run_ai_what_if_simulation(payload: WhatIfSimulateRequest):
    """
    Simulates alternative routing/buyer/reefer interventions without mutating live data.
    """
    container_id = payload.container_id or "MEDU7719203"
    shipment_id = payload.shipment_id or "AGRI-SHP-9905"

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT * FROM shipping_containers WHERE container_id = %s;", (container_id,))
    c = cur.fetchone()
    cur.execute("SELECT * FROM multimodal_shipments WHERE shipment_id = %s OR container_id = %s;", (shipment_id, container_id))
    s = cur.fetchone()

    cur.close()
    conn.close()

    curr_plan = {
        "eta_hours": float(s.get("eta_destination_hours") or 40.0) if s else 40.0,
        "remaining_shelf_life_hours": float(s.get("shelf_life_remaining_hours") or 30.0) if s else 30.0,
        "risk_score": int(s.get("overall_risk_score") or 78) if s else 78,
        "quantity_kg": float(s.get("current_quantity_kg") or 1000.0) if s else 1000.0,
        "price_per_kg_inr": float(s.get("unit_price_per_kg_inr") or 60.0) if s else 60.0,
        "potential_loss_inr": 24000.0
    }

    sim_res = simulate_what_if_scenario(
        current_plan=curr_plan,
        simulation_type=payload.simulation_type,
        simulation_params=payload.simulation_params
    )

    return sim_res
