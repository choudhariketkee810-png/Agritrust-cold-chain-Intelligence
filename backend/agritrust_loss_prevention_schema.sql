-- ====================================================================
-- AGRITRUST: LOSS PREVENTION & INVESTIGATION ENGINE DATABASE SCHEMA
-- Database: ftl_cold_chain
-- Phase: Flagship Loss Prevention, Early Warning, What-If & Dispute Room
-- ====================================================================

-- 1. LOSS RISK ASSESSMENTS TABLE (Real-time and historic predictive assessments)
CREATE TABLE IF NOT EXISTS loss_risk_assessments (
    assessment_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    produce_name VARCHAR(100) NOT NULL,
    total_quantity_kg NUMERIC(12, 2) NOT NULL DEFAULT 1000.0,
    loss_risk_score INTEGER NOT NULL CHECK (loss_risk_score >= 0 AND loss_risk_score <= 100),
    risk_level VARCHAR(30) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    remaining_shelf_life_hours NUMERIC(6, 1) NOT NULL,
    expected_quality_pct NUMERIC(5, 2) NOT NULL,
    early_warning_status VARCHAR(30) NOT NULL DEFAULT 'NORMAL' CHECK (early_warning_status IN ('NORMAL', 'EARLY_WARNING', 'HIGH_RISK', 'CRITICAL')),
    time_to_breach_minutes INTEGER DEFAULT 0,
    temperature_trend VARCHAR(50) DEFAULT 'STABLE',
    current_temperature NUMERIC(5, 2),
    target_temp_min NUMERIC(5, 2),
    target_temp_max NUMERIC(5, 2),
    primary_risk_reason TEXT,
    risk_factors JSONB DEFAULT '[]'::jsonb,
    recommended_action TEXT,
    estimated_avoidable_loss_kg NUMERIC(10, 2) DEFAULT 0.0,
    estimated_avoidable_loss_inr NUMERIC(12, 2) DEFAULT 0.0,
    assessed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_loss_risk_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loss_risk_shipment ON loss_risk_assessments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_loss_risk_level ON loss_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_loss_risk_assessed_at ON loss_risk_assessments(assessed_at DESC);


-- 2. WHAT-IF / COUNTERFACTUAL SCENARIOS TABLE
CREATE TABLE IF NOT EXISTS what_if_scenarios (
    scenario_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    scenario_title VARCHAR(200) NOT NULL,
    actual_scenario JSONB NOT NULL,
    counterfactual_scenario JSONB NOT NULL,
    actual_usable_kg NUMERIC(10, 2) NOT NULL,
    counterfactual_usable_kg NUMERIC(10, 2) NOT NULL,
    avoidable_quantity_loss_kg NUMERIC(10, 2) NOT NULL,
    produce_unit_price_inr NUMERIC(10, 2) NOT NULL DEFAULT 50.0,
    estimated_financial_loss_inr NUMERIC(12, 2) NOT NULL,
    simulation_parameters JSONB DEFAULT '{}'::jsonb,
    ai_confidence_score INTEGER DEFAULT 89,
    disclaimer TEXT DEFAULT 'AI-assisted estimation model for decision support. Not a legal determination.',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_what_if_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_what_if_shipment ON what_if_scenarios(shipment_id);


-- 3. INTERVENTION RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS intervention_recommendations (
    intervention_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    produce_name VARCHAR(100) NOT NULL,
    current_risk_score INTEGER NOT NULL,
    options JSONB NOT NULL,
    recommended_option_id VARCHAR(50) NOT NULL,
    recommended_action VARCHAR(200) NOT NULL,
    recommendation_reason TEXT NOT NULL,
    action_status VARCHAR(30) DEFAULT 'PENDING' CHECK (action_status IN ('PENDING', 'APPLIED', 'REJECTED', 'SUPERSEDED')),
    applied_option_id VARCHAR(50),
    applied_by VARCHAR(50),
    applied_at TIMESTAMP WITHOUT TIME ZONE,
    outcome_summary TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_intervention_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interventions_shipment ON intervention_recommendations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON intervention_recommendations(action_status);


-- 4. INVESTIGATION CASES (AI-Assisted Investigation & Dispute Dossiers)
CREATE TABLE IF NOT EXISTS investigation_cases (
    case_id VARCHAR(50) PRIMARY KEY,
    dispute_id VARCHAR(50),
    shipment_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50),
    logistics_id VARCHAR(50),
    buyer_id VARCHAR(50),
    produce_name VARCHAR(100) NOT NULL,
    original_quantity_kg NUMERIC(10, 2) NOT NULL DEFAULT 1000.0,
    delivered_quantity_kg NUMERIC(10, 2) NOT NULL DEFAULT 1000.0,
    damaged_quantity_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    reported_issue TEXT NOT NULL,
    investigation_status VARCHAR(40) DEFAULT 'OPEN' CHECK (investigation_status IN (
        'OPEN',
        'UNDER_INVESTIGATION',
        'EVIDENCE_COLLECTED',
        'AI_ANALYSIS_COMPLETE',
        'RESOLUTION_RECOMMENDED',
        'CLOSED'
    )),
    ai_confidence_score INTEGER DEFAULT 91,
    detected_anomaly TEXT,
    probable_contributing_events JSONB DEFAULT '[]'::jsonb,
    likely_loss_window_start TIMESTAMP WITHOUT TIME ZONE,
    likely_loss_window_end TIMESTAMP WITHOUT TIME ZONE,
    expected_usable_kg NUMERIC(10, 2) DEFAULT 0.0,
    actual_usable_kg NUMERIC(10, 2) DEFAULT 0.0,
    avoidable_loss_kg NUMERIC(10, 2) DEFAULT 0.0,
    estimated_financial_impact_inr NUMERIC(12, 2) DEFAULT 0.0,
    recommendation_summary TEXT,
    evidence_checklist JSONB DEFAULT '[]'::jsonb,
    disclaimer_notice TEXT DEFAULT 'AGRITrust Decision-Support Engine: Findings identify probable contributing events based on sensor telemetry and chain-of-custody data. This is an objective technical analysis and does not constitute a legal liability determination.',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_case_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cases_shipment ON investigation_cases(shipment_id);
CREATE INDEX IF NOT EXISTS idx_cases_dispute ON investigation_cases(dispute_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON investigation_cases(investigation_status);


-- 5. INVESTIGATION EVIDENCE ITEMS
CREATE TABLE IF NOT EXISTS investigation_evidence (
    evidence_item_id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN (
        'TELEMETRY_LOG',
        'GPS_TRACE',
        'DOOR_EVENT',
        'REEFER_STATUS',
        'WEIGHT_TICKET',
        'QUALITY_INSPECTION',
        'DISPATCH_PHOTO',
        'RECEIVING_PHOTO',
        'ALERT_TRIGGER'
    )),
    title VARCHAR(200) NOT NULL,
    source_component VARCHAR(100) NOT NULL,
    timestamp_recorded TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    data_payload JSONB DEFAULT '{}'::jsonb,
    verified BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_evidence_case FOREIGN KEY (case_id) REFERENCES investigation_cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON investigation_evidence(case_id);


-- 6. LOSS PREVENTION AUDIT METRICS & KPI SNAPSHOTS
CREATE TABLE IF NOT EXISTS loss_prevention_metrics (
    metric_id VARCHAR(50) PRIMARY KEY,
    total_shipments_analyzed INTEGER DEFAULT 0,
    high_risk_shipments_count INTEGER DEFAULT 0,
    predicted_losses_inr NUMERIC(14, 2) DEFAULT 0.0,
    prevented_losses_inr NUMERIC(14, 2) DEFAULT 0.0,
    actual_losses_inr NUMERIC(14, 2) DEFAULT 0.0,
    avoidable_losses_inr NUMERIC(14, 2) DEFAULT 0.0,
    total_quantity_protected_kg NUMERIC(12, 2) DEFAULT 0.0,
    average_loss_risk_score NUMERIC(5, 2) DEFAULT 0.0,
    average_quality_score NUMERIC(5, 2) DEFAULT 0.0,
    loss_prevention_efficiency_score NUMERIC(5, 2) DEFAULT 92.0,
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metrics_snapshot_date ON loss_prevention_metrics(snapshot_date DESC);
