import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Thermometer,
  Droplets,
  Clock,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Activity,
  Compass,
  DollarSign,
  Truck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Info,
  ArrowRight,
  Shield,
  Layers,
  MapPin
} from 'lucide-react';
import SmartImage from './SmartImage';
import { ASSETS, getProduceAsset } from '../assets/images';
import { predictSpoilageRisk, fetchShipments } from '../api';

export default function AiSpoilagePredictor({ onNavigateTab }) {
  // Produce and simulation controls
  const [selectedProduce, setSelectedProduce] = useState('Alphonso Mango');
  const [temperature, setTemperature] = useState(11.8);
  const [humidity, setHumidity] = useState(86.0);
  const [transitHours, setTransitHours] = useState(14.0);
  const [remainingTransitHours, setRemainingTransitHours] = useState(20.0);
  const [cumulativeExcursionMins, setCumulativeExcursionMins] = useState(15);
  const [highestTemp, setHighestTemp] = useState(13.5);
  const [doorOpenings, setDoorOpenings] = useState(1);
  const [reeferStatus, setReeferStatus] = useState('ACTIVE_COOLING');

  // Model calculation state
  const [prediction, setPrediction] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Active shipments
  const [shipments, setShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('SHP-TOMATO-001');

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

  // Run Spoilage Prediction Model
  const runPrediction = async () => {
    setCalculating(true);
    try {
      const res = await predictSpoilageRisk({
        shipment_id: selectedShipmentId,
        product_name: selectedProduce,
        current_temperature_c: parseFloat(temperature),
        current_humidity_pct: parseFloat(humidity),
        transit_duration_hours: parseFloat(transitHours),
        expected_remaining_transit_hours: parseFloat(remainingTransitHours),
        cumulative_thermal_excursion_minutes: parseInt(cumulativeExcursionMins),
        highest_temp_recorded_c: parseFloat(highestTemp),
        door_opening_events: parseInt(doorOpenings),
        reefer_power_status: reeferStatus
      });
      setPrediction(res);
    } catch (err) {
      console.error('Failed to run spoilage prediction:', err);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    runPrediction();
  }, [selectedProduce, temperature, humidity, transitHours, remainingTransitHours, cumulativeExcursionMins, doorOpenings]);

  const produceMeta = getProduceAsset(selectedProduce);

  const riskScore = prediction?.spoilage_risk_assessment?.risk_score || 24.5;
  const riskLevel = prediction?.spoilage_risk_assessment?.risk_level || 'LOW';
  const remainingDays = prediction?.predictive_shelf_life?.remaining_shelf_life_days || 19.5;
  const remainingHours = prediction?.predictive_shelf_life?.remaining_shelf_life_hours || 468.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. HEADER BANNER */}
      <div className="card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D', fontWeight: '800', fontSize: '11px' }}>
                <Sparkles size={12} />
                <span>PREDICTIVE ARRHENIUS KINETIC ENGINE</span>
              </span>
              <span className="badge" style={{ background: '#E0F2FE', color: '#0284C7', border: '1px solid #7DD3FC', fontWeight: '700', fontSize: '11px' }}>
                <Activity size={12} />
                <span>REAL-TIME SENSOR SYNCHRONIZED</span>
              </span>
            </div>
            <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              AI Spoilage Risk Predictor & Kinetic Shelf-Life Monitor
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
              Arrhenius & Q10 thermal degradation equations, multi-factor cold-chain risk scoring, cumulative thermal degree-hours, and decision-support mitigation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={runPrediction}
              disabled={calculating}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={calculating ? 'animate-spin' : ''} />
              <span>{calculating ? 'Calculating Kinetics...' : 'Recalculate Shelf Life'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN WORKSPACE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* LEFT COLUMN: Produce Selection & Live Sensor Controls */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              1. Cargo Profile & Sensor Inputs
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>IoT Telemetry Simulation</span>
          </div>

          {/* Produce Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Target Produce Category:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {Object.keys(ASSETS.PRODUCE).map(key => {
                const isSelected = selectedProduce === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedProduce(key)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid var(--color-primary-blue)' : '1px solid var(--border-card)',
                      background: isSelected ? '#E6F4F4' : '#FFFFFF',
                      color: isSelected ? 'var(--color-primary-blue)' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? '700' : '500',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Produce Showcase Image */}
          <SmartImage
            src={produceMeta.url}
            fallbackSrc={produceMeta.fallback}
            alt={produceMeta.name}
            aspectRatio="16/9"
            allowZoom={true}
            caption={`${produceMeta.name} • Optimal Cold Range: ${produceMeta.tempRange} • Base Shelf Life: ${produceMeta.shelfLifeDays} days`}
          />

          {/* Temperature Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Current Pulp / Air Temperature:</span>
              <span className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: temperature > 13.0 ? '#DC2626' : 'var(--color-primary-blue)' }}>
                {temperature}°C
              </span>
            </div>
            <input
              type="range"
              min="-2.0"
              max="28.0"
              step="0.2"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>-2°C (Frozen/Deep Chill)</span>
              <span style={{ color: '#16A34A', fontWeight: '700' }}>Optimal: {produceMeta.tempRange}</span>
              <span>+28°C (Ambient Break)</span>
            </div>
          </div>

          {/* Humidity Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Relative Humidity (RH %):</span>
              <span className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: humidity < 75 ? '#D97706' : '#0284C7' }}>
                {humidity}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="1"
              value={humidity}
              onChange={(e) => setHumidity(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* Transit Duration & Excursions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Elapsed Transit (Hours):
              </label>
              <input
                type="number"
                value={transitHours}
                onChange={(e) => setTransitHours(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                ETA Destination (Hours):
              </label>
              <input
                type="number"
                value={remainingTransitHours}
                onChange={(e) => setRemainingTransitHours(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Excursion Duration (Min):
              </label>
              <input
                type="number"
                value={cumulativeExcursionMins}
                onChange={(e) => setCumulativeExcursionMins(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Door Opening Events:
              </label>
              <input
                type="number"
                value={doorOpenings}
                onChange={(e) => setDoorOpenings(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Spoilage Risk Gauge, RSL, Factors & Mitigation */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              2. Predictive Risk & Shelf-Life Assessment
            </h3>
            <span className="badge" style={{
              background: riskLevel === 'LOW' ? '#DCFCE7' : riskLevel === 'MODERATE' ? '#FEF3C7' : '#FEE2E2',
              color: riskLevel === 'LOW' ? '#15803D' : riskLevel === 'MODERATE' ? '#B45309' : '#B91C1C',
              fontWeight: '800',
              fontSize: '11px'
            }}>
              {riskLevel} SPOILAGE RISK
            </span>
          </div>

          {/* KPI Dashboard Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            
            <div className="panel" style={{ padding: '14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Spoilage Risk Score</div>
              <div className="font-display" style={{
                fontSize: '24px',
                fontWeight: '800',
                color: riskScore > 60 ? '#DC2626' : riskScore > 30 ? '#D97706' : '#16A34A',
                marginTop: '2px'
              }}>
                {riskScore} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Multi-factor index</div>
            </div>

            <div className="panel" style={{ padding: '14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Remaining Shelf Life</div>
              <div className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: '#0284C7', marginTop: '2px' }}>
                {remainingDays} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>days</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{Math.round(remainingHours)} hours remaining</div>
            </div>

            <div className="panel" style={{ padding: '14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Decay Velocity</div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: '#4F46E5', marginTop: '2px' }}>
                {prediction?.predictive_shelf_life?.shelf_life_decay_velocity || '1.0x'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>vs baseline cold room</div>
            </div>

            <div className="panel" style={{ padding: '14px', background: '#FFFFFF', border: '1px solid var(--border-card)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Transit Buffer</div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: '#16A34A', marginTop: '2px' }}>
                +{prediction?.predictive_shelf_life?.transit_shelf_life_buffer_hours || 448}h
              </div>
              <div style={{ fontSize: '10px', color: '#16A34A', fontWeight: '600' }}>Safe delivery margin</div>
            </div>
          </div>

          {/* Contributing Factor Breakdown */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Contributing Spoilage Factor Decomposition:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Thermal Excursion Impact', score: prediction?.spoilage_risk_assessment?.factor_breakdown?.thermal_stress_impact || 12.0, max: 40, color: '#DC2626' },
                { name: 'Transit Duration & Dwell', score: prediction?.spoilage_risk_assessment?.factor_breakdown?.transit_duration_impact || 8.0, max: 30, color: '#F59E0B' },
                { name: 'Cumulative Excursion Minutes', score: prediction?.spoilage_risk_assessment?.factor_breakdown?.excursion_history_impact || 2.5, max: 20, color: '#6366F1' },
                { name: 'Door Openings & Atmospheric Leak', score: prediction?.spoilage_risk_assessment?.factor_breakdown?.door_opening_impact || 3.0, max: 10, color: '#0284C7' }
              ].map((f, i) => (
                <div key={i} style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                    <span>{f.name}</span>
                    <span style={{ color: f.color }}>{f.score} / {f.max} pts</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(f.score / f.max) * 100}%`, height: '100%', background: f.color, borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decision-Support Corrective Actions */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#16A34A" />
              <span>AI Decision-Support Corrective Interventions:</span>
            </div>

            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '12px', color: '#15803D', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(prediction?.decision_support_corrective_actions || [
                'Maintain current reefer setpoint.',
                'Prioritize express green corridor offloading upon arrival.'
              ]).map((act, idx) => (
                <li key={idx}><b>{act}</b></li>
              ))}
            </ul>
          </div>

          {/* Scientific Model Disclaimer */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            {prediction?.disclaimer || 'Simulated real-time predictive model based on Arrhenius degree-hour kinetics. Shelf-life estimations provided for operational decision support.'}
          </div>

        </div>

      </div>

    </div>
  );
}
