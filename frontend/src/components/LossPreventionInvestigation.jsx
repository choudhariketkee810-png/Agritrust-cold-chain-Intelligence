import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Thermometer,
  Clock,
  Layers,
  Search,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info,
  Lock,
  Download,
  Printer,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import SmartImage from './SmartImage';
import { ASSETS } from '../assets/images';
import { generateDisputeInvestigation, fetchIncidents, fetchShipments } from '../api';

export default function LossPreventionInvestigation() {
  const [shipments, setShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('SHP-TOMATO-001');

  // Quantitative Discrepancy Inputs
  const [declaredWeight, setDeclaredWeight] = useState(3500.0);
  const [verifiedWeight, setVerifiedWeight] = useState(3485.0);
  const [deliveredWeight, setDeliveredWeight] = useState(3340.0);
  const [declaredGrade, setDeclaredGrade] = useState('Grade A (Export Certified)');
  const [deliveredGrade, setDeliveredGrade] = useState('Grade B (Surface Softening / Downgraded)');
  const [plannedTransitHours, setPlannedTransitHours] = useState(12.0);
  const [actualTransitHours, setActualTransitHours] = useState(19.5);
  const [excursionHours, setExcursionHours] = useState(3.5);
  const [sealIntact, setSealIntact] = useState(true);

  // Investigation output state
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchShipments();
        if (res?.data && res.data.length > 0) {
          setShipments(res.data);
        }
      } catch (err) {
        console.error('Error fetching shipments:', err);
      }
    }
    load();
  }, []);

  const runInvestigation = async () => {
    setLoading(true);
    try {
      const res = await generateDisputeInvestigation({
        shipment_id: selectedShipmentId,
        product_name: 'Vine Tomatoes (Pune Polyhouse)',
        declared_weight_kg: parseFloat(declaredWeight),
        verified_weight_kg: parseFloat(verifiedWeight),
        delivered_weight_kg: parseFloat(deliveredWeight),
        declared_grade: declaredGrade,
        delivered_grade: deliveredGrade,
        planned_transit_hours: parseFloat(plannedTransitHours),
        actual_transit_hours: parseFloat(actualTransitHours),
        thermal_excursion_duration_hours: parseFloat(excursionHours),
        seal_intact_at_delivery: sealIntact
      });
      setDossier(res);
    } catch (err) {
      console.error('Failed to generate dispute dossier:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runInvestigation();
  }, [selectedShipmentId, declaredWeight, verifiedWeight, deliveredWeight, plannedTransitHours, actualTransitHours, excursionHours, sealIntact]);

  const netShortageKg = Math.round(declaredWeight - deliveredWeight);
  const shortagePct = ((netShortageKg / declaredWeight) * 100).toFixed(2);
  const delayHours = Math.max(0, actualTransitHours - plannedTransitHours).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. HEADER BANNER */}
      <div className="card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F7FD 100%)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: '800', fontSize: '11px' }}>
                <Scale size={12} />
                <span>FORENSIC VARIANCE & LOSS GOVERNANCE</span>
              </span>
              <span className="badge" style={{ background: '#DCFCE7', color: '#16A34A', border: '1px solid #86EFAC', fontWeight: '700', fontSize: '11px' }}>
                <ShieldCheck size={12} />
                <span>NON-SPECULATIVE EVIDENCE ANALYSIS</span>
              </span>
            </div>
            <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Loss Prevention & Dispute Investigation Engine
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
              Evidence-based discrepancy reconciliation comparing declared, verified, and delivered quantities, before-dispatch vs delivery photographs, and cold-chain temperature telemetry logs.
            </p>
          </div>

          <button
            type="button"
            onClick={runInvestigation}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Analyzing Data...' : 'Re-Run Discrepancy Engine'}</span>
          </button>
        </div>
      </div>

      {/* 2. FORENSIC PHOTOGRAPHIC EVIDENCE COMPARISON */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Forensic Condition Split: Before-Dispatch Control vs Delivery-Condition Discrepancy
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Side-by-side produce comparison with real-time temperature excursion sensor graphs and bolt seal analysis.
            </div>
          </div>
          <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', fontWeight: '700', fontSize: '11px' }}>
            TELEMETRY SYNCHRONIZED
          </span>
        </div>

        <SmartImage
          src={ASSETS.LOSS_PREVENTION.FORENSIC_LAB}
          fallbackSrc="/images/loss_discrepancy.jpg"
          alt="Loss Prevention Laboratory: Intact Produce Control Sample vs Excursion Damage Sample with Broken Bolt Seal Analysis"
          aspectRatio="16/9"
          allowZoom={true}
          caption="Left: Control sample maintained at continuous 5.0°C • Right: Subject sample subjected to 28°C thermal excursion for 3.5 hours during Leg 2 dwell with tampered bolt seal"
        />
      </div>

      {/* 3. MULTI-POINT VARIANCE COMPARISON GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Left: Quantitative Parameter Inputs & Reconciliation */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            1. Weight & Transit Variance Parameters
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div className="panel" style={{ padding: '12px', background: '#F8FAFC' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Declared Farm Gate</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {declaredWeight} kg
              </div>
            </div>

            <div className="panel" style={{ padding: '12px', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: '600' }}>Officer Verified</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: '800', color: '#0284C7' }}>
                {verifiedWeight} kg
              </div>
            </div>

            <div className="panel" style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '600' }}>Buyer Delivered</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: '800', color: '#DC2626' }}>
                {deliveredWeight} kg
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#92400E', fontWeight: '700' }}>TOTAL SHORTAGE / SHRINKAGE:</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#B45309' }}>
                -{netShortageKg} kg (-{shortagePct}%)
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#78350F', textAlign: 'right' }}>
              Transit Delay: <b>+{delayHours} hours</b><br />
              Thermal Excursion: <b>{excursionHours} hours</b>
            </div>
          </div>

          {/* Sliders for Simulation Testing */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Simulate Delivered Weight (kg):
            </label>
            <input
              type="range"
              min="3000"
              max="3500"
              step="10"
              value={deliveredWeight}
              onChange={(e) => setDeliveredWeight(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Simulate Thermal Excursion Duration (Hours):
            </label>
            <input
              type="range"
              min="0.0"
              max="10.0"
              step="0.5"
              value={excursionHours}
              onChange={(e) => setExcursionHours(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

        </div>

        {/* Right: Evidence-Based Investigation Dossier */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              2. Evidence-Based Discrepancy Findings
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Dossier #{dossier?.investigation_id || 'INV-8819A'}
            </span>
          </div>

          {/* Root-Cause Contributing Factor Decomposition */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Potential Contributing Factors (Probability Weighted):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(dossier?.contributing_factors_breakdown || [
                { factor_name: 'Refrigeration Unit Thermal Excursion', probability_pct: 65.0, impact: 'Accelerated ripening and water loss.', evidence_basis: '3.5h excursion logged.' },
                { factor_name: 'Transit Delay & Port Dwell', probability_pct: 20.0, impact: 'Evaporative respiration shrinkage.', evidence_basis: '7.5h delay logged.' },
                { factor_name: 'Natural Physiological Respiration', probability_pct: 15.0, impact: 'Standard expected mass loss (~1.2%).', evidence_basis: 'Normal biological transpiration.' }
              ]).map((factor, idx) => (
                <div key={idx} style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    <span>{factor.factor_name}</span>
                    <span style={{ color: '#DC2626' }}>{factor.probability_pct}% Probable</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {factor.evidence_basis} • <i>{factor.impact}</i>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Evidence Checklist */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Missing Evidence Items Checklist:
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '12px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {(dossier?.missing_evidence_checklist || [
                'High-resolution receiving dock unpackaging photographs.',
                'Calibrated pulp temperature probe log at buyer dock.'
              ]).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>

          {/* Recommended Investigation Steps */}
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369A1', marginBottom: '6px' }}>
              Recommended Objective Next Steps:
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '12px', color: '#0284C7', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {(dossier?.recommended_investigation_steps || [
                '1. Download reefer micro-controller memory for Leg 2.',
                '2. Review scale calibration certificates.',
                '3. Calculate allowable biological shrinkage tolerance (1.5%) before escrow debit.'
              ]).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Neutral Disclaimer */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            {dossier?.neutral_investigation_disclaimer || 'This dossier is an evidence-based quantitative compilation. Liability is not automatically assigned to any party until physical and digital sensor logs are jointly verified.'}
          </div>

        </div>

      </div>

    </div>
  );
}
