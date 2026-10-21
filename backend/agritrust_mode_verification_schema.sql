-- ====================================================================
-- AGRITRUST: MODE-SPECIFIC DYNAMIC VERIFICATION & CARGO PROFILES SCHEMA
-- Database: ftl_cold_chain
-- ====================================================================

-- 1. CARGO PROFILES TABLE (Configurable by Admin)
CREATE TABLE IF NOT EXISTS cargo_profiles (
    profile_id VARCHAR(50) PRIMARY KEY,
    profile_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    display_title VARCHAR(150) NOT NULL,
    description TEXT,
    requires_temperature_control BOOLEAN NOT NULL DEFAULT TRUE,
    default_temp_min NUMERIC(5, 2) DEFAULT 10.0,
    default_temp_max NUMERIC(5, 2) DEFAULT 13.0,
    critical_temp_breach_min NUMERIC(5, 2) DEFAULT 7.0,
    critical_temp_breach_max NUMERIC(5, 2) DEFAULT 16.0,
    default_humidity_min NUMERIC(5, 2) DEFAULT 80.0,
    default_humidity_max NUMERIC(5, 2) DEFAULT 95.0,
    typical_shelf_life_days INTEGER NOT NULL DEFAULT 14,
    max_acceptable_transit_days INTEGER NOT NULL DEFAULT 7,
    packaging_specifications TEXT DEFAULT 'Standard food-grade ventilated corrugated boxes',
    required_documents JSONB DEFAULT '["Inward Invoice", "Quality Declaration"]'::jsonb,
    allowed_modes JSONB DEFAULT '["ROAD", "AIR", "MARINE", "MULTIMODAL"]'::jsonb,
    mandatory_checklist_keys JSONB DEFAULT '["declared_vs_verified_weight", "product_visual_condition", "packaging_integrity"]'::jsonb,
    risk_indicators JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cargo_profiles_code ON cargo_profiles(profile_code);
CREATE INDEX IF NOT EXISTS idx_cargo_profiles_active ON cargo_profiles(is_active);


-- 2. EXTEND CONSIGNMENT_REQUESTS TABLE FOR MODE & DIMENSIONS
DO $$
BEGIN
    -- Add cargo_profile_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_requests' AND column_name='cargo_profile_id') THEN
        ALTER TABLE consignment_requests ADD COLUMN cargo_profile_id VARCHAR(50) REFERENCES cargo_profiles(profile_id) ON DELETE SET NULL;
    END IF;

    -- Add package_dimensions_cm column (Length, Width, Height)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_requests' AND column_name='package_dimensions_cm') THEN
        ALTER TABLE consignment_requests ADD COLUMN package_dimensions_cm JSONB DEFAULT '{"length": 60.0, "width": 40.0, "height": 30.0}'::jsonb;
    END IF;

    -- Add volumetric_weight_kg column (IATA calculation for Air/Road)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_requests' AND column_name='volumetric_weight_kg') THEN
        ALTER TABLE consignment_requests ADD COLUMN volumetric_weight_kg NUMERIC(12, 2) DEFAULT 0.0;
    END IF;

    -- Add total_volume_cbm column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_requests' AND column_name='total_volume_cbm') THEN
        ALTER TABLE consignment_requests ADD COLUMN total_volume_cbm NUMERIC(10, 3) DEFAULT 0.0;
    END IF;

    -- Add shelf_life_days column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_requests' AND column_name='shelf_life_days') THEN
        ALTER TABLE consignment_requests ADD COLUMN shelf_life_days INTEGER DEFAULT 14;
    END IF;

    -- Add mode_specific_parameters column (airline request, container sizing, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_requests' AND column_name='mode_specific_parameters') THEN
        ALTER TABLE consignment_requests ADD COLUMN mode_specific_parameters JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;


-- 3. EXTEND CONSIGNMENT_INSPECTIONS TABLE FOR DYNAMIC & MODE-SPECIFIC INSPECTION DATA
DO $$
BEGIN
    -- Add mode_inspection_data column (Road/Air/Marine detailed observation logs)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_inspections' AND column_name='mode_inspection_data') THEN
        ALTER TABLE consignment_inspections ADD COLUMN mode_inspection_data JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add dynamic_checklist_results column (list of all evaluated checklist items)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_inspections' AND column_name='dynamic_checklist_results') THEN
        ALTER TABLE consignment_inspections ADD COLUMN dynamic_checklist_results JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add failed_critical_checks column (array of critical failures that block approval)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_inspections' AND column_name='failed_critical_checks') THEN
        ALTER TABLE consignment_inspections ADD COLUMN failed_critical_checks JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add shelf_life_evaluation column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_inspections' AND column_name='shelf_life_evaluation') THEN
        ALTER TABLE consignment_inspections ADD COLUMN shelf_life_evaluation JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add decision_score column (0.0 to 100.0)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_inspections' AND column_name='decision_score') THEN
        ALTER TABLE consignment_inspections ADD COLUMN decision_score NUMERIC(5, 2) DEFAULT 100.0;
    END IF;

    -- Add requires_supervisor_review column (for PENDING_REVIEW state)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_inspections' AND column_name='requires_supervisor_review') THEN
        ALTER TABLE consignment_inspections ADD COLUMN requires_supervisor_review BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add cargo_profile_snapshot column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consignment_inspections' AND column_name='cargo_profile_snapshot') THEN
        ALTER TABLE consignment_inspections ADD COLUMN cargo_profile_snapshot JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
