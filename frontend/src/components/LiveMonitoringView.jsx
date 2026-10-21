import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  Snowflake, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Power, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  Sparkles,
  ChevronDown,
  Clock,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchShipmentTelemetry, fetchShipmentRisk } from '../api';

// Route coordinates
const NASHIK_MUMBAI_CORRIDOR = [
  [19.9975, 73.7898],
  [19.9542, 73.7431],
  [19.8821, 73.6654],
  [19.7042, 73.5621],
  [19.6389, 73.4912],
  [19.4678, 73.3421],
  [19.3512, 73.2045],
  [19.2183, 72.9781],
  [19.0760, 72.8777]
];

function MapAutoPan({ position, autoCenter }) {
  const map = useMap();
  useEffect(() => {
    if (autoCenter && position && position[0] && position[1]) {
      map.panTo(position, { animate: true, duration: 1.0 });
    }
  }, [position, autoCenter, map]);
  return null;
}

export default function LiveMonitoringView({ 
  shipments = [], 
  selectedShipmentId, 
  onSelectShipment 
}) {
  const activeShipmentId = selectedShipmentId || (shipments.length > 0 ? shipments[0].shipment_id : 'AGRI-1001');
  const currentShipment = shipments.find(s => s.shipment_id === activeShipmentId) || shipments[0] || {};

  const [telemetryList, setTelemetryList] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHumidity, setShowHumidity] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);

  // Poll shipment telemetry & risk
  useEffect(() => {
    if (!activeShipmentId) return;

    let isMounted = true;
    async function loadData() {
      try {
        const [telRes, riskRes] = await Promise.allSettled([
          fetchShipmentTelemetry(activeShipmentId, 40),
          fetchShipmentRisk(activeShipmentId)
        ]);

        if (isMounted) {
          if (telRes.status === 'fulfilled' && telRes.value.data) {
            setTelemetryList(telRes.value.data);
          }
          if (riskRes.status === 'fulfilled' && riskRes.value) {
            setRiskData(riskRes.value);
          }
        }
      } catch (err) {
        console.warn('Error fetching telemetry:', err);
      }
    }

    loadData();
    const interval = setInterval(loadData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeShipmentId]);

  const latestTelemetry = telemetryList.length > 0 ? telemetryList[0] : null;
  const previousTelemetry = telemetryList.length > 1 ? telemetryList[1] : null;

  const minTemp = currentShipment.target_temp_min ?? 10.0;
  const maxTemp = currentShipment.target_temp_max ?? 13.0;

  // Temperature calculations
  const temp = latestTelemetry?.temperature ?? 12.0;
  const humidity = latestTelemetry?.humidity ?? 75.0;
  const isDoorClosed = latestTelemetry?.door_status?.toUpperCase() === 'CLOSED';
  const isRefrigOn = latestTelemetry?.refrigeration_status?.toUpperCase() === 'ON';
  const isNormal = temp >= minTemp && temp <= maxTemp;
  const isHigh = temp > maxTemp;

  let tempDelta = 0;
  if (previousTelemetry && typeof previousTelemetry.temperature === 'number' && typeof temp === 'number') {
    tempDelta = (temp - previousTelemetry.temperature).toFixed(2);
  }

  // Chart data in chronological order
  const chartData = useMemo(() => {
    if (!telemetryList || telemetryList.length === 0) return [];
    return [...telemetryList]
      .reverse()
      .map((item, idx) => {
        const time = item.recorded_at ? new Date(item.recorded_at) : null;
        const timeLabel = time ? time.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }) : `#${idx + 1}`;
        return {
          id: item.telemetry_id,
          time: timeLabel,
          temperature: typeof item.temperature === 'number' ? Number(item.temperature.toFixed(2)) : null,
          humidity: typeof item.humidity === 'number' ? Number(item.humidity.toFixed(1)) : null,
          door_status: item.door_status,
          refrigeration_status: item.refrigeration_status,
          isSafe: typeof item.temperature === 'number' ? (item.temperature >= minTemp && item.temperature <= maxTemp) : true
        };
      });
  }, [telemetryList, minTemp, maxTemp]);

  // GPS Position & breadcrumbs
  const currentPos = useMemo(() => {
    if (latestTelemetry && latestTelemetry.latitude && latestTelemetry.longitude) {
      return [latestTelemetry.latitude, latestTelemetry.longitude];
    }
    return [19.9975, 73.7898];
  }, [latestTelemetry]);

  const breadcrumbs = useMemo(() => {
    if (!telemetryList || telemetryList.length === 0) return [];
    return telemetryList
      .filter(t => t.latitude && t.longitude)
      .map(t => [t.latitude, t.longitude]);
  }, [telemetryList]);

  // Map icon
  const customTruckIcon = useMemo(() => {
    const markerColor = isNormal ? '#06B6D4' : '#F43F5E';
    return L.divIcon({
      className: 'custom-radar-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div class="radar-ping" style="background: ${markerColor}44;"></div>
          <div class="radar-center" style="background: linear-gradient(135deg, #0F172A, ${markerColor}); border-color: ${markerColor}; box-shadow: 0 0 16px ${markerColor};">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -24]
    });
  }, [isNormal]);

  const createWaypointIcon = (label, color) => {
    return L.divIcon({
      className: 'waypoint-icon',
      html: `
        <div style="background: #FFFFFF; border: 2px solid ${color}; color: #111827; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(47, 128, 237, 0.15); display: flex; align-items: center; gap: 4px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: ${color};"></span>
          ${label}
        </div>
      `,
      iconSize: [70, 20],
      iconAnchor: [35, 10]
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP SHIPMENT SELECTOR & CONTEXT */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'var(--bg-panel-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-blue)',
              border: '1px solid var(--border-card)'
            }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
                  Live Telemetry Stream
                </span>
                <span className="badge badge-normal" style={{ fontSize: '10px' }}>
                  ACTIVE SENSOR STREAM
                </span>
                {activeShipmentId?.includes('DEMO') && (
                  <span className="badge badge-demo" style={{ fontSize: '10px' }}>DEMO DATA</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Perishable Cargo: <b style={{ color: '#111827' }}>{currentShipment.product_name || 'Mango'}</b> · Vehicle: {currentShipment.vehicle_number || 'MH15AB1234'}
              </div>
            </div>
          </div>

          {/* Shipment Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Monitoring Consignment:</span>
            <select
              value={activeShipmentId}
              onChange={(e) => onSelectShipment(e.target.value)}
              className="form-select"
              style={{ minWidth: '180px', fontWeight: '700' }}
            >
              {shipments.map(s => (
                <option key={s.shipment_id} value={s.shipment_id}>
                  {s.shipment_id} — {s.product_name} ({s.shipment_status || 'ACTIVE'}){s.shipment_id?.includes('DEMO') ? ' [DEMO]' : ''}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. THERMAL STATUS INTELLIGENCE STRIP */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ 
        padding: '16px 20px', 
        borderLeft: `4px solid ${isNormal ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
        background: isNormal ? '#FFFFFF' : '#FEF2F2'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', alignItems: 'center' }}>
          
          {/* CURRENT */}
          <div className="panel" style={{ padding: '10px 14px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CURRENT</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: '900', color: isNormal ? '#111827' : '#DC2626', marginTop: '2px' }}>
              {temp?.toFixed(2)} °C
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Chamber core probe
            </div>
          </div>

          {/* TARGET */}
          <div className="panel" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TARGET</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: '800', color: '#34D399', marginTop: '2px' }}>
              {minTemp}°C – {maxTemp}°C
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Optimal preservation SLA
            </div>
          </div>

          {/* TREND */}
          <div className="panel" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TREND</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: '800', color: tempDelta > 0 ? '#FB7185' : tempDelta < 0 ? '#38BDF8' : '#34D399', marginTop: '2px' }}>
              {tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {tempDelta > 0 ? 'Temperature rising' : tempDelta < 0 ? 'Temperature cooling' : 'Stable thermal state'}
            </div>
          </div>

          {/* STATUS */}
          <div className="panel" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>STATUS</div>
            <div style={{ marginTop: '6px' }}>
              <span className={`badge ${isNormal ? 'badge-normal' : isHigh ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '12px', padding: '4px 10px' }}>
                {isNormal ? 'NORMAL' : isHigh ? 'HIGH RISK' : 'LOW RISK'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Deterministic risk rating
            </div>
          </div>

        </div>

        {/* FACTUAL OPERATIONAL REASON */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Operational Reason:</span>
            <span style={{ color: isNormal ? 'var(--accent-emerald-light)' : '#FB7185' }}>
              {isNormal 
                ? 'Temperature operates within configured preservation range.' 
                : isHigh 
                  ? `Temperature (${temp?.toFixed(2)}°C) exceeds configured maximum target (${maxTemp}°C).`
                  : `Temperature (${temp?.toFixed(2)}°C) below configured minimum target (${minTemp}°C).`
              }
            </span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sensor cycle: 5 seconds · PostgreSQL telemetry stream
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. REAL-TIME SENSOR GAUGES (4 CARDS) */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        
        {/* Temperature Gauge */}
        <div className="card" style={{ padding: '18px', borderLeft: `4px solid ${isNormal ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Chamber Temperature
            </span>
            <span className={`badge ${isNormal ? 'badge-normal' : isHigh ? 'badge-critical' : 'badge-warning'}`}>
              {isNormal ? 'NORMAL' : isHigh ? 'HIGH EXCURSION' : 'LOW EXCURSION'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: '800', color: isNormal ? 'var(--text-primary)' : 'var(--accent-rose)' }}>
              {temp?.toFixed(2)}
            </span>
            <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-secondary)' }}>°C</span>
            {tempDelta !== 0 && (
              <span style={{ fontSize: '12px', fontWeight: '600', marginLeft: 'auto', color: tempDelta > 0 ? '#FB7185' : '#34D399', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {tempDelta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C
              </span>
            )}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Target: <b style={{ color: 'var(--text-secondary)' }}>{minTemp}°C – {maxTemp}°C</b></span>
            <span>Tolerance: ±0.5°C</span>
          </div>
        </div>

        {/* Humidity */}
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Chamber Humidity
            </span>
            <span className="badge badge-info">OPTIMAL</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {humidity?.toFixed(1)}
            </span>
            <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-secondary)' }}>% RH</span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Relative Humidity</span>
            <span>Target: 60% – 85%</span>
          </div>
        </div>

        {/* Reefer Unit */}
        <div className="card" style={{ padding: '18px', borderLeft: `4px solid ${isRefrigOn ? 'var(--accent-cyan)' : 'var(--text-muted)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Reefer Compressor
            </span>
            <span className={`badge ${isRefrigOn ? 'badge-normal' : 'badge-gray'}`}>
              {isRefrigOn ? 'COOLING ON' : 'IDLE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {isRefrigOn ? 'ACTIVE (AUTO)' : 'STANDBY'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Continuous cycle mode
              </div>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isRefrigOn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: `1px solid ${isRefrigOn ? '#10B981' : '#64748B'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isRefrigOn ? '#10B981' : '#64748B'
            }}>
              <Power size={18} />
            </div>
          </div>
        </div>

        {/* Door Interlock */}
        <div className="card" style={{ padding: '18px', borderLeft: `4px solid ${isDoorClosed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Door Interlock Sensor
            </span>
            <span className={`badge ${isDoorClosed ? 'badge-normal' : 'badge-critical'}`}>
              {isDoorClosed ? 'SECURED' : 'UNLOCKED / OPEN'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: isDoorClosed ? 'var(--text-primary)' : 'var(--accent-rose)' }}>
                {isDoorClosed ? 'SEAL INTACT' : 'DOOR OPEN ALERT'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Hall Effect magnetic sensor
              </div>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isDoorClosed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              border: `1px solid ${isDoorClosed ? '#10B981' : '#FB7185'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDoorClosed ? '#34D399' : '#FB7185'
            }}>
              {isDoorClosed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MULTI-DIMENSIONAL RISK ENGINE EVALUATION */}
      {/* ------------------------------------------------------------- */}
      {riskData && (
        <div className="card" style={{ padding: '20px', borderLeft: `4px solid ${riskData.risk_level === 'CRITICAL' ? 'var(--accent-rose)' : riskData.risk_level === 'HIGH' ? 'var(--accent-rose)' : riskData.risk_level === 'WARNING' ? 'var(--accent-amber)' : 'var(--accent-emerald)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={18} color="var(--accent-cyan)" />
              <div>
                <h3 className="font-display" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Deterministic Risk Engine Assessment
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Multi-factor telemetry rules evaluate temperature deviation, trend velocity, door states, and active excursion durations
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Score: {riskData.risk_score}/100
              </div>
              <span className={`badge ${riskData.risk_level === 'CRITICAL' ? 'badge-critical' : riskData.risk_level === 'HIGH' ? 'badge-critical' : riskData.risk_level === 'WARNING' ? 'badge-warning' : 'badge-normal'}`}>
                {riskData.risk_level}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Factual Reasons */}
            <div className="panel" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Identified Operational Factors
              </div>
              {riskData.risk_reasons?.length > 0 ? (
                <ul style={{ paddingLeft: '16px', fontSize: '12px', color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {riskData.risk_reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--accent-emerald-light)' }}>
                  ✓ All continuous telemetry parameters within designated quality bands.
                </div>
              )}
            </div>

            {/* Recommended Prescriptive Remediations */}
            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid var(--accent-cyan)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} />
                <span>Prescriptive Remediation</span>
              </div>
              {riskData.recommended_actions?.length > 0 ? (
                <ul style={{ paddingLeft: '16px', fontSize: '12px', color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {riskData.recommended_actions.map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Standard nominal monitoring protocol active.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. ROLLING TELEMETRY CHART & LIVE GIS MAP */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '16px' }}>
        
        {/* Rolling Telemetry Chart */}
        <div className="card" style={{ padding: '20px', minHeight: '440px', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
                Real-Time Temperature & Humidity Stream
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Target Safe Band: <b style={{ color: '#15803D' }}>{minTemp}°C – {maxTemp}°C</b> · Live Database Ingestion
              </div>
            </div>

            <button
              onClick={() => setShowHumidity(!showHumidity)}
              className="btn btn-secondary btn-sm"
            >
              <Droplets size={12} />
              <span>{showHumidity ? 'Hide Humidity' : 'Show Humidity'}</span>
            </button>
          </div>

          <div style={{ flex: 1, minHeight: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2EEF8" vertical={false} />
                <XAxis dataKey="time" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D9EAF7' }} />
                <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D9EAF7' }} tickFormatter={(v) => `${v}°C`} />
                {showHumidity && (
                  <YAxis yAxisId="right" orientation="right" domain={[50, 90]} stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                )}

                {/* Target Safe Band Shading */}
                <ReferenceArea yAxisId="left" y1={minTemp} y2={maxTemp} fill="rgba(22, 163, 74, 0.08)" stroke="rgba(22, 163, 74, 0.3)" strokeDasharray="4 4" />
                <ReferenceLine yAxisId="left" y={maxTemp} stroke="#DC2626" strokeDasharray="3 3" />
                <ReferenceLine yAxisId="left" y={minTemp} stroke="#D97706" strokeDasharray="3 3" />

                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#FFFFFF', border: '1px solid var(--border-card-hover)', borderRadius: 'var(--radius-md)', padding: '10px 14px', minWidth: '160px', boxShadow: 'var(--shadow-modal)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ping {label}</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: d.isSafe ? '#16A34A' : '#DC2626' }}>
                            Temp: {d.temperature} °C
                          </div>
                          {d.humidity !== null && (
                            <div style={{ fontSize: '12px', color: '#018180', marginTop: '2px', fontWeight: '700' }}>
                              Humidity: {d.humidity} %
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Door: <b style={{ color: d.door_status === 'CLOSED' ? '#16A34A' : '#DC2626' }}>{d.door_status}</b> · Reefer: <b style={{ color: '#16A34A' }}>{d.refrigeration_status}</b>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} 
                />

                <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#018180" strokeWidth={2.5} dot={{ r: 3, fill: '#018180' }} isAnimationActive={false} />
                {showHumidity && (
                  <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#7C3AED" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live GIS Map */}
        <div className="card" style={{ padding: '20px', minHeight: '440px', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
                Live GPS Transit Telematics
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Nashik APMC Hub → Mumbai JNPT Export Corridor (NH160)
              </div>
            </div>

            <button
              onClick={() => setAutoCenter(!autoCenter)}
              className="btn btn-secondary btn-sm"
            >
              <MapPin size={12} color={autoCenter ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              <span>{autoCenter ? 'Auto-Tracking' : 'Free Pan'}</span>
            </button>
          </div>

          <div style={{ flex: 1, minHeight: '320px', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-subtle)' }}>
            <MapContainer
              center={currentPos}
              zoom={10}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapAutoPan position={currentPos} autoCenter={autoCenter} />

              <Polyline positions={NASHIK_MUMBAI_CORRIDOR} pathOptions={{ color: '#38BDF8', weight: 2.5, opacity: 0.45, dashArray: '6, 6' }} />
              {breadcrumbs.length > 1 && (
                <Polyline positions={breadcrumbs} pathOptions={{ color: '#06B6D4', weight: 4, opacity: 0.9 }} />
              )}

              <Marker position={[19.9975, 73.7898]} icon={createWaypointIcon('ORIGIN: NASHIK', '#10B981')}>
                <Popup>Origin: Nashik Farm Hub</Popup>
              </Marker>

              <Marker position={[19.0760, 72.8777]} icon={createWaypointIcon('DEST: MUMBAI', '#F59E0B')}>
                <Popup>Destination: Mumbai Buyer Facility</Popup>
              </Marker>

              <Marker position={currentPos} icon={customTruckIcon}>
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <b>{currentShipment.vehicle_number || 'MH15AB1234'}</b><br />
                    Temp: {temp?.toFixed(2)} °C<br />
                    Humidity: {humidity?.toFixed(1)} %<br />
                    Reefer: {latestTelemetry?.refrigeration_status}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
