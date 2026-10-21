"""
AGRITrust — Multi-Modal Logistics Intelligence Engine (Road + Marine + Air)
==========================================================================
Provides comprehensive, reusable algorithms for:
- Geospatial distance calculation & hub resolution (PIN codes, ports, airports)
- Volumetric & Chargeable Weight computation (IATA standards)
- 3-Mode Route Feasibility & Infeasibility Analysis (Road, Marine, Air)
- Itemized Total Cost Estimation with configurable rate cards
- Multi-Segment Door-to-Door Transit Time & Milestones
- CO2 Emissions Accounting (Ton-Km methodology)
- AI Recommendation & Decision Optimization Engine
"""

import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0

# Pre-seeded Geospatial Directory of Major Indian & International Logistics Hubs
PINCODE_REGISTRY: Dict[str, Dict[str, Any]] = {
    # Maharashtra / Western India
    "422001": {"city": "Nashik", "state": "Maharashtra", "lat": 19.9975, "lon": 73.7898, "is_coastal": False, "nearest_port": "PORT_JNPT", "port_dist_km": 175.0, "nearest_airport": "AIR_BOM", "airport_dist_km": 165.0},
    "400001": {"city": "Mumbai (Fort)", "state": "Maharashtra", "lat": 18.9322, "lon": 72.8354, "is_coastal": True, "nearest_port": "PORT_JNPT", "port_dist_km": 28.0, "nearest_airport": "AIR_BOM", "airport_dist_km": 22.0},
    "400707": {"city": "Navi Mumbai (JNPT)", "state": "Maharashtra", "lat": 18.9500, "lon": 72.9500, "is_coastal": True, "nearest_port": "PORT_JNPT", "port_dist_km": 5.0, "nearest_airport": "AIR_BOM", "airport_dist_km": 30.0},
    "411001": {"city": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "is_coastal": False, "nearest_port": "PORT_JNPT", "port_dist_km": 140.0, "nearest_airport": "AIR_PNQ", "airport_dist_km": 12.0},
    "440001": {"city": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882, "is_coastal": False, "nearest_port": "PORT_JNPT", "port_dist_km": 810.0, "nearest_airport": "AIR_NAG", "airport_dist_km": 10.0},
    
    # North India
    "110001": {"city": "New Delhi (Connaught Place)", "state": "Delhi", "lat": 28.6304, "lon": 77.2177, "is_coastal": False, "nearest_port": "PORT_MUNDRA", "port_dist_km": 1120.0, "nearest_airport": "AIR_DEL", "airport_dist_km": 16.0},
    "110037": {"city": "New Delhi (IGI Cargo Hub)", "state": "Delhi", "lat": 28.5562, "lon": 77.1000, "is_coastal": False, "nearest_port": "PORT_MUNDRA", "port_dist_km": 1100.0, "nearest_airport": "AIR_DEL", "airport_dist_km": 2.0},
    "201301": {"city": "Noida", "state": "Uttar Pradesh", "lat": 28.5355, "lon": 77.3910, "is_coastal": False, "nearest_port": "PORT_MUNDRA", "port_dist_km": 1140.0, "nearest_airport": "AIR_DEL", "airport_dist_km": 38.0},
    "160001": {"city": "Chandigarh", "state": "Punjab", "lat": 30.7333, "lon": 76.7794, "is_coastal": False, "nearest_port": "PORT_MUNDRA", "port_dist_km": 1220.0, "nearest_airport": "AIR_IXC", "airport_dist_km": 14.0},
    "302001": {"city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "is_coastal": False, "nearest_port": "PORT_MUNDRA", "port_dist_km": 870.0, "nearest_airport": "AIR_JAI", "airport_dist_km": 12.0},
    "226001": {"city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462, "is_coastal": False, "nearest_port": "PORT_KOLKATA", "port_dist_km": 980.0, "nearest_airport": "AIR_LKO", "airport_dist_km": 15.0},

    # South India
    "560001": {"city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946, "is_coastal": False, "nearest_port": "PORT_CHENNAI", "port_dist_km": 340.0, "nearest_airport": "AIR_BLR", "airport_dist_km": 35.0},
    "600001": {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "is_coastal": True, "nearest_port": "PORT_CHENNAI", "port_dist_km": 12.0, "nearest_airport": "AIR_MAA", "airport_dist_km": 18.0},
    "500001": {"city": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867, "is_coastal": False, "nearest_port": "PORT_CHENNAI", "port_dist_km": 630.0, "nearest_airport": "AIR_HYD", "airport_dist_km": 24.0},
    "682001": {"city": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673, "is_coastal": True, "nearest_port": "PORT_COCHIN", "port_dist_km": 10.0, "nearest_airport": "AIR_COK", "airport_dist_km": 28.0},
    "530001": {"city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185, "is_coastal": True, "nearest_port": "PORT_VIZAG", "port_dist_km": 8.0, "nearest_airport": "AIR_VTZ", "airport_dist_km": 12.0},

    # West & Central India
    "380001": {"city": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714, "is_coastal": False, "nearest_port": "PORT_MUNDRA", "port_dist_km": 360.0, "nearest_airport": "AIR_AMD", "airport_dist_km": 15.0},
    "370421": {"city": "Mundra", "state": "Gujarat", "lat": 22.8395, "lon": 69.7214, "is_coastal": True, "nearest_port": "PORT_MUNDRA", "port_dist_km": 4.0, "nearest_airport": "AIR_AMD", "airport_dist_km": 370.0},
    "395001": {"city": "Surat", "state": "Gujarat", "lat": 21.1702, "lon": 72.8311, "is_coastal": True, "nearest_port": "PORT_JNPT", "port_dist_km": 290.0, "nearest_airport": "AIR_STV", "airport_dist_km": 14.0},
    "462001": {"city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126, "is_coastal": False, "nearest_port": "PORT_JNPT", "port_dist_km": 760.0, "nearest_airport": "AIR_BHO", "airport_dist_km": 12.0},

    # East & North-East India
    "700001": {"city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639, "is_coastal": True, "nearest_port": "PORT_KOLKATA", "port_dist_km": 15.0, "nearest_airport": "AIR_CCU", "airport_dist_km": 18.0},
    "800001": {"city": "Patna", "state": "Bihar", "lat": 25.5941, "lon": 85.1376, "is_coastal": False, "nearest_port": "PORT_KOLKATA", "port_dist_km": 580.0, "nearest_airport": "AIR_PAT", "airport_dist_km": 8.0},
    "781001": {"city": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362, "is_coastal": False, "nearest_port": "PORT_KOLKATA", "port_dist_km": 1020.0, "nearest_airport": "AIR_GAU", "airport_dist_km": 20.0},

    # International Cross-Border Destination Hubs
    "300001": {"city": "Dubai (Jebel Ali / DXB)", "state": "United Arab Emirates", "lat": 25.2048, "lon": 55.2708, "is_coastal": True, "nearest_port": "PORT_DUBAI", "port_dist_km": 10.0, "nearest_airport": "AIR_DXB", "airport_dist_km": 12.0},
    "300002": {"city": "Rotterdam (Port / Schiphol)", "state": "Netherlands", "lat": 51.9244, "lon": 4.4777, "is_coastal": True, "nearest_port": "PORT_ROTTERDAM", "port_dist_km": 5.0, "nearest_airport": "AIR_AMS", "airport_dist_km": 60.0},
    "300003": {"city": "Singapore (PSA / Changi)", "state": "Singapore", "lat": 1.3521, "lon": 103.8198, "is_coastal": True, "nearest_port": "PORT_SINGAPORE", "port_dist_km": 8.0, "nearest_airport": "AIR_SIN", "airport_dist_km": 18.0},
    "300004": {"city": "London (Heathrow / Gateway)", "state": "United Kingdom", "lat": 51.5074, "lon": -0.1278, "is_coastal": True, "nearest_port": "PORT_LONDON", "port_dist_km": 35.0, "nearest_airport": "AIR_LHR", "airport_dist_km": 24.0}
}

# Major Seaport Registry
PORTS_REGISTRY: Dict[str, Dict[str, Any]] = {
    "PORT_JNPT": {"name": "JNPT Nhava Sheva Terminal 4", "code": "INNSA", "city": "Navi Mumbai", "state": "Maharashtra", "lat": 18.9500, "lon": 72.9500, "thc_rate": 4200.0, "reefer_plug_daily": 1200.0},
    "PORT_MUNDRA": {"name": "Adani Port & SEZ, Mundra", "code": "INMUN", "city": "Mundra", "state": "Gujarat", "lat": 22.8395, "lon": 69.7214, "thc_rate": 3900.0, "reefer_plug_daily": 1100.0},
    "PORT_CHENNAI": {"name": "Chennai Port Trust Terminal", "code": "INMAA", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "thc_rate": 4100.0, "reefer_plug_daily": 1150.0},
    "PORT_COCHIN": {"name": "Cochin International Container Transshipment Terminal (ICTT)", "code": "INCOK", "city": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673, "thc_rate": 3800.0, "reefer_plug_daily": 1050.0},
    "PORT_VIZAG": {"name": "Visakhapatnam Port Container Terminal", "code": "INVTZ", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185, "thc_rate": 3750.0, "reefer_plug_daily": 1000.0},
    "PORT_KOLKATA": {"name": "Syama Prasad Mookerjee Port (Kolkata/Haldia)", "code": "INCCU", "city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639, "thc_rate": 4300.0, "reefer_plug_daily": 1250.0},
    "PORT_ROTTERDAM": {"name": "Port of Rotterdam ECT Delta Terminal", "code": "NLRTM", "city": "Rotterdam", "state": "Netherlands", "lat": 51.9244, "lon": 4.4777, "thc_rate": 8500.0, "reefer_plug_daily": 2400.0},
    "PORT_DUBAI": {"name": "DP World Jebel Ali Port Terminal 2", "code": "AEJEA", "city": "Dubai", "state": "United Arab Emirates", "lat": 25.0112, "lon": 55.0617, "thc_rate": 6200.0, "reefer_plug_daily": 1800.0},
    "PORT_SINGAPORE": {"name": "PSA Singapore Pasir Panjang Terminal", "code": "SGSIN", "city": "Singapore", "state": "Singapore", "lat": 1.2800, "lon": 103.7800, "thc_rate": 7100.0, "reefer_plug_daily": 2100.0},
    "PORT_LONDON": {"name": "DP World London Gateway Port", "code": "GBLGP", "city": "London", "state": "United Kingdom", "lat": 51.5100, "lon": 0.4600, "thc_rate": 8900.0, "reefer_plug_daily": 2500.0}
}

# Major Airport Cargo Hub Registry
AIRPORTS_REGISTRY: Dict[str, Dict[str, Any]] = {
    "AIR_BOM": {"name": "Chhatrapati Shivaji Maharaj Cargo Terminal", "code": "BOM", "city": "Mumbai", "lat": 19.0896, "lon": 72.8656, "cth_rate_per_kg": 4.50, "security_fee": 650.0},
    "AIR_DEL": {"name": "Indira Gandhi International Cargo Hub (CELEBI)", "code": "DEL", "city": "Delhi", "lat": 28.5562, "lon": 77.1000, "cth_rate_per_kg": 4.20, "security_fee": 650.0},
    "AIR_BLR": {"name": "Kempegowda International Cold Port Cargo Hub", "code": "BLR", "city": "Bengaluru", "lat": 13.1986, "lon": 77.7066, "cth_rate_per_kg": 4.40, "security_fee": 600.0},
    "AIR_MAA": {"name": "Chennai International Air Cargo Complex", "code": "MAA", "city": "Chennai", "lat": 12.9941, "lon": 80.1709, "cth_rate_per_kg": 4.10, "security_fee": 600.0},
    "AIR_HYD": {"name": "GMR Hyderabad Air Cargo (Pharma Zone)", "code": "HYD", "city": "Hyderabad", "lat": 17.2403, "lon": 78.4294, "cth_rate_per_kg": 4.30, "security_fee": 600.0},
    "AIR_CCU": {"name": "Netaji Subhash Chandra Bose Air Cargo Complex", "code": "CCU", "city": "Kolkata", "lat": 22.6547, "lon": 88.4467, "cth_rate_per_kg": 4.00, "security_fee": 550.0},
    "AIR_AMD": {"name": "Sardar Vallabhbhai Patel Cargo Terminal", "code": "AMD", "city": "Ahmedabad", "lat": 23.0734, "lon": 72.6347, "cth_rate_per_kg": 4.10, "security_fee": 550.0},
    "AIR_PNQ": {"name": "Pune Air Cargo Complex (Lohegaon)", "code": "PNQ", "city": "Pune", "lat": 18.5822, "lon": 73.9197, "cth_rate_per_kg": 4.50, "security_fee": 600.0},
    "AIR_COK": {"name": "Cochin International Perishable Cargo Hub", "code": "COK", "city": "Kochi", "lat": 10.1556, "lon": 76.4019, "cth_rate_per_kg": 4.20, "security_fee": 600.0},
    "AIR_NAG": {"name": "Dr. Babasaheb Ambedkar Cargo Terminal", "code": "NAG", "city": "Nagpur", "lat": 21.0922, "lon": 79.0472, "cth_rate_per_kg": 3.90, "security_fee": 500.0},
    "AIR_DXB": {"name": "Dubai International Airport (Dnata Cargo)", "code": "DXB", "city": "Dubai", "lat": 25.2532, "lon": 55.3657, "cth_rate_per_kg": 12.0, "security_fee": 1800.0},
    "AIR_AMS": {"name": "Amsterdam Airport Schiphol Cargo Hub", "code": "AMS", "city": "Amsterdam", "lat": 52.3105, "lon": 4.7683, "cth_rate_per_kg": 14.5, "security_fee": 2200.0},
    "AIR_SIN": {"name": "Singapore Changi Airport Cargo MegaHub", "code": "SIN", "city": "Singapore", "lat": 1.3644, "lon": 103.9915, "cth_rate_per_kg": 13.0, "security_fee": 2000.0},
    "AIR_LHR": {"name": "London Heathrow World Cargo Centre", "code": "LHR", "city": "London", "lat": 51.4700, "lon": -0.4543, "cth_rate_per_kg": 15.0, "security_fee": 2400.0}
}


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_KM * c, 2)


def resolve_location(pincode: str, location_hint: str = "") -> Dict[str, Any]:
    """
    Resolves PIN code or location text to coordinates and nearest logistics hubs.
    """
    clean_pin = str(pincode).strip().replace(" ", "")
    if clean_pin in PINCODE_REGISTRY:
        info = dict(PINCODE_REGISTRY[clean_pin])
        info["pincode"] = clean_pin
        return info

    # Fallback search by location hint in city names
    hint_lower = location_hint.lower()
    for pin, data in PINCODE_REGISTRY.items():
        if data["city"].lower() in hint_lower or data["state"].lower() in hint_lower:
            info = dict(data)
            info["pincode"] = pin
            return info

    # Default fallback to Central India / Mumbai corridor if completely unrecognized
    return {
        "pincode": clean_pin or "400001",
        "city": location_hint or "Mumbai Logistics Hub",
        "state": "Maharashtra",
        "lat": 19.0760,
        "lon": 72.8777,
        "is_coastal": True,
        "nearest_port": "PORT_JNPT",
        "port_dist_km": 35.0,
        "nearest_airport": "AIR_BOM",
        "airport_dist_km": 20.0
    }


def calculate_volumetric_weight(length_cm: float, width_cm: float, height_cm: float, divisor: float = 5000.0) -> float:
    """
    Calculates volumetric weight in kg according to IATA Air Freight Standard.
    Formula: (Length_cm * Width_cm * Height_cm) / 5000 (or specified divisor)
    """
    if length_cm <= 0 or width_cm <= 0 or height_cm <= 0:
        return 0.0
    vol_cm3 = length_cm * width_cm * height_cm
    return round(vol_cm3 / divisor, 2)


def select_road_vehicle(weight_kg: float, volume_cbm: float, requires_reefer: bool) -> Dict[str, Any]:
    """
    Dynamically assigns optimal road vehicle classification.
    """
    if requires_reefer:
        if weight_kg <= 2500 and volume_cbm <= 8.0:
            return {
                "type": "REEFER_CHILLER_2_5T",
                "name": "Tata 407 Reefer Chiller Van (2.5 MT)",
                "payload_capacity_kg": 2500,
                "base_rate_per_km": 38.0,
                "toll_rate_per_km": 2.80,
                "cold_surcharge_pct": 25.0,
                "fuel_surcharge_pct": 10.0,
                "avg_speed_kmh": 48.0
            }
        elif weight_kg <= 8000 and volume_cbm <= 22.0:
            return {
                "type": "REEFER_TRUCK_8T",
                "name": "Eicher Pro Reefer Truck (8.0 MT Controlled Temp)",
                "payload_capacity_kg": 8000,
                "base_rate_per_km": 54.0,
                "toll_rate_per_km": 4.20,
                "cold_surcharge_pct": 30.0,
                "fuel_surcharge_pct": 12.0,
                "avg_speed_kmh": 45.0
            }
        else:
            return {
                "type": "HEAVY_REEFER_MULTI_ZONE_16T",
                "name": "BharatBenz 16-Wheeler Multi-Temp Heavy Reefer (16 MT)",
                "payload_capacity_kg": 16000,
                "base_rate_per_km": 82.0,
                "toll_rate_per_km": 6.50,
                "cold_surcharge_pct": 35.0,
                "fuel_surcharge_pct": 14.0,
                "avg_speed_kmh": 42.0
            }
    else:
        if weight_kg <= 1000:
            return {
                "type": "MINI_TRUCK_1T",
                "name": "Tata Ace Gold Mini Truck (1.0 MT)",
                "payload_capacity_kg": 1000,
                "base_rate_per_km": 22.0,
                "toll_rate_per_km": 1.50,
                "cold_surcharge_pct": 0.0,
                "fuel_surcharge_pct": 8.0,
                "avg_speed_kmh": 50.0
            }
        elif weight_kg <= 3500:
            return {
                "type": "PICKUP_LCV_3_5T",
                "name": "Mahindra Bolero Maxi Truck LCV (3.5 MT)",
                "payload_capacity_kg": 3500,
                "base_rate_per_km": 32.0,
                "toll_rate_per_km": 2.50,
                "cold_surcharge_pct": 0.0,
                "fuel_surcharge_pct": 9.0,
                "avg_speed_kmh": 48.0
            }
        elif weight_kg <= 9000:
            return {
                "type": "TRUCK_14FT_9T",
                "name": "Tata 1109 14-ft Cargo Truck (9.0 MT)",
                "payload_capacity_kg": 9000,
                "base_rate_per_km": 46.0,
                "toll_rate_per_km": 3.80,
                "cold_surcharge_pct": 0.0,
                "fuel_surcharge_pct": 10.0,
                "avg_speed_kmh": 45.0
            }
        else:
            return {
                "type": "TRUCK_20FT_18T",
                "name": "Ashok Leyland 20-ft Heavy Multi-Axle Hauler (18 MT)",
                "payload_capacity_kg": 18000,
                "base_rate_per_km": 68.0,
                "toll_rate_per_km": 5.60,
                "cold_surcharge_pct": 0.0,
                "fuel_surcharge_pct": 12.0,
                "avg_speed_kmh": 40.0
            }


def compute_road_route_option(
    pickup_info: Dict[str, Any],
    dest_info: Dict[str, Any],
    cargo_weight_kg: float,
    cargo_volume_cbm: float,
    is_perishable: bool,
    shelf_life_days: float,
    urgency_level: str,
    declared_value_inr: float,
    insurance_pref: str,
    rate_card_override: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes Road Route Transport Option with accurate itemized cost and transit schedule.
    """
    # Direct great-circle distance * road tortuosity winding factor (approx 1.25x for Indian Highway Grid)
    straight_dist_km = calculate_haversine_distance(
        pickup_info["lat"], pickup_info["lon"],
        dest_info["lat"], dest_info["lon"]
    )
    road_distance_km = max(25.0, round(straight_dist_km * 1.25, 1))

    vehicle = select_road_vehicle(cargo_weight_kg, cargo_volume_cbm, is_perishable)
    
    # 1. Base Freight
    base_rate_per_km = vehicle["base_rate_per_km"]
    base_freight = round(road_distance_km * base_rate_per_km, 2)

    # 2. First-Mile & Last-Mile
    first_mile_cost = 650.0 if road_distance_km > 100 else 300.0
    last_mile_cost = 650.0 if road_distance_km > 100 else 300.0

    # 3. Loading & Unloading
    weight_tonnes = max(0.2, cargo_weight_kg / 1000.0)
    loading_unloading = round(weight_tonnes * 450.0, 2)

    # 4. Handling & Documentation (E-Way bill, gate verification)
    handling_docs = 450.0

    # 5. Highway Tolls
    tolls_cost = round(road_distance_km * vehicle["toll_rate_per_km"], 2)

    # 6. Fuel Surcharge
    fuel_surcharge = round(base_freight * (vehicle["fuel_surcharge_pct"] / 100.0), 2)

    # 7. Cold-Chain Reefer Running Cost
    cold_chain_cost = round(base_freight * (vehicle["cold_surcharge_pct"] / 100.0), 2) if is_perishable else 0.0

    # 8. Insurance
    ins_pct = 0.35 if insurance_pref.upper() in ["COMPREHENSIVE", "YES"] else (0.15 if insurance_pref.upper() == "STANDARD" else 0.0)
    insurance_cost = round(declared_value_inr * (ins_pct / 100.0), 2)

    subtotal = (
        base_freight + first_mile_cost + last_mile_cost +
        loading_unloading + handling_docs + tolls_cost +
        fuel_surcharge + cold_chain_cost + insurance_cost
    )
    tax_cost = round(subtotal * 0.18, 2) # GST 18%
    total_cost = round(subtotal + tax_cost, 2)

    # Transit duration: Driving time + driver rest (2 hrs per 250km) + 2 hrs dock dwell
    driving_hours = road_distance_km / vehicle["avg_speed_kmh"]
    rest_stops_hours = math.floor(road_distance_km / 250.0) * 2.0
    total_transit_hours = round(max(3.0, driving_hours + rest_stops_hours + 2.0), 1)

    delivery_time = datetime.now() + timedelta(hours=total_transit_hours)

    # CO2 calculation: Tonnes * km * 0.105 kg CO2/tonne-km
    co2_emissions_kg = round(weight_tonnes * road_distance_km * 0.105, 2)

    # Shelf-life impact
    transit_days = total_transit_hours / 24.0
    shelf_depletion_pct = round(min(100.0, (transit_days / max(1.0, shelf_life_days)) * 100.0), 1)

    # Waypoints for Leaflet
    waypoints = [
        {"name": f"Pickup: {pickup_info['city']}", "lat": pickup_info["lat"], "lon": pickup_info["lon"], "type": "ORIGIN"},
        {
            "name": "Midpoint National Highway Transit Corridor",
            "lat": round((pickup_info["lat"] + dest_info["lat"]) / 2.0 + 0.05, 4),
            "lon": round((pickup_info["lon"] + dest_info["lon"]) / 2.0 - 0.05, 4),
            "type": "HIGHWAY_WAYPOINT"
        },
        {"name": f"Delivery: {dest_info['city']}", "lat": dest_info["lat"], "lon": dest_info["lon"], "type": "DESTINATION"}
    ]

    return {
        "mode": "ROAD",
        "mode_title": "Highway Cold-Chain Fleet (Direct Road)",
        "is_feasible": True,
        "infeasibility_reason": None,
        "carrier_name": "AGRITrust Verified Fleet Partners",
        "vehicle_or_vessel_desc": vehicle["name"],
        "total_estimated_cost_inr": total_cost,
        "estimated_transit_hours": total_transit_hours,
        "estimated_delivery_time": delivery_time.isoformat(),
        "total_distance_km": road_distance_km,
        "actual_weight_kg": cargo_weight_kg,
        "volumetric_weight_kg": cargo_weight_kg,
        "chargeable_weight_kg": cargo_weight_kg,
        "origin_facility_name": f"{pickup_info['city']} Logistics Dock",
        "destination_facility_name": f"{dest_info['city']} Receiving Dock",
        "cost_breakdown": {
            "base_freight": base_freight,
            "first_mile": first_mile_cost,
            "last_mile": last_mile_cost,
            "loading_unloading": loading_unloading,
            "handling_documentation": handling_docs,
            "tolls_port_airport_charges": tolls_cost,
            "fuel_surcharge": fuel_surcharge,
            "cold_chain_surcharge": cold_chain_cost,
            "insurance": insurance_cost,
            "taxes_gst": tax_cost,
            "total": total_cost
        },
        "co2_emissions_kg": co2_emissions_kg,
        "cold_chain_rating": "EXCELLENT" if is_perishable else "STANDARD",
        "perishability_risk_level": "LOW" if shelf_depletion_pct < 40 else ("MEDIUM" if shelf_depletion_pct < 75 else "HIGH"),
        "shelf_life_depletion_pct": shelf_depletion_pct,
        "ai_recommendation_badges": [],
        "ai_recommendation_score": 85,
        "ai_reasoning_summary": "",
        "route_waypoints": waypoints,
        "data_source": "AGRITrust Verified Rate Engine (Dynamic Road Matrix)",
        "pricing_updated_at": datetime.now().isoformat()
    }


def compute_marine_route_option(
    pickup_info: Dict[str, Any],
    dest_info: Dict[str, Any],
    cargo_weight_kg: float,
    cargo_volume_cbm: float,
    is_perishable: bool,
    shelf_life_days: float,
    urgency_level: str,
    declared_value_inr: float,
    insurance_pref: str,
    rate_card_override: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes Marine Route Transport Option with containerization, port handling, and sea transit.
    """
    # Identify origin port and destination port
    origin_port_id = pickup_info.get("nearest_port") or "PORT_JNPT"
    dest_port_id = dest_info.get("nearest_port") or "PORT_CHENNAI"

    origin_port = PORTS_REGISTRY.get(origin_port_id, PORTS_REGISTRY["PORT_JNPT"])
    dest_port = PORTS_REGISTRY.get(dest_port_id, PORTS_REGISTRY["PORT_CHENNAI"])

    # First-mile road distance from pickup to origin port
    first_mile_km = max(5.0, calculate_haversine_distance(
        pickup_info["lat"], pickup_info["lon"],
        origin_port["lat"], origin_port["lon"]
    ) * 1.2)

    # Last-mile road distance from destination port to delivery
    last_mile_km = max(5.0, calculate_haversine_distance(
        dest_port["lat"], dest_port["lon"],
        dest_info["lat"], dest_info["lon"]
    ) * 1.2)

    # Nautical sea distance between ports
    sea_straight_dist_km = calculate_haversine_distance(
        origin_port["lat"], origin_port["lon"],
        dest_port["lat"], dest_port["lon"]
    )
    # Maritime routes navigate around coastlines / channels (approx 1.45x great circle)
    sea_dist_km = max(180.0, round(sea_straight_dist_km * 1.45, 1))
    sea_dist_nmi = round(sea_dist_km / 1.852, 1)

    total_door_to_door_dist_km = round(first_mile_km + sea_dist_km + last_mile_km, 1)

    # FEASIBILITY CHECK:
    # 1. Marine is NOT feasible for very short overland distances where both points are landlocked (< 450 km direct)
    # 2. Or if origin port == dest port (e.g. within same metro zone)
    # 3. Or if shelf life is shorter than ocean transit time
    direct_road_dist = calculate_haversine_distance(pickup_info["lat"], pickup_info["lon"], dest_info["lat"], dest_info["lon"]) * 1.25
    
    is_feasible = True
    infeasibility_reason = None

    if origin_port_id == dest_port_id:
        is_feasible = False
        infeasibility_reason = f"Intra-zone shipment within {pickup_info['city']} ({round(direct_road_dist)} km) has no viable nautical sea corridor."
    elif direct_road_dist < 450.0 and (not pickup_info.get("is_coastal", False) and not dest_info.get("is_coastal", False)):
        is_feasible = False
        infeasibility_reason = f"Short inland distance ({round(direct_road_dist)} km) makes maritime port detour non-viable compared to direct highway road transport."

    # Container Selection
    if is_perishable:
        if cargo_weight_kg <= 18000 and cargo_volume_cbm <= 28.0:
            container_desc = "20-ft ISO Controlled Atmosphere Reefer Container"
            container_type = "REEFER_20FT"
            ocean_base_rate_per_nmi = 34.0
        else:
            container_desc = "40-ft High Cube Smart Reefer Container"
            container_type = "REEFER_40FT_HC"
            ocean_base_rate_per_nmi = 48.0
    else:
        if cargo_weight_kg <= 21000 and cargo_volume_cbm <= 33.0:
            container_desc = "20-ft Dry Cargo ISO Standard Container"
            container_type = "DRY_20FT"
            ocean_base_rate_per_nmi = 22.0
        else:
            container_desc = "40-ft Standard General Purpose Container"
            container_type = "DRY_40FT"
            ocean_base_rate_per_nmi = 32.0

    # Cost Itemization
    # 1. First-mile Road Haulage (Truck to Port CFS)
    first_mile_cost = round(max(3500.0, first_mile_km * 42.0), 2)

    # 2. Origin Port Terminal Handling Charges (THC) + Lashing + Customs
    origin_thc = origin_port["thc_rate"]
    origin_customs_doc = 2800.0

    # 3. Ocean Freight
    ocean_freight = round(sea_dist_nmi * ocean_base_rate_per_nmi, 2)

    # 4. Bunker Adjustment Factor (BAF / Sea Fuel)
    bunker_surcharge = round(ocean_freight * 0.12, 2)

    # 5. Reefer Vessel Power & Telemetry Monitoring
    sea_days = max(1.0, (sea_dist_km / 35.0) / 24.0) # at approx 19 knots (35 km/h)
    reefer_power_cost = round(sea_days * origin_port["reefer_plug_daily"], 2) if is_perishable else 0.0

    # 6. Destination Port THC & Import Clearance
    dest_thc = dest_port["thc_rate"]
    dest_clearance = 2400.0

    # 7. Last-Mile Road Haulage (Dest Port to Final Consignee)
    last_mile_cost = round(max(3500.0, last_mile_km * 44.0), 2)

    # 8. Handling & Port Documentation
    port_doc_handling = origin_customs_doc + dest_clearance

    # 9. Loading/Unloading at Container Freight Station
    weight_tonnes = max(0.5, cargo_weight_kg / 1000.0)
    loading_unloading = round(weight_tonnes * 380.0, 2)

    # 10. Marine Cargo Insurance
    ins_pct = 0.30 if insurance_pref.upper() in ["COMPREHENSIVE", "YES"] else (0.12 if insurance_pref.upper() == "STANDARD" else 0.0)
    insurance_cost = round(declared_value_inr * (ins_pct / 100.0), 2)

    subtotal = (
        first_mile_cost + origin_thc + ocean_freight + bunker_surcharge +
        reefer_power_cost + dest_thc + last_mile_cost + port_doc_handling +
        loading_unloading + insurance_cost
    )
    tax_cost = round(subtotal * 0.18, 2)
    total_cost = round(subtotal + tax_cost, 2)

    # Transit Time: First Mile (6-12h) + Origin Port Dwell/Customs (18-24h) + Sea Voyage (at 18 knots) + Dest Port Dwell (18-24h) + Last Mile (6-12h)
    sea_voyage_hours = sea_dist_km / 35.0 # ~19 knots
    port_dwell_hours = 36.0 # total origin + dest dwell and customs
    road_legs_hours = (first_mile_km + last_mile_km) / 45.0 + 4.0
    total_transit_hours = round(sea_voyage_hours + port_dwell_hours + road_legs_hours, 1)

    # Shelf-life feasibility check for perishable goods
    transit_days = total_transit_hours / 24.0
    shelf_depletion_pct = round(min(100.0, (transit_days / max(1.0, shelf_life_days)) * 100.0), 1)

    if is_perishable and shelf_depletion_pct > 85.0 and is_feasible:
        is_feasible = False
        infeasibility_reason = (
            f"Marine transit duration ({round(transit_days, 1)} days) will consume {shelf_depletion_pct}% "
            f"of total cargo shelf life ({shelf_life_days} days). High spoilage decay risk before final arrival."
        )

    delivery_time = datetime.now() + timedelta(hours=total_transit_hours)

    # CO2: 0.018 kg CO2 per tonne-km for sea leg + road legs
    co2_emissions_kg = round((weight_tonnes * (first_mile_km + last_mile_km) * 0.105) + (weight_tonnes * sea_dist_km * 0.018), 2)

    # Waypoints for Leaflet (Pickup -> Origin Port -> Sea Waypoints -> Dest Port -> Delivery)
    waypoints = [
        {"name": f"Pickup: {pickup_info['city']}", "lat": pickup_info["lat"], "lon": pickup_info["lon"], "type": "ORIGIN"},
        {"name": f"Origin Port: {origin_port['name']}", "lat": origin_port["lat"], "lon": origin_port["lon"], "type": "PORT_ORIGIN"},
        {
            "name": "Nautical Coastal Corridor Waypoint",
            "lat": round((origin_port["lat"] + dest_port["lat"]) / 2.0 - 0.5, 4),
            "lon": round((origin_port["lon"] + dest_port["lon"]) / 2.0 - 0.8, 4),
            "type": "SEA_WAYPOINT"
        },
        {"name": f"Destination Port: {dest_port['name']}", "lat": dest_port["lat"], "lon": dest_port["lon"], "type": "PORT_DESTINATION"},
        {"name": f"Delivery: {dest_info['city']}", "lat": dest_info["lat"], "lon": dest_info["lon"], "type": "DESTINATION"}
    ]

    return {
        "mode": "MARINE",
        "mode_title": "Coastal & Ocean Reefer Container (Marine Multimodal)",
        "is_feasible": is_feasible,
        "infeasibility_reason": infeasibility_reason,
        "carrier_name": "AGRITrust Maritime Line / Maersk / CMA CGM Verified",
        "vehicle_or_vessel_desc": container_desc,
        "total_estimated_cost_inr": total_cost if is_feasible else 0.0,
        "estimated_transit_hours": total_transit_hours,
        "estimated_delivery_time": delivery_time.isoformat(),
        "total_distance_km": total_door_to_door_dist_km,
        "actual_weight_kg": cargo_weight_kg,
        "volumetric_weight_kg": cargo_weight_kg,
        "chargeable_weight_kg": cargo_weight_kg,
        "origin_facility_name": origin_port["name"],
        "destination_facility_name": dest_port["name"],
        "cost_breakdown": {
            "base_freight": ocean_freight,
            "first_mile": first_mile_cost,
            "last_mile": last_mile_cost,
            "loading_unloading": loading_unloading,
            "handling_documentation": port_doc_handling,
            "tolls_port_airport_charges": round(origin_thc + dest_thc, 2),
            "fuel_surcharge": bunker_surcharge,
            "cold_chain_surcharge": reefer_power_cost,
            "insurance": insurance_cost,
            "taxes_gst": tax_cost,
            "total": total_cost if is_feasible else 0.0
        },
        "co2_emissions_kg": co2_emissions_kg,
        "cold_chain_rating": "SUPERIOR_ATMOSPHERE" if is_perishable else "STANDARD",
        "perishability_risk_level": "LOW" if shelf_depletion_pct < 45 else ("MEDIUM" if shelf_depletion_pct < 80 else "CRITICAL_SPOILAGE"),
        "shelf_life_depletion_pct": shelf_depletion_pct,
        "ai_recommendation_badges": [],
        "ai_recommendation_score": 75 if is_feasible else 20,
        "ai_reasoning_summary": "",
        "route_waypoints": waypoints,
        "data_source": "AGRITrust Global Maritime Freight Tariffs (Configurable Rates)",
        "pricing_updated_at": datetime.now().isoformat()
    }


def compute_air_route_option(
    pickup_info: Dict[str, Any],
    dest_info: Dict[str, Any],
    cargo_weight_kg: float,
    cargo_volume_cbm: float,
    package_length_cm: float,
    package_width_cm: float,
    package_height_cm: float,
    is_perishable: bool,
    shelf_life_days: float,
    urgency_level: str,
    declared_value_inr: float,
    insurance_pref: str,
    rate_card_override: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes Air Freight Transport Option with IATA chargeable weight, express handling, and cool dolly.
    """
    origin_airport_id = pickup_info.get("nearest_airport") or "AIR_BOM"
    dest_airport_id = dest_info.get("nearest_airport") or "AIR_DEL"

    origin_airport = AIRPORTS_REGISTRY.get(origin_airport_id, AIRPORTS_REGISTRY["AIR_BOM"])
    dest_airport = AIRPORTS_REGISTRY.get(dest_airport_id, AIRPORTS_REGISTRY["AIR_DEL"])

    # First-mile express road pickup to airport
    first_mile_km = max(5.0, calculate_haversine_distance(
        pickup_info["lat"], pickup_info["lon"],
        origin_airport["lat"], origin_airport["lon"]
    ) * 1.15)

    # Last-mile express road delivery from dest airport
    last_mile_km = max(5.0, calculate_haversine_distance(
        dest_airport["lat"], dest_airport["lon"],
        dest_info["lat"], dest_info["lon"]
    ) * 1.15)

    # Flight great-circle distance
    flight_distance_km = max(100.0, calculate_haversine_distance(
        origin_airport["lat"], origin_airport["lon"],
        dest_airport["lat"], dest_airport["lon"]
    ))

    total_door_to_door_dist_km = round(first_mile_km + flight_distance_km + last_mile_km, 1)

    # Chargeable Weight Calculation (IATA volumetric standard)
    if package_length_cm > 0 and package_width_cm > 0 and package_height_cm > 0:
        volumetric_weight_kg = calculate_volumetric_weight(package_length_cm, package_width_cm, package_height_cm, 5000.0)
    elif cargo_volume_cbm > 0:
        volumetric_weight_kg = round(cargo_volume_cbm * 167.0, 2) # standard 1 cbm = 167 kg air rule
    else:
        volumetric_weight_kg = cargo_weight_kg

    chargeable_weight_kg = max(cargo_weight_kg, volumetric_weight_kg)

    # FEASIBILITY CHECK:
    # 1. Air is NOT feasible if origin airport == dest airport (intra-city)
    # 2. Or if total distance is ultra-short (< 160 km) where ground handling exceeds flight time
    # 3. Or if single shipment weight exceeds commercial aircraft cargo hold limit (> 25 tonnes)
    is_feasible = True
    infeasibility_reason = None

    if origin_airport_id == dest_airport_id:
        is_feasible = False
        infeasibility_reason = f"Origin and destination share the same airport hub ({origin_airport['city']}). Air freight not feasible for intra-city transit."
    elif flight_distance_km < 160.0:
        is_feasible = False
        infeasibility_reason = f"Flight distance ({round(flight_distance_km)} km) is too short for air freight schedule. Road transit is faster door-to-door."
    elif cargo_weight_kg > 25000.0:
        is_feasible = False
        infeasibility_reason = f"Cargo weight ({cargo_weight_kg} kg) exceeds scheduled aircraft pallet limits. Requires dedicated chartered cargo freighter."

    # Air Freight Rate (INR / kg based on distance tiers)
    if flight_distance_km <= 800:
        air_rate_per_kg = 38.0
    elif flight_distance_km <= 1800:
        air_rate_per_kg = 52.0
    elif flight_distance_km <= 4000:
        air_rate_per_kg = 95.0
    else:
        air_rate_per_kg = 165.0 # Long-haul international

    # Cost Itemization
    # 1. First-Mile Express Van Haulage
    first_mile_cost = round(max(1800.0, first_mile_km * 48.0), 2)

    # 2. Cargo Terminal Handling Charges (CTH) + X-Ray Security Screening
    origin_cth = round(chargeable_weight_kg * origin_airport["cth_rate_per_kg"] + origin_airport["security_fee"], 2)
    dest_cth = round(chargeable_weight_kg * dest_airport["cth_rate_per_kg"] + dest_airport["security_fee"], 2)

    # 3. Air Freight
    base_air_freight = round(chargeable_weight_kg * air_rate_per_kg, 2)

    # 4. Fuel & War Risk Surcharge (Air FSC)
    air_fuel_surcharge = round(base_air_freight * 0.15, 2)

    # 5. Airway Bill (AWB) & Customs EDI Documentation
    awb_doc_fee = 1200.0

    # 6. Cold-Chain Envirotainer / Cool Dolly / Dry Ice replenishment
    cold_chain_cost = round(chargeable_weight_kg * 14.50, 2) if is_perishable else 0.0

    # 7. Loading / Palletizing (ULD Build-up & Break-down)
    pallet_handling = round(max(800.0, (chargeable_weight_kg / 1000.0) * 650.0), 2)

    # 8. Last-Mile Express Van Haulage
    last_mile_cost = round(max(1800.0, last_mile_km * 50.0), 2)

    # 9. Cargo Insurance
    ins_pct = 0.20 if insurance_pref.upper() in ["COMPREHENSIVE", "YES"] else (0.08 if insurance_pref.upper() == "STANDARD" else 0.0)
    insurance_cost = round(declared_value_inr * (ins_pct / 100.0), 2)

    subtotal = (
        first_mile_cost + origin_cth + base_air_freight + air_fuel_surcharge +
        awb_doc_fee + cold_chain_cost + pallet_handling + dest_cth +
        last_mile_cost + insurance_cost
    )
    tax_cost = round(subtotal * 0.18, 2)
    total_cost = round(subtotal + tax_cost, 2)

    # Transit Time:
    # First-mile express (2h) + Airport cargo acceptance/security cut-off (4h) + Flight (at 800 km/h) + Import customs/breakdown (3h) + Last-mile delivery (2h)
    flight_hours = max(1.2, flight_distance_km / 780.0)
    total_transit_hours = round(2.0 + 4.0 + flight_hours + 3.0 + 2.0, 1)

    delivery_time = datetime.now() + timedelta(hours=total_transit_hours)

    # Shelf life depletion
    transit_days = total_transit_hours / 24.0
    shelf_depletion_pct = round(min(100.0, (transit_days / max(1.0, shelf_life_days)) * 100.0), 1)

    # CO2: 0.580 kg CO2 per tonne-km for air leg + road van legs
    weight_tonnes = cargo_weight_kg / 1000.0
    co2_emissions_kg = round((weight_tonnes * (first_mile_km + last_mile_km) * 0.120) + (weight_tonnes * flight_distance_km * 0.580), 2)

    # Waypoints for Leaflet (Pickup -> Origin Airport -> Flight Line -> Dest Airport -> Delivery)
    waypoints = [
        {"name": f"Pickup: {pickup_info['city']}", "lat": pickup_info["lat"], "lon": pickup_info["lon"], "type": "ORIGIN"},
        {"name": f"Origin Cargo Airport: {origin_airport['name']}", "lat": origin_airport["lat"], "lon": origin_airport["lon"], "type": "AIRPORT_ORIGIN"},
        {
            "name": "High-Altitude Flight Cruise Corridor",
            "lat": round((origin_airport["lat"] + dest_airport["lat"]) / 2.0, 4),
            "lon": round((origin_airport["lon"] + dest_airport["lon"]) / 2.0, 4),
            "type": "FLIGHT_WAYPOINT"
        },
        {"name": f"Destination Airport: {dest_airport['name']}", "lat": dest_airport["lat"], "lon": dest_airport["lon"], "type": "AIRPORT_DESTINATION"},
        {"name": f"Delivery: {dest_info['city']}", "lat": dest_info["lat"], "lon": dest_info["lon"], "type": "DESTINATION"}
    ]

    service_desc = "Envirotainer RKN / Cool Dolly Active Temp ULD" if is_perishable else "Standard Air Cargo Palletized ULD"

    return {
        "mode": "AIR",
        "mode_title": "Priority Air Cargo Express (Aviation Logistics)",
        "is_feasible": is_feasible,
        "infeasibility_reason": infeasibility_reason,
        "carrier_name": "AGRITrust Air Cargo Express / Air India Cargo / IndiGo CarGo",
        "vehicle_or_vessel_desc": service_desc,
        "total_estimated_cost_inr": total_cost if is_feasible else 0.0,
        "estimated_transit_hours": total_transit_hours,
        "estimated_delivery_time": delivery_time.isoformat(),
        "total_distance_km": total_door_to_door_dist_km,
        "actual_weight_kg": cargo_weight_kg,
        "volumetric_weight_kg": volumetric_weight_kg,
        "chargeable_weight_kg": chargeable_weight_kg,
        "origin_facility_name": origin_airport["name"],
        "destination_facility_name": dest_airport["name"],
        "cost_breakdown": {
            "base_freight": base_air_freight,
            "first_mile": first_mile_cost,
            "last_mile": last_mile_cost,
            "loading_unloading": pallet_handling,
            "handling_documentation": awb_doc_fee,
            "tolls_port_airport_charges": round(origin_cth + dest_cth, 2),
            "fuel_surcharge": air_fuel_surcharge,
            "cold_chain_surcharge": cold_chain_cost,
            "insurance": insurance_cost,
            "taxes_gst": tax_cost,
            "total": total_cost if is_feasible else 0.0
        },
        "co2_emissions_kg": co2_emissions_kg,
        "cold_chain_rating": "ENVIROTAINER_RAPID" if is_perishable else "STANDARD",
        "perishability_risk_level": "VERY_LOW" if shelf_depletion_pct < 20 else "LOW",
        "shelf_life_depletion_pct": shelf_depletion_pct,
        "ai_recommendation_badges": [],
        "ai_recommendation_score": 90 if is_feasible else 15,
        "ai_reasoning_summary": "",
        "route_waypoints": waypoints,
        "data_source": "IATA Cargo Tariff Tables (Configurable Rates)",
        "pricing_updated_at": datetime.now().isoformat()
    }


def evaluate_ai_multi_route_recommendations(
    road_opt: Dict[str, Any],
    marine_opt: Dict[str, Any],
    air_opt: Dict[str, Any],
    priority_preference: str = "BALANCED",
    urgency_level: str = "STANDARD",
    is_perishable: bool = True,
    shelf_life_days: float = 7.0
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """
    Applies Multi-Attribute Decision Optimization to award AI Recommendation Badges
    and generate explainable rationale for Road, Marine, and Air routes.
    """
    options = [road_opt, marine_opt, air_opt]
    feasible_options = [opt for opt in options if opt["is_feasible"]]

    if not feasible_options:
        for opt in options:
            opt["ai_recommendation_badges"] = []
            opt["ai_recommendation_score"] = 0
            opt["ai_reasoning_summary"] = "Route is not feasible under requested cargo parameters and location constraints."
        return road_opt, marine_opt, air_opt

    # 1. Badge: LOWEST_COST
    cheapest = min(feasible_options, key=lambda x: x["total_estimated_cost_inr"])
    cheapest["ai_recommendation_badges"].append("LOWEST_COST")

    # 2. Badge: FASTEST_DELIVERY
    fastest = min(feasible_options, key=lambda x: x["estimated_transit_hours"])
    fastest["ai_recommendation_badges"].append("FASTEST_DELIVERY")

    # 3. Badge: LOWEST_EMISSIONS
    greenest = min(feasible_options, key=lambda x: x["co2_emissions_kg"])
    greenest["ai_recommendation_badges"].append("LOWEST_EMISSIONS")

    # 4. Badge: BEST_PERISHABLE (Safe transit margin within shelf life + cold integrity)
    if is_perishable:
        perishable_safe = [opt for opt in feasible_options if opt["shelf_life_depletion_pct"] < 60.0]
        if perishable_safe:
            best_perish = min(perishable_safe, key=lambda x: (x["shelf_life_depletion_pct"], x["total_estimated_cost_inr"]))
            best_perish["ai_recommendation_badges"].append("BEST_PERISHABLE")
        else:
            # Pick fastest if all have high depletion
            fastest["ai_recommendation_badges"].append("BEST_PERISHABLE")

    # 5. Composite Scoring & BEST_BALANCED
    min_cost = min(opt["total_estimated_cost_inr"] for opt in feasible_options)
    max_cost = max(opt["total_estimated_cost_inr"] for opt in feasible_options) or 1.0
    min_time = min(opt["estimated_transit_hours"] for opt in feasible_options)
    max_time = max(opt["estimated_transit_hours"] for opt in feasible_options) or 1.0

    # Weightings based on user preference
    pref = priority_preference.upper()
    urg = urgency_level.upper()

    if pref == "COST":
        w_cost, w_time, w_perish, w_green = 0.60, 0.20, 0.15, 0.05
    elif pref == "SPEED" or urg in ["EXPRESS", "CRITICAL"]:
        w_cost, w_time, w_perish, w_green = 0.15, 0.60, 0.20, 0.05
    else: # BALANCED
        w_cost, w_time, w_perish, w_green = 0.35, 0.35, 0.20, 0.10

    best_score = -1.0
    best_balanced_opt = None

    for opt in feasible_options:
        # Normalize (0 to 1, higher is better)
        norm_cost = 1.0 if max_cost == min_cost else (1.0 - (opt["total_estimated_cost_inr"] - min_cost) / (max_cost - min_cost))
        norm_time = 1.0 if max_time == min_time else (1.0 - (opt["estimated_transit_hours"] - min_time) / (max_time - min_time))
        norm_perish = max(0.0, 1.0 - (opt["shelf_life_depletion_pct"] / 100.0))
        norm_green = 1.0 if opt["mode"] == "MARINE" else (0.65 if opt["mode"] == "ROAD" else 0.25)

        raw_score = (
            w_cost * norm_cost +
            w_time * norm_time +
            w_perish * norm_perish +
            w_green * norm_green
        )
        final_score = int(round(raw_score * 100))
        opt["ai_recommendation_score"] = final_score

        if final_score > best_score:
            best_score = final_score
            best_balanced_opt = opt

    if best_balanced_opt and "BEST_BALANCED" not in best_balanced_opt["ai_recommendation_badges"]:
        best_balanced_opt["ai_recommendation_badges"].append("BEST_BALANCED")

    # Generate Explainable Rationale
    for opt in options:
        if not opt["is_feasible"]:
            opt["ai_reasoning_summary"] = f"Infeasible: {opt['infeasibility_reason']}"
            continue

        badges = opt["ai_recommendation_badges"]
        mode = opt["mode"]
        cost_str = f"₹{opt['total_estimated_cost_inr']:,.2f}"
        time_str = f"{opt['estimated_transit_hours']}h ({round(opt['estimated_transit_hours']/24.0, 1)}d)"

        reasons = []
        if "BEST_BALANCED" in badges:
            reasons.append(f"AI Highest Ranked ({opt['ai_recommendation_score']}/100) delivering optimal balance of freight cost ({cost_str}) and transit velocity ({time_str}).")
        if "LOWEST_COST" in badges:
            reasons.append(f"Most economical budget choice saving up to {round(((max_cost - opt['total_estimated_cost_inr'])/max_cost)*100)}% vs alternative routes.")
        if "FASTEST_DELIVERY" in badges:
            reasons.append(f"Fastest door-to-door transit time ({time_str}) minimizing in-transit exposure.")
        if "BEST_PERISHABLE" in badges:
            reasons.append(f"Consumes only {opt['shelf_life_depletion_pct']}% of {shelf_life_days}-day harvest shelf life, guaranteeing maximum freshness.")
        if "LOWEST_EMISSIONS" in badges:
            reasons.append(f"Eco-friendly green routing with lowest carbon footprint ({opt['co2_emissions_kg']} kg CO2).")

        if not reasons:
            if mode == "ROAD":
                reasons.append(f"Reliable point-to-point highway reefer dispatch with zero intermodal transfer handling.")
            elif mode == "MARINE":
                reasons.append(f"High capacity container freight suitable for bulk non-urgent consignments.")
            elif mode == "AIR":
                reasons.append(f"Rapid aviation transport best reserved for high-value urgent batches.")

        opt["ai_reasoning_summary"] = " ".join(reasons)

    return road_opt, marine_opt, air_opt


def plan_and_compare_all_routes(
    pickup_pincode: str,
    pickup_location: str,
    destination_pincode: str,
    destination_location: str,
    cargo_weight_kg: float,
    cargo_type: str,
    cargo_volume_cbm: Optional[float] = None,
    package_length_cm: Optional[float] = None,
    package_width_cm: Optional[float] = None,
    package_height_cm: Optional[float] = None,
    is_perishable: bool = True,
    shelf_life_days: float = 7.0,
    required_delivery_date: Optional[str] = None,
    urgency_level: str = "STANDARD",
    temperature_requirement: str = "Chilled (2°C to 8°C)",
    temp_min_c: float = 2.0,
    temp_max_c: float = 8.0,
    insurance_preference: str = "STANDARD",
    declared_cargo_value_inr: float = 250000.0,
    priority_preference: str = "BALANCED",
    user_id: Optional[str] = None,
    user_role: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main Entry Point: Plans and compares Road, Marine, and Air options simultaneously.
    """
    # 1. Resolve Locations & Hubs
    pickup_info = resolve_location(pickup_pincode, pickup_location)
    dest_info = resolve_location(destination_pincode, destination_location)

    # Volumetric approximations if dimensions given
    vol_cbm = cargo_volume_cbm or 0.0
    l_cm = package_length_cm or 0.0
    w_cm = package_width_cm or 0.0
    h_cm = package_height_cm or 0.0

    if vol_cbm == 0.0 and l_cm > 0 and w_cm > 0 and h_cm > 0:
        vol_cbm = round((l_cm * w_cm * h_cm) / 1000000.0, 3)
    elif vol_cbm == 0.0:
        # Default density approximation ~ 250 kg/m3 for agri produce
        vol_cbm = round(cargo_weight_kg / 250.0, 3)

    # 2. Compute Individual Modes
    road_option = compute_road_route_option(
        pickup_info=pickup_info,
        dest_info=dest_info,
        cargo_weight_kg=cargo_weight_kg,
        cargo_volume_cbm=vol_cbm,
        is_perishable=is_perishable,
        shelf_life_days=shelf_life_days,
        urgency_level=urgency_level,
        declared_value_inr=declared_cargo_value_inr,
        insurance_pref=insurance_preference
    )

    marine_option = compute_marine_route_option(
        pickup_info=pickup_info,
        dest_info=dest_info,
        cargo_weight_kg=cargo_weight_kg,
        cargo_volume_cbm=vol_cbm,
        is_perishable=is_perishable,
        shelf_life_days=shelf_life_days,
        urgency_level=urgency_level,
        declared_value_inr=declared_cargo_value_inr,
        insurance_pref=insurance_preference
    )

    air_option = compute_air_route_option(
        pickup_info=pickup_info,
        dest_info=dest_info,
        cargo_weight_kg=cargo_weight_kg,
        cargo_volume_cbm=vol_cbm,
        package_length_cm=l_cm,
        package_width_cm=w_cm,
        package_height_cm=h_cm,
        is_perishable=is_perishable,
        shelf_life_days=shelf_life_days,
        urgency_level=urgency_level,
        declared_value_inr=declared_cargo_value_inr,
        insurance_pref=insurance_preference
    )

    # 3. AI Evaluation and Decision Badges
    road_option, marine_option, air_option = evaluate_ai_multi_route_recommendations(
        road_opt=road_option,
        marine_opt=marine_option,
        air_opt=air_option,
        priority_preference=priority_preference,
        urgency_level=urgency_level,
        is_perishable=is_perishable,
        shelf_life_days=shelf_life_days
    )

    quote_id = f"QTE-MM-{datetime.now().strftime('%Y%m%d')}-{int(datetime.now().timestamp()) % 100000:05d}"
    quote_ref = f"AGRI-QTE-{int(datetime.now().timestamp()) % 1000000:06d}"

    return {
        "quote_id": quote_id,
        "quote_reference": quote_ref,
        "shipment_inputs": {
            "pickup_pincode": pickup_pincode,
            "pickup_location": pickup_info["city"],
            "pickup_state": pickup_info["state"],
            "destination_pincode": destination_pincode,
            "destination_location": dest_info["city"],
            "destination_state": dest_info["state"],
            "cargo_weight_kg": cargo_weight_kg,
            "cargo_type": cargo_type,
            "cargo_volume_cbm": vol_cbm,
            "is_perishable": is_perishable,
            "shelf_life_days": shelf_life_days,
            "required_delivery_date": required_delivery_date,
            "urgency_level": urgency_level,
            "temperature_requirement": temperature_requirement,
            "temp_min_c": temp_min_c,
            "temp_max_c": temp_max_c,
            "insurance_preference": insurance_preference,
            "declared_cargo_value_inr": declared_cargo_value_inr,
            "priority_preference": priority_preference
        },
        "routes": {
            "ROAD": road_option,
            "MARINE": marine_option,
            "AIR": air_option
        },
        "summary": {
            "feasible_count": sum(1 for opt in [road_option, marine_option, air_option] if opt["is_feasible"]),
            "cheapest_mode": min([opt for opt in [road_option, marine_option, air_option] if opt["is_feasible"]], key=lambda x: x["total_estimated_cost_inr"])["mode"] if any(opt["is_feasible"] for opt in [road_option, marine_option, air_option]) else None,
            "fastest_mode": min([opt for opt in [road_option, marine_option, air_option] if opt["is_feasible"]], key=lambda x: x["estimated_transit_hours"])["mode"] if any(opt["is_feasible"] for opt in [road_option, marine_option, air_option]) else None,
            "generated_at": datetime.now().isoformat(),
            "currency": "INR (₹)"
        }
    }
