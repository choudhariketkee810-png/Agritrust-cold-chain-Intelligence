"""
AGRITrust — Dynamic Mode-Specific & Cargo-Aware Verification Engine
===================================================================
Unified intelligence engine for:
1. Dynamic inspection checklist generation (Road, Air, Marine x 6 Cargo Profiles)
2. Volumetric weight & dimensional verification (IATA Standard)
3. Cargo profile parameter & threshold management
4. Mode-specific physical constraint & equipment checks (Reefer, Genset, ULD, Seals)
5. Strict automated decision engine (APPROVED, REQUIRES_CORRECTION, REJECTED, PENDING_REVIEW)
6. Shelf-life vs transit duration risk modeling
"""

import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

# ==============================================================================
# 1. STANDARDIZED CARGO PROFILES (Admin Configurable)
# ==============================================================================

BUILTIN_CARGO_PROFILES: Dict[str, Dict[str, Any]] = {
    "CP_FRESH_PRODUCE": {
        "profile_id": "CP_FRESH_PRODUCE",
        "profile_code": "FRESH_PRODUCE",
        "category_name": "Fresh Fruits & Vegetables",
        "display_title": "Fresh Horticultural Produce (Perishable)",
        "description": "Live respiring horticultural commodities (Mangoes, Grapes, Pomegranates, Tomatoes, Berries). Requires active cold chain, ethylene management, and ventilation.",
        "requires_temperature_control": True,
        "default_temp_min": 10.0,
        "default_temp_max": 13.0,
        "critical_temp_breach_min": 7.0,
        "critical_temp_breach_max": 16.5,
        "default_humidity_min": 80.0,
        "default_humidity_max": 95.0,
        "typical_shelf_life_days": 14,
        "max_acceptable_transit_days": 7,
        "packaging_specifications": "Ventilated corrugated food-grade cartons (CFB) with ethylene absorbent sachets and corner edge protectors.",
        "required_documents": [
            "APEDA Phyto-Sanitary Certificate",
            "Farm Gate Harvest Inward Bill",
            "Pesticide MRL Compliance Lab Test Report"
        ],
        "allowed_modes": ["ROAD", "AIR", "MARINE", "MULTIMODAL"],
        "mandatory_checklist_keys": [
            "declared_vs_verified_weight",
            "pulp_temperature_check",
            "brix_sweetness_check",
            "visual_mold_damage_check",
            "packaging_ventilation_check",
            "supporting_phytosanitary_doc_check"
        ],
        "risk_indicators": [
            "Ethylene sensitivity during co-loading",
            "Chilling injury if temperature drops below 8°C",
            "Accelerated decay above 15°C"
        ]
    },
    "CP_CHILLED_FOOD": {
        "profile_id": "CP_CHILLED_FOOD",
        "profile_code": "CHILLED_FOOD",
        "category_name": "Chilled Dairy, Poultry & Seafood",
        "display_title": "Chilled High-Risk Perishables (0°C to 4°C)",
        "description": "High-protein perishable foodstuffs (Paneer, Fresh Milk, Poultry, Prawns, Hilsa Fish). Zero tolerance for thermal excursions above 5°C.",
        "requires_temperature_control": True,
        "default_temp_min": 0.0,
        "default_temp_max": 4.0,
        "critical_temp_breach_min": -1.5,
        "critical_temp_breach_max": 5.5,
        "default_humidity_min": 75.0,
        "default_humidity_max": 85.0,
        "typical_shelf_life_days": 5,
        "max_acceptable_transit_days": 3,
        "packaging_specifications": "Insulated EPS thermocol boxes with food-grade gel ice packs and leak-proof secondary liners.",
        "required_documents": [
            "FSSAI Food Safety Compliance Certificate",
            "Cold Storage Pull-Out Certificate",
            "Microbiological Quality Clearance"
        ],
        "allowed_modes": ["ROAD", "AIR", "MULTIMODAL"],
        "mandatory_checklist_keys": [
            "declared_vs_verified_weight",
            "core_chilled_temp_check",
            "leak_proof_barrier_check",
            "fssai_sanitary_doc_check",
            "ice_gel_pack_adequacy_check"
        ],
        "risk_indicators": [
            "High bacterial growth if temp exceeds 5°C for > 45 minutes",
            "Seafood odor cross-contamination",
            "Liquid leakage risking airframe or truck floor damage"
        ]
    },
    "CP_FROZEN_FOOD": {
        "profile_id": "CP_FROZEN_FOOD",
        "profile_code": "FROZEN_FOOD",
        "category_name": "Deep Frozen Foods (-18°C)",
        "display_title": "Deep Frozen Cargo (-18°C to -25°C)",
        "description": "IQF Frozen vegetables, frozen seafood blocks, meat cuts, ice cream. Requires continuous sub-zero refrigeration with zero thaw cycles.",
        "requires_temperature_control": True,
        "default_temp_min": -25.0,
        "default_temp_max": -18.0,
        "critical_temp_breach_min": -30.0,
        "critical_temp_breach_max": -15.0,
        "default_humidity_min": 60.0,
        "default_humidity_max": 80.0,
        "typical_shelf_life_days": 180,
        "max_acceptable_transit_days": 30,
        "packaging_specifications": "Heavy-duty poly-lined master cartons with dry ice blocks and thermal insulation foil.",
        "required_documents": [
            "Cold Chain Blast Freezer Certificate",
            "FSSAI Export Clearance",
            "Container Pre-Trip Inspection (PTI) Record"
        ],
        "allowed_modes": ["ROAD", "AIR", "MARINE", "MULTIMODAL"],
        "mandatory_checklist_keys": [
            "declared_vs_verified_weight",
            "sub_zero_surface_temp_check",
            "hard_freeze_no_thaw_check",
            "dry_ice_genset_check",
            "pti_certificate_check"
        ],
        "risk_indicators": [
            "Recrystallization damage if thawed and refrozen",
            "Sublimation loss if dry ice vents prematurely",
            "Reefer power failure during marine voyage"
        ]
    },
    "CP_PHARMA": {
        "profile_id": "CP_PHARMA",
        "profile_code": "PHARMACEUTICALS",
        "category_name": "Pharmaceuticals & Biologics",
        "display_title": "Pharmaceuticals & Biologics (GDP 2°C - 8°C)",
        "description": "Critical vaccines, biologics, insulin, diagnostic reagents. Requires strict Good Distribution Practices (GDP), dual data loggers, and tamper-evident chain of custody.",
        "requires_temperature_control": True,
        "default_temp_min": 2.0,
        "default_temp_max": 8.0,
        "critical_temp_breach_min": 1.0,
        "critical_temp_breach_max": 9.0,
        "default_humidity_min": 40.0,
        "default_humidity_max": 60.0,
        "typical_shelf_life_days": 90,
        "max_acceptable_transit_days": 5,
        "packaging_specifications": "Validated VIP (Vacuum Insulated Panels) passive thermal shippers with Phase Change Materials (PCM) and dual calibrated BLE loggers.",
        "required_documents": [
            "WHO Good Distribution Practices (GDP) Certificate",
            "Batch Release Certificate of Analysis (CoA)",
            "Calibrated Data Logger Serialization Sheet",
            "Customs Expedited Clearance Pass"
        ],
        "allowed_modes": ["ROAD", "AIR", "MULTIMODAL"],
        "mandatory_checklist_keys": [
            "declared_vs_verified_weight",
            "calibrated_data_logger_verification",
            "gdp_certificate_verification",
            "phase_change_shipper_integrity",
            "tamper_evident_seal_verification",
            "tarmac_expedited_transfer_check"
        ],
        "risk_indicators": [
            "Loss of vaccine potency if frozen (< 2°C) or heated (> 8°C)",
            "Regulatory impoundment if GDP audit log is missing",
            "Airport tarmac solar heat gain during aircraft loading"
        ]
    },
    "CP_DRY_GOODS": {
        "profile_id": "CP_DRY_GOODS",
        "profile_code": "DRY_GOODS",
        "category_name": "Dry Packaged Goods & Grains",
        "display_title": "Dry Agro Commodities & Packaged Foods",
        "description": "Aged Basmati rice, pulses, whole spices, processed dry foodstuffs. Ambient transport requiring dry conditions, moisture control, and pest exclusion.",
        "requires_temperature_control": False,
        "default_temp_min": 18.0,
        "default_temp_max": 30.0,
        "critical_temp_breach_min": 5.0,
        "critical_temp_breach_max": 45.0,
        "default_humidity_min": 30.0,
        "default_humidity_max": 65.0,
        "typical_shelf_life_days": 365,
        "max_acceptable_transit_days": 60,
        "packaging_specifications": "Multi-wall moisture-barrier HDPE woven bags or Kraft paper laminated bags on clean wooden fumigated pallets.",
        "required_documents": [
            "Moisture & Quality Certificate (Max 12.0%)",
            "Methyl Bromide / Phosphine Fumigation Certificate",
            "Commercial Packing List"
        ],
        "allowed_modes": ["ROAD", "AIR", "MARINE", "MULTIMODAL"],
        "mandatory_checklist_keys": [
            "declared_vs_verified_weight",
            "moisture_content_meter_check",
            "pest_weevil_infestation_check",
            "bag_stitching_pallet_check",
            "container_dryness_cleanliness_check"
        ],
        "risk_indicators": [
            "Moisture absorption causing fungal mold growth",
            "Insect infestation if fumigation is invalid",
            "Water condensation/cargo sweat during sea voyage"
        ]
    },
    "CP_BULK_INDUSTRIAL": {
        "profile_id": "CP_BULK_INDUSTRIAL",
        "profile_code": "BULK_INDUSTRIAL",
        "category_name": "Agro-Inputs & Industrial Cargo",
        "display_title": "Agro-Inputs & Bulk Industrial Cargo",
        "description": "Bio-fertilizers, soil conditioners, farm equipment components, non-perishable agricultural supplies. Heavy freight requiring tie-downs and safety labeling.",
        "requires_temperature_control": False,
        "default_temp_min": 10.0,
        "default_temp_max": 40.0,
        "critical_temp_breach_min": 0.0,
        "critical_temp_breach_max": 60.0,
        "default_humidity_min": 20.0,
        "default_humidity_max": 90.0,
        "typical_shelf_life_days": 730,
        "max_acceptable_transit_days": 90,
        "packaging_specifications": "UN-approved composite IBC drums, wooden crates, or steel strapped palletized units.",
        "required_documents": [
            "Material Safety Data Sheet (MSDS)",
            "Gross Weight & Tare Weighbridge Slip",
            "Cargo Transport Unit (CTU) Packing Certificate"
        ],
        "allowed_modes": ["ROAD", "AIR", "MARINE", "MULTIMODAL"],
        "mandatory_checklist_keys": [
            "declared_vs_verified_weight",
            "msds_safety_documentation_check",
            "structural_pallet_securing_check",
            "gross_vehicle_payload_limit_check"
        ],
        "risk_indicators": [
            "Load shifting causing truck/container rollover",
            "Chemical spill hazard requiring Hazmat containment",
            "Axle weight overload violation"
        ]
    }
}


# ==============================================================================
# 2. VOLUMETRIC & CHARGEABLE WEIGHT COMPUTATION
# ==============================================================================

def calculate_volumetric_weight(
    length_cm: float,
    width_cm: float,
    height_cm: float,
    package_count: int = 1,
    divisor: float = 6000.0  # IATA Standard: 6000 cm3/kg (167 kg/m3)
) -> Dict[str, Any]:
    """
    Computes volume (m3), volumetric weight (kg), and comparison metrics according to IATA standards.
    """
    length = max(1.0, float(length_cm or 60.0))
    width = max(1.0, float(width_cm or 40.0))
    height = max(1.0, float(height_cm or 30.0))
    count = max(1, int(package_count or 1))

    single_volume_cbm = (length * width * height) / 1000000.0
    total_volume_cbm = round(single_volume_cbm * count, 3)

    single_vol_weight = (length * width * height) / divisor
    total_vol_weight = round(single_vol_weight * count, 2)

    return {
        "length_cm": length,
        "width_cm": width,
        "height_cm": height,
        "package_count": count,
        "single_unit_volume_cbm": round(single_volume_cbm, 4),
        "total_volume_cbm": total_volume_cbm,
        "volumetric_weight_kg": total_vol_weight,
        "iata_divisor": divisor
    }


# ==============================================================================
# 3. DYNAMIC CHECKLIST GENERATOR
# ==============================================================================

def generate_dynamic_checklist(
    transport_mode: str,
    cargo_profile_code: str = "FRESH_PRODUCE",
    product_name: str = "Mangoes",
    declared_weight_kg: float = 3000.0,
    package_count: int = 100,
    dimensions_cm: Optional[Dict[str, float]] = None,
    requires_temp_control: bool = True,
    origin_city: str = "Nashik",
    destination_city: str = "Mumbai",
    shelf_life_days: int = 14
) -> Dict[str, Any]:
    """
    Generates a tailored physical inspection checklist combining:
    1. Universal Baseline Parameters (Weight, Visual, Packaging, Docs)
    2. Mode-Specific Physical Checks (Road, Air, Marine)
    3. Cargo Profile-Specific Scientific Parameters (Pulp temp, Brix, Respiration, GDP, MSDS)
    """
    mode = str(transport_mode or "ROAD").upper()
    profile_code = f"CP_{cargo_profile_code.upper()}" if not cargo_profile_code.startswith("CP_") else cargo_profile_code.upper()
    profile = BUILTIN_CARGO_PROFILES.get(profile_code, BUILTIN_CARGO_PROFILES["CP_FRESH_PRODUCE"])

    dims = dimensions_cm or {"length": 60.0, "width": 40.0, "height": 30.0}
    vol_calc = calculate_volumetric_weight(
        dims.get("length", 60.0),
        dims.get("width", 40.0),
        dims.get("height", 30.0),
        package_count
    )

    checklist_items: List[Dict[str, Any]] = []

    # -------------------------------------------------------------
    # SECTION 1: UNIVERSAL BASELINE VERIFICATION CHECKS
    # -------------------------------------------------------------
    checklist_items.append({
        "key": "declared_vs_verified_weight",
        "title": "Calibrated Scale Weight Verification",
        "description": f"Physically weigh consignment on calibrated scales. Declared: {declared_weight_kg:,.1f} kg across {package_count} units. Variance must be ≤ ±3.0%.",
        "category": "BASELINE_WEIGHT",
        "is_mandatory": True,
        "severity": "CRITICAL",
        "input_type": "NUMERIC_WEIGHT",
        "unit": "kg",
        "declared_value": declared_weight_kg,
        "tolerance_pct": 3.0
    })

    checklist_items.append({
        "key": "dimensional_cube_verification",
        "title": "Package Dimensions & CBM Verification",
        "description": f"Verify individual crate dimensions ({vol_calc['length_cm']}x{vol_calc['width_cm']}x{vol_calc['height_cm']} cm). Computed total volume: {vol_calc['total_volume_cbm']} CBM.",
        "category": "BASELINE_DIMENSIONS",
        "is_mandatory": True,
        "severity": "MAJOR",
        "input_type": "DIMENSIONAL_INPUT",
        "unit": "cm",
        "declared_dimensions": dims
    })

    checklist_items.append({
        "key": "product_visual_condition",
        "title": "Visual Product Condition & Spoilage Screening",
        "description": "Examine samples for physical bruising, pest infestation, active rot, discoloration, or foreign matter contamination.",
        "category": "CARGO_QUALITY",
        "is_mandatory": True,
        "severity": "CRITICAL",
        "input_type": "BOOLEAN_PASS_FAIL"
    })

    checklist_items.append({
        "key": "packaging_integrity_labeling",
        "title": "Packaging Integrity, Strapping & Barcode Labels",
        "description": f"Ensure {profile['packaging_specifications']}. Check carton crush resistance, pallet stretch wrap, and legible barcode labeling.",
        "category": "PACKAGING",
        "is_mandatory": True,
        "severity": "CRITICAL",
        "input_type": "BOOLEAN_PASS_FAIL"
    })

    # -------------------------------------------------------------
    # SECTION 2: CARGO PROFILE-SPECIFIC PARAMETERS
    # -------------------------------------------------------------
    if profile.get("requires_temperature_control") or requires_temp_control:
        checklist_items.append({
            "key": "pulp_core_temperature_check",
            "title": f"Product Pulp/Core Temperature Measurement ({profile['default_temp_min']}°C to {profile['default_temp_max']}°C)",
            "description": f"Insert calibrated digital penetration probe into core produce. Approved range: {profile['default_temp_min']}°C to {profile['default_temp_max']}°C (Critical breach: < {profile['critical_temp_breach_min']}°C or > {profile['critical_temp_breach_max']}°C).",
            "category": "TEMPERATURE_CONTROL",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "NUMERIC_TEMPERATURE",
            "unit": "°C",
            "target_min": profile["default_temp_min"],
            "target_max": profile["default_temp_max"],
            "critical_min": profile["critical_temp_breach_min"],
            "critical_max": profile["critical_temp_breach_max"]
        })

    if profile_code == "CP_FRESH_PRODUCE":
        checklist_items.append({
            "key": "brix_sweetness_check",
            "title": "Brix Sugar & Maturity Index (Refractometer)",
            "description": "Extract fruit juice sample onto optical/digital refractometer. Minimum export threshold: 14.5° Bx for table grapes/mangoes.",
            "category": "CARGO_QUALITY",
            "is_mandatory": False,
            "severity": "MAJOR",
            "input_type": "NUMERIC_VALUE",
            "unit": "° Bx",
            "target_min": 14.0,
            "target_max": 24.0
        })
        checklist_items.append({
            "key": "ethylene_ventilation_check",
            "title": "Ethylene Absorbers & Air Chute Ventilation",
            "description": "Confirm potassium permanganate ethylene scrubber sachets in boxes and 15cm top air circulation clearance.",
            "category": "PACKAGING",
            "is_mandatory": True,
            "severity": "MAJOR",
            "input_type": "BOOLEAN_PASS_FAIL"
        })

    elif profile_code == "CP_CHILLED_FOOD":
        checklist_items.append({
            "key": "leak_proof_barrier_check",
            "title": "Double Sealed Leak-Proof Barrier & Absorbent Pads",
            "description": "Inspect bottom absorbent pads. Zero liquid discharge permitted to prevent bacterial cross-contamination.",
            "category": "PACKAGING",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "BOOLEAN_PASS_FAIL"
        })

    elif profile_code == "CP_FROZEN_FOOD":
        checklist_items.append({
            "key": "hard_freeze_no_thaw_check",
            "title": "Solid Hard Freeze & Zero Thaw Recrystallization",
            "description": "Check for absence of ice crystal glazing or soft spots indicating previous defrost/thaw cycles.",
            "category": "CARGO_QUALITY",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "BOOLEAN_PASS_FAIL"
        })

    elif profile_code == "CP_PHARMA":
        checklist_items.append({
            "key": "gdp_calibrated_logger_check",
            "title": "WHO GDP Compliance & Dual Serialized BLE Data Loggers",
            "description": "Verify active NIST-traceable data loggers embedded in master shipper. Confirm serialized cryptographic chain of custody.",
            "category": "DOCUMENTATION",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "BOOLEAN_PASS_FAIL"
        })

    elif profile_code == "CP_DRY_GOODS":
        checklist_items.append({
            "key": "moisture_content_meter_check",
            "title": "Commodity Moisture Content Test (≤ 12.0%)",
            "description": "Use digital grain/spice moisture meter. Moisture must not exceed 12.0% to prevent aflatoxin/mold development.",
            "category": "CARGO_QUALITY",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "NUMERIC_VALUE",
            "unit": "%",
            "target_max": 12.0
        })

    # -------------------------------------------------------------
    # SECTION 3: MODE-SPECIFIC INSPECTION CHECKS
    # -------------------------------------------------------------
    if mode == "ROAD":
        checklist_items.append({
            "key": "road_vehicle_payload_suitability",
            "title": "Vehicle Registration, Body Cleanliness & Payload Rating",
            "description": f"Verify truck RC, permitted payload capacity (min {declared_weight_kg} kg), food-grade wash certification, and clean floor drains.",
            "category": "MODE_ROAD",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "TEXT_FORM",
            "fields": ["vehicle_number", "permitted_payload_kg", "body_type"]
        })
        if profile.get("requires_temperature_control"):
            checklist_items.append({
                "key": "road_reefer_precooling_check",
                "title": "Reefer Unit Operating Status & 90-Min Pre-Cooling",
                "description": f"Confirm Thermo King / Carrier reefer unit operational. Pre-cooling to setpoint ({profile['default_temp_max']}°C) achieved before loading.",
                "category": "MODE_ROAD",
                "is_mandatory": True,
                "severity": "CRITICAL",
                "input_type": "BOOLEAN_PASS_FAIL"
            })
        checklist_items.append({
            "key": "road_security_seal_gps_check",
            "title": "Tamper-Evident High-Security Bolt Seal & Active GPS Telemetry",
            "description": "Record unique serialized bolt seal number and verify active GPS/temperature IoT gateway reporting every 5s.",
            "category": "MODE_ROAD",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "TEXT_INPUT",
            "field_label": "Bolt Seal Number"
        })

    elif mode == "AIR":
        checklist_items.append({
            "key": "air_cargo_acceptance_dimensions",
            "title": "Airline Cargo Acceptance & Volumetric Weight Audit",
            "description": f"Chargeable weight check: Gross {declared_weight_kg:,.1f} kg vs Volumetric {vol_calc['volumetric_weight_kg']:,.1f} kg. Max dimension compliant with cargo hold door.",
            "category": "MODE_AIR",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "BOOLEAN_PASS_FAIL"
        })
        checklist_items.append({
            "key": "iata_perishable_labeling_check",
            "title": "IATA Mandatory Handling Labels (Perishable / This Way Up / Keep Cold)",
            "description": "Inspect standardized IATA time/temperature sensitive labels on at least two opposite sides of all cartons.",
            "category": "MODE_AIR",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "BOOLEAN_PASS_FAIL"
        })
        checklist_items.append({
            "key": "airport_cold_room_chain_check",
            "title": "Origin & Destination Airport Cold Room / ULD Reefer Space",
            "description": f"Verify confirmed temperature-controlled holding space at {origin_city} Cargo Terminal and destination transfer hub.",
            "category": "MODE_AIR",
            "is_mandatory": True,
            "severity": "MAJOR",
            "input_type": "BOOLEAN_PASS_FAIL"
        })

    elif mode == "MARINE":
        checklist_items.append({
            "key": "marine_container_csc_structural_check",
            "title": "ISO Container Inspection, CSC Safety Plate & Door Gaskets",
            "description": "Check valid CSC plate, zero structural damage, light-tight door seal gaskets, and clean stainless steel T-floor.",
            "category": "MODE_MARINE",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "TEXT_FORM",
            "fields": ["container_number", "container_type", "tare_weight_kg"]
        })
        if profile.get("requires_temperature_control"):
            checklist_items.append({
                "key": "marine_reefer_genset_ventilation_check",
                "title": "Reefer PTI Clearance, Fresh Air Ventilation & Genset Power",
                "description": f"Verify Pre-Trip Inspection (PTI) pass, setpoint {profile['default_temp_min']}°C, fresh air exchange setting (25 m3/h), and operational clip-on genset.",
                "category": "MODE_MARINE",
                "is_mandatory": True,
                "severity": "CRITICAL",
                "input_type": "BOOLEAN_PASS_FAIL"
            })
        checklist_items.append({
            "key": "marine_iso_bolt_seal_check",
            "title": "ISO 17712 High Security Container Bolt Seal",
            "description": "Affix and record serialized ISO 17712 'H' certified bolt seal to the right container door locking cam.",
            "category": "MODE_MARINE",
            "is_mandatory": True,
            "severity": "CRITICAL",
            "input_type": "TEXT_INPUT",
            "field_label": "ISO Bolt Seal Serial No."
        })

    # -------------------------------------------------------------
    # SECTION 4: SHELF-LIFE VS TRANSIT DURATION RISK MODEL
    # -------------------------------------------------------------
    transit_days_estimate = 1.0 if mode == "AIR" else (2.0 if mode == "ROAD" else 8.0)
    effective_shelf_life = max(1, shelf_life_days or profile["typical_shelf_life_days"])
    shelf_life_margin = effective_shelf_life - transit_days_estimate
    shelf_life_risk = "LOW" if shelf_life_margin >= 4 else ("MEDIUM" if shelf_life_margin >= 1 else "CRITICAL")

    checklist_items.append({
        "key": "shelf_life_viability_check",
        "title": f"Shelf-Life vs {mode} Transit Duration Viability ({effective_shelf_life} Days Shelf Life vs ~{transit_days_estimate} Days Transit)",
        "description": f"Residual shelf-life post-delivery: {shelf_life_margin:.1f} days. Risk level: {shelf_life_risk}. Cargo must arrive with ≥ 50% commercial life remaining.",
        "category": "SHELF_LIFE_RISK",
        "is_mandatory": True,
        "severity": "CRITICAL" if shelf_life_risk == "CRITICAL" else "MAJOR",
        "input_type": "BOOLEAN_PASS_FAIL",
        "shelf_life_days": effective_shelf_life,
        "estimated_transit_days": transit_days_estimate,
        "residual_margin_days": shelf_life_margin,
        "risk_level": shelf_life_risk
    })

    return {
        "transport_mode": mode,
        "cargo_profile": profile,
        "product_name": product_name,
        "declared_weight_kg": declared_weight_kg,
        "volumetric_calculation": vol_calc,
        "total_checklist_count": len(checklist_items),
        "mandatory_count": sum(1 for c in checklist_items if c.get("is_mandatory")),
        "critical_count": sum(1 for c in checklist_items if c.get("severity") == "CRITICAL"),
        "shelf_life_summary": {
            "declared_shelf_life_days": effective_shelf_life,
            "estimated_transit_days": transit_days_estimate,
            "residual_margin_days": shelf_life_margin,
            "risk_level": shelf_life_risk
        },
        "checklist": checklist_items
    }


# ==============================================================================
# 4. DECISION EVALUATION ENGINE
# ==============================================================================

def evaluate_dynamic_inspection_submission(
    template: Dict[str, Any],
    submission_data: Dict[str, Any],
    officer_user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates submitted inspection parameters and checklist results against dynamic thresholds.
    Enforces strict rules:
    1. A failed CRITICAL check triggers automatic REJECTION or REQUIRES_CORRECTION.
    2. Weight discrepancies > 5.0% trigger REQUIRES_CORRECTION; > 15.0% trigger REJECTION.
    3. Temperature outside critical bounds triggers automatic REJECTION for perishable/pharma cargo.
    4. Refrigerated cargo with failed/missing reefer unit triggers automatic REJECTION.
    5. Returns unified scorecard, discrepancy list, corrective actions, and decision verdict.
    """
    cargo_profile = template.get("cargo_profile", BUILTIN_CARGO_PROFILES["CP_FRESH_PRODUCE"])
    checklist_template = template.get("checklist", [])
    mode = template.get("transport_mode", "ROAD")

    evaluated_checks: List[Dict[str, Any]] = []
    failed_critical: List[str] = []
    failed_major: List[str] = []
    discrepancies: List[Dict[str, Any]] = []
    corrective_actions: List[str] = []

    # 1. Evaluate Declared vs Measured Weight
    declared_wt = float(template.get("declared_weight_kg", 3000.0))
    verified_wt = float(submission_data.get("verified_quantity_kg") or declared_wt)
    wt_diff = round(verified_wt - declared_wt, 2)
    wt_diff_pct = round((abs(wt_diff) / max(1.0, declared_wt)) * 100.0, 2)

    if wt_diff_pct > 15.0:
        failed_critical.append(f"Severe weight discrepancy: Declared {declared_wt} kg vs Measured {verified_wt} kg ({wt_diff_pct}% variance). Exceeds 15% fraud tolerance.")
        discrepancies.append({
            "parameter": "Gross Weight",
            "declared": f"{declared_wt} kg",
            "verified": f"{verified_wt} kg",
            "variance": f"{wt_diff_pct}% ({wt_diff:+} kg)",
            "severity": "CRITICAL"
        })
    elif wt_diff_pct > 5.0:
        failed_major.append(f"Noticeable weight discrepancy: {wt_diff_pct}% variance ({wt_diff:+} kg). Documentation revision required.")
        discrepancies.append({
            "parameter": "Gross Weight",
            "declared": f"{declared_wt} kg",
            "verified": f"{verified_wt} kg",
            "variance": f"{wt_diff_pct}% ({wt_diff:+} kg)",
            "severity": "MAJOR"
        })
        corrective_actions.append("Customer must issue revised invoice/manifest reflecting actual measured weight.")

    # 2. Evaluate Temperature if Applicable
    measured_temp = submission_data.get("measured_temperature")
    if measured_temp is not None and cargo_profile.get("requires_temperature_control"):
        temp_val = float(measured_temp)
        crit_min = float(cargo_profile.get("critical_temp_breach_min", 7.0))
        crit_max = float(cargo_profile.get("critical_temp_breach_max", 16.5))
        target_min = float(cargo_profile.get("default_temp_min", 10.0))
        target_max = float(cargo_profile.get("default_temp_max", 13.0))

        if temp_val < crit_min or temp_val > crit_max:
            failed_critical.append(f"Critical Thermal Breach: Measured pulp temperature {temp_val}°C is outside safety limit ({crit_min}°C to {crit_max}°C). Severe spoilage risk.")
            discrepancies.append({
                "parameter": "Pulp Temperature",
                "declared": f"{target_min}°C to {target_max}°C",
                "verified": f"{temp_val}°C",
                "variance": f"Excursion of {abs(temp_val - target_max if temp_val > target_max else target_min - temp_val):.1f}°C",
                "severity": "CRITICAL"
            })
        elif temp_val < target_min or temp_val > target_max:
            failed_major.append(f"Pre-cooling non-optimal: {temp_val}°C is outside target bracket ({target_min}°C - {target_max}°C). Immediate pre-cooling required.")
            corrective_actions.append(f"Subject consignment to 60 minutes forced-air pre-cooling before vehicle loading.")

    # 3. Evaluate Mode-Specific Checklist Submissions
    checklist_responses = submission_data.get("checklist_responses", {})
    for item in checklist_template:
        key = item["key"]
        is_mand = item.get("is_mandatory", True)
        sev = item.get("severity", "MAJOR")
        resp_val = checklist_responses.get(key, True)

        # Handle boolean checklist response
        passed = (resp_val is True or resp_val == "PASS" or resp_val == "YES" or resp_val == 1)
        if not passed:
            fail_msg = f"{item['title']} - Failed physical inspection verification."
            if sev == "CRITICAL":
                failed_critical.append(fail_msg)
            else:
                failed_major.append(fail_msg)
                corrective_actions.append(f"Rectify {item['title']}: {item['description']}")

        evaluated_checks.append({
            "key": key,
            "title": item["title"],
            "category": item.get("category", "GENERAL"),
            "is_mandatory": is_mand,
            "severity": sev,
            "passed": passed,
            "response": resp_val
        })

    # 4. Mode-Specific Hardware & Seal Checks
    mode_data = submission_data.get("mode_inspection_data", {})
    if mode == "ROAD":
        reefer_status = str(mode_data.get("reefer_operating_status", "OPERATIONAL")).upper()
        if cargo_profile.get("requires_temperature_control") and reefer_status in ["MALFUNCTIONING", "OFF", "NOT_EQUIPPED"]:
            failed_critical.append(f"Road Reefer Failure: Vehicle reefer unit is '{reefer_status}'. Reefer transport is strictly mandatory for {cargo_profile['category_name']}.")
            discrepancies.append({
                "parameter": "Vehicle Reefer Status",
                "declared": "Operational Reefer Truck",
                "verified": reefer_status,
                "severity": "CRITICAL"
            })

    elif mode == "AIR":
        acceptance_status = str(mode_data.get("airline_acceptance_status", "ACCEPTED")).upper()
        if acceptance_status in ["REJECTED_PACKAGING", "RESTRICTED_CARGO"]:
            failed_critical.append(f"Airline Cargo Acceptance Failure: Carrier flagged status as '{acceptance_status}'. Packaging does not meet IATA air cargo standards.")

    elif mode == "MARINE":
        csc_valid = mode_data.get("csc_plate_valid", True)
        if not csc_valid:
            failed_critical.append("Marine Safety Violation: ISO container CSC safety plate is expired or unreadable.")

    # 5. Compute Final Decision Verdict
    total_checks = max(1, len(checklist_template))
    passed_checks = sum(1 for c in evaluated_checks if c["passed"])
    base_score = round((passed_checks / total_checks) * 100.0, 1)

    # Hard deduction for critical failures
    if failed_critical:
        calculated_score = max(0.0, min(45.0, base_score - (len(failed_critical) * 25.0)))
        decision = "REJECTED" if any("Severe" in f or "Breach" in f or "Failure" in f for f in failed_critical) else "REQUIRES_CORRECTION"
    elif failed_major:
        calculated_score = max(50.0, min(80.0, base_score - (len(failed_major) * 10.0)))
        decision = "REQUIRES_CORRECTION"
    else:
        calculated_score = max(90.0, base_score)
        decision = "APPROVED"

    # Generate VRF certificate if approved
    vrf_code = None
    if decision == "APPROVED":
        vrf_code = f"VRF-{datetime.now().strftime('%Y%m%d')}-{abs(hash(str(submission_data) + str(datetime.now()))) % 10000:04d}"

    return {
        "decision": decision,
        "decision_score": calculated_score,
        "is_approved": (decision == "APPROVED"),
        "verification_reference_no": vrf_code,
        "total_checks_count": total_checks,
        "passed_checks_count": passed_checks,
        "failed_critical_checks": failed_critical,
        "failed_major_checks": failed_major,
        "discrepancies": discrepancies,
        "corrective_actions_required": corrective_actions,
        "evaluated_checklist": evaluated_checks,
        "verified_metrics": {
            "declared_quantity_kg": declared_wt,
            "verified_quantity_kg": verified_wt,
            "quantity_variance_kg": wt_diff,
            "quantity_variance_pct": wt_diff_pct,
            "measured_temperature_c": measured_temp,
            "volumetric_weight_kg": template.get("volumetric_calculation", {}).get("volumetric_weight_kg", 0.0)
        },
        "mode_suitability": {
            "mode": mode,
            "is_mode_suitable": (len(failed_critical) == 0),
            "suitability_remarks": "Passed all mode-specific equipment and safety audits." if not failed_critical else "; ".join(failed_critical)
        },
        "officer_audit": {
            "officer_id": officer_user.get("sub", "usr_verif_01"),
            "officer_name": officer_user.get("full_name", "Sunil Shinde"),
            "badge_number": officer_user.get("badge_number", "AGRI-INSP-0441"),
            "timestamp": datetime.now().isoformat()
        }
    }
