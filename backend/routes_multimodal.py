"""
AGRITrust — Multi-Modal Logistics Intelligence Router (Road + Marine + Air)
==========================================================================
Provides enterprise REST API endpoints for:
- 3-Mode Shipment Cost & Route Comparison (Road, Marine, Air)
- Itemized Cost Breakdown Retrieval & Volumetric Weight Calculations
- AI-Assisted Recommendation Engine & Carbon Accounting
- Quotation Persistence & History Retrieval
- Route Selection, Confirmed Booking & Multi-Segment Chain of Custody Generation
- Unified Multimodal Shipment Tracking Across Segments
- Configurable Rate Cards & PIN/Hub Directory Management
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status, Body, Depends
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor, Json

from multimodal_cost_engine import (
    plan_and_compare_all_routes,
    resolve_location,
    PINCODE_REGISTRY,
    PORTS_REGISTRY,
    AIRPORTS_REGISTRY
)

router = APIRouter(prefix="/multimodal", tags=["Multi-Modal Logistics Intelligence (Road + Marine + Air)"])

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

class MultiRoutePlanRequest(BaseModel):
    pickup_pincode: str = Field(..., description="6-digit pickup PIN code or international postal code", example="422001")
    pickup_location: str = Field(..., description="Pickup City / State / Packhouse location name", example="Nashik Sahyadri Farm Hub")
    destination_pincode: str = Field(..., description="6-digit destination PIN code or international postal code", example="110037")
    destination_location: str = Field(..., description="Destination City / State / Receiving Dock name", example="Delhi Central Cold Distribution Hub")
    cargo_weight_kg: float = Field(..., gt=0, description="Total cargo weight in kilograms", example=4500.0)
    cargo_type: str = Field("Fresh Organic Produce", description="Produce or goods classification", example="Fresh Table Grapes")
    cargo_volume_cbm: Optional[float] = Field(None, description="Cargo volume in cubic meters (m³)")
    package_length_cm: Optional[float] = Field(None, description="Length of single master package / pallet in cm")
    package_width_cm: Optional[float] = Field(None, description="Width of single master package / pallet in cm")
    package_height_cm: Optional[float] = Field(None, description="Height of single master package / pallet in cm")
    is_perishable: bool = Field(True, description="Indicates if cargo requires temperature maintenance")
    shelf_life_days: float = Field(7.0, gt=0, description="Estimated total shelf life from harvest in days", example=14.0)
    required_delivery_date: Optional[str] = Field(None, description="Target delivery date (ISO format or YYYY-MM-DD)")
    urgency_level: str = Field("STANDARD", description="'STANDARD', 'EXPRESS', or 'CRITICAL'")
    temperature_requirement: str = Field("Chilled (2°C to 6°C)", description="Cold-chain temperature bracket description")
    temp_min_c: float = Field(2.0, description="Minimum acceptable temperature in °C")
    temp_max_c: float = Field(6.0, description="Maximum acceptable temperature in °C")
    insurance_preference: str = Field("STANDARD", description="'NONE', 'STANDARD', or 'COMPREHENSIVE'")
    declared_cargo_value_inr: float = Field(250000.0, ge=0, description="Total declared monetary invoice value of cargo")
    priority_preference: str = Field("BALANCED", description="'COST', 'BALANCED', or 'SPEED'")
    user_id: Optional[str] = Field(None, description="Logged-in User ID")
    user_role: Optional[str] = Field(None, description="Logged-in User Role")


class BookingCreateRequest(BaseModel):
    quote_id: str = Field(..., description="ID of the previously generated quotation", example="QTE-MM-...")
    selected_mode: str = Field(..., description="'ROAD', 'MARINE', or 'AIR'", example="ROAD")
    consignment_id: Optional[str] = Field(None, description="Optional verified consignment request ID", example="REQ-2026-004")
    verification_reference_no: Optional[str] = Field(None, description="Physical verification certificate reference", example="VRF-2026-8839")
    produce_name: Optional[str] = None
    cargo_weight_kg: Optional[float] = None
    pickup_pincode: Optional[str] = None
    pickup_location: Optional[str] = None
    destination_pincode: Optional[str] = None
    destination_location: Optional[str] = None
    sender_name: str = Field("AGRITrust Verified Producer", example="Sahyadri Farmer Producer Co.")
    sender_phone: str = Field("+91 98220 54321", example="+91 98220 54321")
    receiver_name: str = Field("Agro Fresh Retail Mart", example="Delhi Fresh Agro Mart Retail Hub")
    receiver_phone: str = Field("+91 98110 98765", example="+91 98110 98765")
    special_instructions: Optional[str] = None
    user_id: Optional[str] = None


class RateCardUpdateRequest(BaseModel):
    base_freight_per_km_or_kg: Optional[float] = None
    minimum_charge: Optional[float] = None
    first_mile_rate_per_km: Optional[float] = None
    last_mile_rate_per_km: Optional[float] = None
    loading_unloading_rate_per_tonne: Optional[float] = None
    handling_doc_charge: Optional[float] = None
    cold_chain_surcharge_pct: Optional[float] = None
    fuel_surcharge_pct: Optional[float] = None
    toll_rate_per_km: Optional[float] = None
    insurance_rate_pct: Optional[float] = None
    tax_rate_pct: Optional[float] = None


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.post("/plan-and-compare", summary="Smart Multi-Route Shipment Planner (Road + Marine + Air)")
def plan_and_compare_multimodal_routes(payload: MultiRoutePlanRequest):
    """
    Simultaneously computes and compares Road, Marine, and Air routes based on identical
    shipment parameters, providing:
    - Feasibility & unsuitability rationale
    - Full itemized cost breakdowns (freight, first/last mile, tolls, port/airport, reefer, insurance, taxes)
    - Transit time schedules & waypoints
    - CO2 emissions estimates
    - AI-assisted recommendation badges (Lowest Cost, Fastest, Best Balanced, Best Perishable, Lowest Emissions)
    - Saves quotation in PostgreSQL database
    """
    try:
        # Run calculation engine
        result = plan_and_compare_all_routes(
            pickup_pincode=payload.pickup_pincode,
            pickup_location=payload.pickup_location,
            destination_pincode=payload.destination_pincode,
            destination_location=payload.destination_location,
            cargo_weight_kg=payload.cargo_weight_kg,
            cargo_type=payload.cargo_type,
            cargo_volume_cbm=payload.cargo_volume_cbm,
            package_length_cm=payload.package_length_cm,
            package_width_cm=payload.package_width_cm,
            package_height_cm=payload.package_height_cm,
            is_perishable=payload.is_perishable,
            shelf_life_days=payload.shelf_life_days,
            required_delivery_date=payload.required_delivery_date,
            urgency_level=payload.urgency_level,
            temperature_requirement=payload.temperature_requirement,
            temp_min_c=payload.temp_min_c,
            temp_max_c=payload.temp_max_c,
            insurance_preference=payload.insurance_preference,
            declared_cargo_value_inr=payload.declared_cargo_value_inr,
            priority_preference=payload.priority_preference,
            user_id=payload.user_id,
            user_role=payload.user_role
        )

        # Persist quotation & route options in database
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Resolve user_id if valid in DB
        db_user_id = None
        if payload.user_id:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s;", (payload.user_id,))
            user_row = cur.fetchone()
            if user_row:
                db_user_id = user_row["user_id"]

        cur.execute("""
            INSERT INTO shipment_quotes (
                quote_id, quote_reference, user_id, user_role,
                pickup_pincode, pickup_location, destination_pincode, destination_location,
                cargo_weight_kg, cargo_type, cargo_volume_cbm, is_perishable, shelf_life_days,
                urgency_level, temperature_requirement, temp_min_c, temp_max_c,
                insurance_preference, declared_cargo_value_inr, priority_preference, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE')
            ON CONFLICT (quote_id) DO NOTHING;
        """, (
            result["quote_id"], result["quote_reference"], db_user_id, payload.user_role or "LOGISTICS",
            payload.pickup_pincode, result["shipment_inputs"]["pickup_location"],
            payload.destination_pincode, result["shipment_inputs"]["destination_location"],
            payload.cargo_weight_kg, payload.cargo_type, result["shipment_inputs"]["cargo_volume_cbm"],
            payload.is_perishable, payload.shelf_life_days, payload.urgency_level,
            payload.temperature_requirement, payload.temp_min_c, payload.temp_max_c,
            payload.insurance_preference, payload.declared_cargo_value_inr, payload.priority_preference
        ))

        for mode, opt in result["routes"].items():
            opt_id = f"OPT-{result['quote_id']}-{mode}"
            cur.execute("""
                INSERT INTO route_options (
                    option_id, quote_id, mode, mode_title, is_feasible, infeasibility_reason,
                    carrier_name, vehicle_or_vessel_desc, total_estimated_cost_inr,
                    estimated_transit_hours, estimated_delivery_time, total_distance_km,
                    actual_weight_kg, volumetric_weight_kg, chargeable_weight_kg,
                    origin_facility_name, destination_facility_name, cost_breakdown,
                    co2_emissions_kg, cold_chain_rating, perishability_risk_level,
                    shelf_life_depletion_pct, ai_recommendation_badges,
                    ai_recommendation_score, ai_reasoning_summary, route_waypoints,
                    data_source
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (option_id) DO UPDATE SET
                    total_estimated_cost_inr = EXCLUDED.total_estimated_cost_inr,
                    cost_breakdown = EXCLUDED.cost_breakdown;
            """, (
                opt_id, result["quote_id"], mode, opt["mode_title"], opt["is_feasible"], opt["infeasibility_reason"],
                opt["carrier_name"], opt["vehicle_or_vessel_desc"], opt["total_estimated_cost_inr"],
                opt["estimated_transit_hours"], opt["estimated_delivery_time"], opt["total_distance_km"],
                opt["actual_weight_kg"], opt["volumetric_weight_kg"], opt["chargeable_weight_kg"],
                opt["origin_facility_name"], opt["destination_facility_name"], Json(opt["cost_breakdown"]),
                opt["co2_emissions_kg"], opt["cold_chain_rating"], opt["perishability_risk_level"],
                opt["shelf_life_depletion_pct"], Json(opt["ai_recommendation_badges"]),
                opt["ai_recommendation_score"], opt["ai_reasoning_summary"], Json(opt["route_waypoints"]),
                opt["data_source"]
            ))

        conn.commit()
        conn.close()

        return {
            "status": "SUCCESS",
            "message": "Multi-route comparison generated and saved successfully.",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to plan multimodal routes: {str(e)}")


@router.get("/quotes", summary="Get recent shipment quotes history")
def list_shipment_quotes(limit: int = Query(20, ge=1, le=100)):
    """
    Returns list of saved shipment quotes with route options summary.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT q.*,
                   json_agg(json_build_object(
                       'option_id', r.option_id,
                       'mode', r.mode,
                       'mode_title', r.mode_title,
                       'is_feasible', r.is_feasible,
                       'infeasibility_reason', r.infeasibility_reason,
                       'total_estimated_cost_inr', r.total_estimated_cost_inr,
                       'estimated_transit_hours', r.estimated_transit_hours,
                       'ai_recommendation_badges', r.ai_recommendation_badges,
                       'ai_recommendation_score', r.ai_recommendation_score
                   )) as route_options
            FROM shipment_quotes q
            LEFT JOIN route_options r ON q.quote_id = r.quote_id
            GROUP BY q.quote_id
            ORDER BY q.created_at DESC
            LIMIT %s;
        """, (limit,))
        rows = cur.fetchall()
        return {"status": "SUCCESS", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/quotes/{quote_id}", summary="Get full quote details with route options")
def get_quote_detail(quote_id: str):
    """
    Retrieves full details of a specific quotation with 3-mode comparisons and waypoints.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM shipment_quotes WHERE quote_id = %s;", (quote_id,))
        quote = cur.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail=f"Quote '{quote_id}' not found.")

        cur.execute("SELECT * FROM route_options WHERE quote_id = %s ORDER BY mode;", (quote_id,))
        options = cur.fetchall()

        routes_dict = {}
        for opt in options:
            routes_dict[opt["mode"]] = opt

        return {
            "status": "SUCCESS",
            "data": {
                "quote_id": quote["quote_id"],
                "quote_reference": quote["quote_reference"],
                "shipment_inputs": quote,
                "routes": routes_dict
            }
        }
    finally:
        conn.close()


@router.post("/bookings", summary="Confirm shipment booking for selected route option")
def create_multimodal_booking(payload: BookingCreateRequest):
    """
    Confirms shipment booking on selected mode (Road, Marine, or Air):
    - Generates common shipment ID
    - Records confirmed booking in PostgreSQL
    - Initializes multi-segment route milestones and custody holders
    - Synchronizes with live monitoring & QR verification tables
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Fetch quote and selected option
        cur.execute("SELECT * FROM shipment_quotes WHERE quote_id = %s;", (payload.quote_id,))
        quote = cur.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail=f"Quote '{payload.quote_id}' not found.")

        cur.execute("""
            SELECT * FROM route_options 
            WHERE quote_id = %s AND mode = %s;
        """, (payload.quote_id, payload.selected_mode.upper()))
        option = cur.fetchone()
        if not option:
            raise HTTPException(status_code=404, detail=f"Option for mode '{payload.selected_mode}' not found.")

        if not option["is_feasible"]:
            raise HTTPException(status_code=400, detail=f"Cannot book infeasible route: {option['infeasibility_reason']}")

        # Physical Verification Enforcement Guard
        if payload.consignment_id:
            cur.execute("SELECT * FROM consignment_requests WHERE consignment_id = %s;", (payload.consignment_id,))
            consign_row = cur.fetchone()
            if consign_row and consign_row["verification_status"] not in ["APPROVED", "AWAITING_BOOKING", "BOOKING_CONFIRMED", "READY_FOR_DISPATCH"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"MANDATORY PHYSICAL VERIFICATION REQUIRED: Consignment #{payload.consignment_id} is in status '{consign_row['verification_status']}'. Transport booking is strictly blocked until an authorized verification officer inspects and approves the consignment."
                )

        now = datetime.now()
        mode = payload.selected_mode.upper()
        unique_suffix = f"{int(now.timestamp()) % 100000:05d}"
        booking_id = f"BKG-MM-{now.strftime('%Y%m%d')}-{unique_suffix}"
        booking_ref = f"AGRI-BKG-{unique_suffix}"
        shipment_id = f"SHP-MM-{mode}-{unique_suffix}"

        # Resolve user
        db_user_id = None
        if payload.user_id:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s;", (payload.user_id,))
            u = cur.fetchone()
            if u:
                db_user_id = u["user_id"]
        if not db_user_id and quote.get("user_id"):
            db_user_id = quote["user_id"]
        if not db_user_id:
            db_user_id = "usr_logistics_01"

        produce_name = payload.produce_name or quote["cargo_type"]
        weight_kg = payload.cargo_weight_kg or float(quote["cargo_weight_kg"])
        pickup_pin = payload.pickup_pincode or quote["pickup_pincode"]
        pickup_loc = payload.pickup_location or quote["pickup_location"]
        dest_pin = payload.destination_pincode or quote["destination_pincode"]
        dest_loc = payload.destination_location or quote["destination_location"]

        total_amount = float(option["total_estimated_cost_inr"])
        eta = now + timedelta(hours=float(option["estimated_transit_hours"]))

        # 1. Insert Multimodal Booking
        cur.execute("""
            INSERT INTO multimodal_bookings (
                booking_id, booking_reference, shipment_id, quote_id, selected_option_id,
                user_id, selected_mode, carrier_name, service_type, produce_name,
                cargo_weight_kg, pickup_pincode, pickup_location, destination_pincode,
                destination_location, total_amount_inr, cost_breakdown, booking_status,
                payment_status, temp_setpoint_c, temp_min_c, temp_max_c, target_humidity_pct,
                sender_name, sender_phone, receiver_name, receiver_phone,
                special_instructions, estimated_departure_time, estimated_delivery_time,
                current_segment_index, current_status_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'CONFIRMED', 'ESCROW_HELD', %s, %s, %s, 85.0, %s, %s, %s, %s, %s, %s, %s, 1, 'Booking confirmed. Dispatch preparation and pre-cooling underway.')
            RETURNING *;
        """, (
            booking_id, booking_ref, shipment_id, quote["quote_id"], option["option_id"],
            db_user_id, mode, option["carrier_name"], option["vehicle_or_vessel_desc"],
            produce_name, weight_kg, pickup_pin, pickup_loc, dest_pin, dest_loc,
            total_amount, Json(option["cost_breakdown"]),
            quote["temp_min_c"] + (quote["temp_max_c"] - quote["temp_min_c"])/2.0,
            quote["temp_min_c"], quote["temp_max_c"],
            payload.sender_name, payload.sender_phone, payload.receiver_name, payload.receiver_phone,
            payload.special_instructions, now + timedelta(hours=1), eta
        ))
        booking_record = cur.fetchone()

        # 2. Generate Route Segments
        if mode == "ROAD":
            cur.execute("""
                INSERT INTO route_segments (
                    segment_id, booking_id, shipment_id, segment_order, segment_type,
                    segment_title, origin_point, destination_point, distance_km,
                    estimated_duration_hours, segment_status, carrier_operator,
                    vehicle_or_vessel_identifier, custody_holder, temp_setpoint_c,
                    current_temp_c, humidity_pct, departure_time, arrival_time
                ) VALUES 
                (%s, %s, %s, 1, 'FIRST_MILE_ROAD', 'Farm Gate Loading & Pre-Cooling Intake', %s, %s, 15.0, 1.5, 'ACTIVE', 'AGRITrust Local Shuttle', 'MH-15-EG-4412', %s, %s, %s, 85.0, %s, %s),
                (%s, %s, %s, 2, 'LONG_HAUL_ROAD', 'Direct Highway Reefer Transit Corridor', %s, %s, %s, %s, 'PENDING', %s, 'Reefer Express Fleet', 'Assigned Logistics Driver', %s, %s, 85.0, %s, %s),
                (%s, %s, %s, 3, 'LAST_MILE_ROAD', 'Destination Dock Discharge & Verified Handover', %s, %s, 12.0, 1.5, 'PENDING', %s, 'Local Delivery Unit', %s, %s, %s, 85.0, %s, %s);
            """, (
                f"SEG-{booking_id}-1", booking_id, shipment_id, pickup_loc, f"{pickup_loc} Highway Gate", payload.sender_name, quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.2, now, now + timedelta(hours=1.5),
                f"SEG-{booking_id}-2", booking_id, shipment_id, f"{pickup_loc} Highway Gate", f"{dest_loc} Receiving Depot", float(option["total_distance_km"]), float(option["estimated_transit_hours"]) - 3.0, option["carrier_name"], quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, now + timedelta(hours=1.5), eta - timedelta(hours=1.5),
                f"SEG-{booking_id}-3", booking_id, shipment_id, f"{dest_loc} Receiving Depot", dest_loc, option["carrier_name"], payload.receiver_name, quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, eta - timedelta(hours=1.5), eta
            ))
        elif mode == "MARINE":
            origin_facility = option.get("origin_facility_name") or "Origin Seaport Terminal"
            dest_facility = option.get("destination_facility_name") or "Destination Seaport Terminal"
            cur.execute("""
                INSERT INTO route_segments (
                    segment_id, booking_id, shipment_id, segment_order, segment_type,
                    segment_title, origin_point, destination_point, distance_km,
                    estimated_duration_hours, segment_status, carrier_operator,
                    vehicle_or_vessel_identifier, custody_holder, temp_setpoint_c,
                    current_temp_c, humidity_pct, departure_time, arrival_time
                ) VALUES 
                (%s, %s, %s, 1, 'FIRST_MILE_ROAD', 'Reefer Drayage to Origin Container Terminal', %s, %s, 45.0, 3.0, 'ACTIVE', 'AGRITrust Port Drayage', 'Container Drayage Truck', %s, %s, %s, 85.0, %s, %s),
                (%s, %s, %s, 2, 'PORT_STUFFING', 'Port Customs Clearance & Reefer Plug-In', %s, %s, 2.0, 24.0, 'PENDING', 'Port Authority Operations', 'Reefer Yard Bay 04', 'Terminal Handling Supervisor', %s, %s, 88.0, %s, %s),
                (%s, %s, %s, 3, 'SEA_VOYAGE', 'Deep Sea Controlled Atmosphere Container Voyage', %s, %s, %s, %s, 'PENDING', %s, 'MV AGRI VOYAGER', 'Chief Officer Marine Navigation', %s, %s, 90.0, %s, %s),
                (%s, %s, %s, 4, 'LAST_MILE_ROAD', 'Destination Port Discharge to Consignee Dock', %s, %s, 35.0, 3.0, 'PENDING', 'EuroTruck Container Hauler', 'Reefer Trailer NL-88', %s, %s, %s, 85.0, %s, %s);
            """, (
                f"SEG-{booking_id}-1", booking_id, shipment_id, pickup_loc, origin_facility, payload.sender_name, quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.1, now, now + timedelta(hours=3),
                f"SEG-{booking_id}-2", booking_id, shipment_id, origin_facility, f"{origin_facility} Berth 1", quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, now + timedelta(hours=3), now + timedelta(hours=27),
                f"SEG-{booking_id}-3", booking_id, shipment_id, origin_facility, dest_facility, float(option["total_distance_km"]) - 80.0, float(option["estimated_transit_hours"]) - 30.0, option["carrier_name"], quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, now + timedelta(hours=27), eta - timedelta(hours=3),
                f"SEG-{booking_id}-4", booking_id, shipment_id, dest_facility, dest_loc, payload.receiver_name, quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, eta - timedelta(hours=3), eta
            ))
        elif mode == "AIR":
            origin_facility = option.get("origin_facility_name") or "Origin Cargo Airport"
            dest_facility = option.get("destination_facility_name") or "Destination Cargo Airport"
            cur.execute("""
                INSERT INTO route_segments (
                    segment_id, booking_id, shipment_id, segment_order, segment_type,
                    segment_title, origin_point, destination_point, distance_km,
                    estimated_duration_hours, segment_status, carrier_operator,
                    vehicle_or_vessel_identifier, custody_holder, temp_setpoint_c,
                    current_temp_c, humidity_pct, departure_time, arrival_time
                ) VALUES 
                (%s, %s, %s, 1, 'FIRST_MILE_ROAD', 'Express Cold-Van Transport to Cargo Terminal', %s, %s, 30.0, 2.0, 'ACTIVE', 'AGRITrust Air Express', 'Temp Controlled Van', %s, %s, %s, 80.0, %s, %s),
                (%s, %s, %s, 2, 'AIRPORT_TRANSFER', 'X-Ray Screening, AWB & Cool Dolly Staging', %s, %s, 2.0, 3.0, 'PENDING', 'Airport Cargo Operations', 'Pharma Cargo Zone 2', 'Air Cargo Acceptance Officer', %s, %s, 82.0, %s, %s),
                (%s, %s, %s, 3, 'AIR_FLIGHT', 'Dedicated Air Cargo Flight Transit', %s, %s, %s, %s, 'PENDING', %s, 'Airbus A321F / Boeing 777F', 'Air Cargo Flight Crew', %s, %s, 80.0, %s, %s),
                (%s, %s, %s, 4, 'LAST_MILE_ROAD', 'Destination Airport Release to Final Receiver', %s, %s, 20.0, 2.0, 'PENDING', 'Express City Logistics', 'Cool Delivery Van', %s, %s, %s, 80.0, %s, %s);
            """, (
                f"SEG-{booking_id}-1", booking_id, shipment_id, pickup_loc, origin_facility, payload.sender_name, quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.1, now, now + timedelta(hours=2),
                f"SEG-{booking_id}-2", booking_id, shipment_id, origin_facility, f"{origin_facility} Gate 4", quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, now + timedelta(hours=2), now + timedelta(hours=5),
                f"SEG-{booking_id}-3", booking_id, shipment_id, origin_facility, dest_facility, float(option["total_distance_km"]) - 50.0, float(option["estimated_transit_hours"]) - 7.0, option["carrier_name"], quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, now + timedelta(hours=5), eta - timedelta(hours=2),
                f"SEG-{booking_id}-4", booking_id, shipment_id, dest_facility, dest_loc, payload.receiver_name, quote["temp_min_c"] + 1.0, quote["temp_min_c"] + 1.0, eta - timedelta(hours=2), eta
            ))

        # 3. Synchronize with `shipments` table for QR verification & telemetry integration
        cur.execute("""
            INSERT INTO shipments (
                shipment_id, vehicle_id, product_name, origin, destination,
                target_temp_min, target_temp_max, shipment_status, departure_time,
                expected_delivery_time, farmer_id, buyer_id, logistics_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'IN_TRANSIT', %s, %s, %s, %s, %s)
            ON CONFLICT (shipment_id) DO UPDATE SET
                shipment_status = EXCLUDED.shipment_status;
        """, (
            shipment_id, "FTL-V001", produce_name, pickup_loc, dest_loc,
            quote["temp_min_c"], quote["temp_max_c"], now, eta,
            "usr_farmer_01", "usr_buyer_01", "usr_logistics_01"
        ))

        # 4. Update quote status to BOOKED
        cur.execute("UPDATE shipment_quotes SET status = 'BOOKED' WHERE quote_id = %s;", (quote["quote_id"],))

        # 4. Link with Consignment Request if applicable
        if payload.consignment_id:
            cur.execute("""
                UPDATE consignment_requests
                SET booking_id = %s,
                    selected_transport_mode = %s,
                    carrier_name = %s,
                    shipment_id = %s,
                    verification_status = 'BOOKING_CONFIRMED',
                    updated_at = CURRENT_TIMESTAMP
                WHERE consignment_id = %s;
            """, (booking_id, mode, option["carrier_name"], shipment_id, payload.consignment_id))

        conn.commit()

        # Fetch created segments
        cur.execute("SELECT * FROM route_segments WHERE booking_id = %s ORDER BY segment_order;", (booking_id,))
        segments = cur.fetchall()

        return {
            "status": "SUCCESS",
            "message": f"Shipment successfully booked via {mode} mode.",
            "data": {
                "booking": booking_record,
                "segments": segments,
                "shipment_id": shipment_id,
                "consignment_id": payload.consignment_id,
                "tracking_url": f"/multimodal/tracking/{shipment_id}"
            }
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create booking: {str(e)}")
    finally:
        conn.close()


@router.get("/bookings", summary="List all multimodal bookings")
def list_multimodal_bookings(limit: int = Query(30, ge=1, le=100)):
    """
    Returns list of multimodal bookings with route segments count and current status.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT b.*,
                   COUNT(s.segment_id) as total_segments,
                   COUNT(CASE WHEN s.segment_status = 'COMPLETED' THEN 1 END) as completed_segments
            FROM multimodal_bookings b
            LEFT JOIN route_segments s ON b.booking_id = s.booking_id
            GROUP BY b.booking_id
            ORDER BY b.created_at DESC
            LIMIT %s;
        """, (limit,))
        rows = cur.fetchall()
        return {"status": "SUCCESS", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/bookings/{booking_id}", summary="Get multimodal booking details with all route segments")
def get_multimodal_booking_detail(booking_id: str):
    """
    Retrieves full details of a booking along with all custody handover route segments.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM multimodal_bookings WHERE booking_id = %s;", (booking_id,))
        booking = cur.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found.")

        cur.execute("SELECT * FROM route_segments WHERE booking_id = %s ORDER BY segment_order ASC;", (booking_id,))
        segments = cur.fetchall()

        return {
            "status": "SUCCESS",
            "data": {
                "booking": booking,
                "segments": segments
            }
        }
    finally:
        conn.close()


@router.get("/tracking/{shipment_id}", summary="Unified Multimodal Shipment Tracking Across Segments")
def get_multimodal_shipment_tracking(shipment_id: str):
    """
    Returns end-to-end multimodal tracking across Road, Marine, and Air segments:
    - Active custody holder
    - Segment progression and live telemetry
    - Cold-chain temperature preservation status
    - Estimated vs actual arrival milestones
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM multimodal_bookings WHERE shipment_id = %s;", (shipment_id,))
        booking = cur.fetchone()

        cur.execute("SELECT * FROM route_segments WHERE shipment_id = %s ORDER BY segment_order ASC;", (shipment_id,))
        segments = cur.fetchall()

        # Check if also present in legacy shipments table
        cur.execute("SELECT * FROM shipments WHERE shipment_id = %s;", (shipment_id,))
        legacy_shipment = cur.fetchone()

        if not booking and not segments and not legacy_shipment:
            raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found.")

        # Compute progress percentage
        total_segs = len(segments)
        completed_segs = sum(1 for s in segments if s["segment_status"] == "COMPLETED")
        active_seg = next((s for s in segments if s["segment_status"] == "ACTIVE"), None)

        progress_pct = 0.0
        if total_segs > 0:
            progress_pct = round((completed_segs + (0.5 if active_seg else 0.0)) / total_segs * 100.0, 1)

        return {
            "status": "SUCCESS",
            "data": {
                "shipment_id": shipment_id,
                "booking": booking,
                "progress_percentage": progress_pct,
                "active_segment": active_seg,
                "all_segments": segments,
                "legacy_shipment_meta": legacy_shipment
            }
        }
    finally:
        conn.close()


@router.post("/tracking/{shipment_id}/advance-segment", summary="Advance multimodal segment for interactive testing")
def advance_multimodal_segment(shipment_id: str):
    """
    Advances active route segment to COMPLETED and starts the next segment.
    Used for live interactive demonstrations and workflow testing.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM route_segments WHERE shipment_id = %s ORDER BY segment_order ASC;", (shipment_id,))
        segments = cur.fetchall()
        if not segments:
            raise HTTPException(status_code=404, detail=f"No route segments found for '{shipment_id}'.")

        active_idx = None
        for i, s in enumerate(segments):
            if s["segment_status"] == "ACTIVE":
                active_idx = i
                break

        now = datetime.now()
        if active_idx is not None:
            # Complete current
            cur.execute("""
                UPDATE route_segments 
                SET segment_status = 'COMPLETED', actual_arrival_time = %s 
                WHERE segment_id = %s;
            """, (now, segments[active_idx]["segment_id"]))

            # Activate next if exists
            if active_idx + 1 < len(segments):
                next_seg = segments[active_idx + 1]
                cur.execute("""
                    UPDATE route_segments 
                    SET segment_status = 'ACTIVE', departure_time = %s 
                    WHERE segment_id = %s;
                """, (now, next_seg["segment_id"]))

                cur.execute("""
                    UPDATE multimodal_bookings 
                    SET current_segment_index = %s,
                        current_status_summary = %s 
                    WHERE shipment_id = %s;
                """, (active_idx + 2, f"Active on {next_seg['segment_title']} under custody of {next_seg['custody_holder']}.", shipment_id))
            else:
                # All completed -> Delivered
                cur.execute("""
                    UPDATE multimodal_bookings 
                    SET booking_status = 'DELIVERED', 
                        actual_delivery_time = %s,
                        current_status_summary = 'Shipment fully delivered. Cold chain integrity verified.'
                    WHERE shipment_id = %s;
                """, (now, shipment_id))
                cur.execute("UPDATE shipments SET shipment_status = 'DELIVERED' WHERE shipment_id = %s;", (shipment_id,))
        else:
            # Start first pending
            first_pending = next((s for s in segments if s["segment_status"] == "PENDING"), None)
            if first_pending:
                cur.execute("""
                    UPDATE route_segments 
                    SET segment_status = 'ACTIVE', departure_time = %s 
                    WHERE segment_id = %s;
                """, (now, first_pending["segment_id"]))
                cur.execute("""
                    UPDATE multimodal_bookings 
                    SET current_status_summary = %s 
                    WHERE shipment_id = %s;
                """, (f"Started {first_pending['segment_title']}.", shipment_id))

        conn.commit()

        # Return updated segments
        cur.execute("SELECT * FROM route_segments WHERE shipment_id = %s ORDER BY segment_order ASC;", (shipment_id,))
        updated_segments = cur.fetchall()

        return {
            "status": "SUCCESS",
            "message": "Route segment advanced successfully.",
            "data": updated_segments
        }
    finally:
        conn.close()


@router.get("/pincodes", summary="List supported PIN codes and hubs for autocomplete")
def list_pincode_directory():
    """
    Returns directory of Indian and International PIN codes with city, state, coordinates,
    nearest seaport, and nearest cargo airport.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM pincode_directory WHERE is_active = TRUE ORDER BY city ASC;")
        rows = cur.fetchall()
        return {"status": "SUCCESS", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/hubs", summary="List registered Seaports and Cargo Airports")
def list_ports_and_airports():
    """
    Returns registered seaports and cargo airport facilities with capacities and features.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM ports_airports_registry WHERE is_active = TRUE ORDER BY facility_type, name ASC;")
        rows = cur.fetchall()
        return {"status": "SUCCESS", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/rate-cards", summary="List configurable transport rate cards")
def list_rate_cards():
    """
    Returns active pricing parameters for Road, Marine, and Air modes.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM transport_rate_cards WHERE is_active = TRUE ORDER BY mode, service_name ASC;")
        rows = cur.fetchall()
        return {"status": "SUCCESS", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.put("/rate-cards/{rate_id}", summary="Admin: Update transport pricing rate card")
def update_rate_card(rate_id: str, payload: RateCardUpdateRequest):
    """
    Admin configuration endpoint to adjust base freight, fuel surcharges, tolls,
    handling fees, or tax percentages in PostgreSQL.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM transport_rate_cards WHERE rate_id = %s;", (rate_id,))
        card = cur.fetchone()
        if not card:
            raise HTTPException(status_code=404, detail=f"Rate card '{rate_id}' not found.")

        update_fields = []
        params = []
        for field, value in payload.model_dump(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            return {"status": "NO_CHANGE", "message": "No parameters provided to update."}

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(rate_id)

        sql = f"UPDATE transport_rate_cards SET {', '.join(update_fields)} WHERE rate_id = %s RETURNING *;"
        cur.execute(sql, tuple(params))
        updated_card = cur.fetchone()
        conn.commit()

        return {
            "status": "SUCCESS",
            "message": f"Rate card '{rate_id}' updated successfully.",
            "data": updated_card
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update rate card: {str(e)}")
    finally:
        conn.close()


@router.get("/carriers", summary="List verified multimodal carrier services")
def list_carrier_services():
    """
    Returns list of verified carrier operators across Road, Marine, and Air.
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM carrier_services WHERE is_active = TRUE ORDER BY mode, reliability_score DESC;")
        rows = cur.fetchall()
        return {"status": "SUCCESS", "count": len(rows), "data": rows}
    finally:
        conn.close()
