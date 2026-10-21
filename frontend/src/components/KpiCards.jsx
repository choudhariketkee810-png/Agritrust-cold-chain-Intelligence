import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Snowflake, 
  Lock, 
  Unlock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Power 
} from 'lucide-react';

export default function KpiCards({ latestTelemetry, shipmentData, previousTelemetry }) {
  if (!latestTelemetry) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: '#FFFFFF' }}>
        Awaiting telemetry stream from PostgreSQL...
      </div>
    );
  }

  const temp = latestTelemetry.temperature;
  const humidity = latestTelemetry.humidity;
  const minTemp = shipmentData?.target_temp_min ?? 10.0;
  const maxTemp = shipmentData?.target_temp_max ?? 13.0;
  const isDoorClosed = latestTelemetry.door_status?.toUpperCase() === 'CLOSED';
  const isRefrigOn = latestTelemetry.refrigeration_status?.toUpperCase() === 'ON';

  // Determine temperature health
  const isNormal = temp >= minTemp && temp <= maxTemp;
  const isHigh = temp > maxTemp;
  const isLow = temp < minTemp;

  // Temperature trend
  let tempDelta = 0;
  if (previousTelemetry && previousTelemetry.temperature !== undefined) {
    tempDelta = (temp - previousTelemetry.temperature).toFixed(2);
  }

  // Calculate thermometer fill percentage (relative to range 0°C to 25°C)
  const tempFillPercent = Math.min(100, Math.max(0, ((temp - 0) / (25 - 0)) * 100));
  const minTargetPercent = ((minTemp - 0) / 25) * 100;
  const maxTargetPercent = ((maxTemp - 0) / 25) * 100;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
      gap: '16px', 
      marginBottom: '20px' 
    }}>
      
      {/* 1. TEMPERATURE CARD */}
      <div className="card" style={{ 
        padding: '20px', 
        background: '#FFFFFF',
        borderLeft: `4px solid ${isNormal ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
        boxShadow: isNormal ? 'var(--shadow-card)' : 'var(--shadow-glow-rose)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: isNormal ? 'var(--accent-emerald-bg)' : 'var(--accent-rose-bg)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: isNormal ? 'var(--accent-emerald)' : 'var(--accent-rose)'
            }}>
              <Thermometer size={18} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cargo Temperature
            </span>
          </div>

          <span className={`badge ${isNormal ? 'badge-normal' : isHigh ? 'badge-critical' : 'badge-warning'}`}>
            {isNormal ? 'NORMAL' : isHigh ? 'HIGH EXCURSION' : 'LOW EXCURSION'}
          </span>
        </div>

        {/* Big Value */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
          <span className="font-mono font-display" style={{ 
            fontSize: '36px', 
            fontWeight: '900', 
            color: isNormal ? '#111827' : '#DC2626',
            letterSpacing: '-0.02em'
          }}>
            {temp?.toFixed(2)}
          </span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-secondary)' }}>°C</span>

          {tempDelta !== 0 && (
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '700', 
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              color: tempDelta > 0 ? '#DC2626' : '#16A34A'
            }}>
              {tempDelta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C
            </span>
          )}
        </div>

        {/* Target Threshold Visual Bar */}
        <div style={{ position: 'relative', height: '10px', background: '#E6F4F4', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border-subtle)' }}>
          {/* Safe Target Zone Box */}
          <div style={{ 
            position: 'absolute', 
            left: `${minTargetPercent}%`, 
            width: `${maxTargetPercent - minTargetPercent}%`, 
            height: '100%', 
            background: 'rgba(22, 163, 74, 0.25)',
            borderLeft: '2px solid #16A34A',
            borderRight: '2px solid #16A34A',
            borderRadius: '2px'
          }} />
          {/* Current Reading Marker */}
          <div style={{ 
            position: 'absolute', 
            left: `calc(${tempFillPercent}% - 4px)`, 
            top: '-3px',
            width: '8px', 
            height: '16px', 
            background: isNormal ? '#16A34A' : '#DC2626',
            borderRadius: '3px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Min: <b style={{ color: 'var(--text-secondary)' }}>{minTemp}°C</b></span>
          <span style={{ fontWeight: '600', color: 'var(--accent-emerald)' }}>Target Safe Band</span>
          <span>Max: <b style={{ color: 'var(--text-secondary)' }}>{maxTemp}°C</b></span>
        </div>
      </div>

      {/* 2. HUMIDITY CARD */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderLeft: '4px solid #018180' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: '#E6F4F4',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#018180'
            }}>
              <Droplets size={18} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Chamber Humidity
            </span>
          </div>

          <span className="badge badge-info">OPTIMAL</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
          <span className="font-mono font-display" style={{ fontSize: '36px', fontWeight: '900', color: '#111827' }}>
            {humidity?.toFixed(1)}
          </span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-secondary)' }}>% RH</span>
        </div>

        <div className="progress-track" style={{ marginBottom: '8px' }}>
          <div 
            className="progress-fill" 
            style={{ 
              width: `${humidity}%`, 
              background: 'linear-gradient(90deg, #018180, #02A2A0)' 
            }} 
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Ambient Sensor</span>
          <span>Target Range: 60% – 75%</span>
        </div>
      </div>

      {/* 3. REEFER UNIT & COMPRESSOR */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderLeft: `4px solid ${isRefrigOn ? '#0284C7' : 'var(--text-muted)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: '#E0F2FE',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#0284C7'
            }}>
              <Snowflake size={18} className={isRefrigOn ? 'animate-spin-slow' : ''} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reefer Compressor
            </span>
          </div>

          <span className={`badge ${isRefrigOn ? 'badge-normal' : 'badge-gray'}`}>
            {isRefrigOn ? 'COOLING ON' : 'IDLE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>
              {isRefrigOn ? 'ACTIVE (AUTO)' : 'STANDBY'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Unit: Carrier Transicold · Set: 11.5°C
            </div>
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: isRefrigOn ? '#DCFCE7' : '#F3F4F6',
            border: `1px solid ${isRefrigOn ? '#86EFAC' : '#E5E7EB'}`,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: isRefrigOn ? '#16A34A' : '#64748B'
          }}>
            <Power size={20} />
          </div>
        </div>

        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Vehicle: <b style={{ color: 'var(--text-secondary)' }}>{shipmentData?.vehicle_number || 'MH15AB1234'}</b></span>
          <span>Cap: {shipmentData?.capacity_kg || 5000} kg</span>
        </div>
      </div>

      {/* 4. DOOR & CARGO SECURITY */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderLeft: `4px solid ${isDoorClosed ? '#16A34A' : '#DC2626'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: isDoorClosed ? '#DCFCE7' : '#FEE2E2',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: isDoorClosed ? '#16A34A' : '#DC2626'
            }}>
              {isDoorClosed ? <Lock size={18} /> : <Unlock size={18} />}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Door Interlock Sensor
            </span>
          </div>

          <span className={`badge ${isDoorClosed ? 'badge-normal' : 'badge-critical'}`}>
            {isDoorClosed ? 'SECURED' : 'UNLOCKED / OPEN'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: isDoorClosed ? '#111827' : '#DC2626' }}>
              {isDoorClosed ? 'SEAL INTACT' : 'DOOR OPEN ALERT'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Rear Cargo Seal #48810-FTL
            </div>
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: isDoorClosed ? '#DCFCE7' : '#FEE2E2',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: isDoorClosed ? '#16A34A' : '#DC2626'
          }}>
            {isDoorClosed ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          </div>
        </div>

        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Status: <b style={{ color: isDoorClosed ? '#16A34A' : '#DC2626' }}>{latestTelemetry.door_status}</b></span>
          <span>Magnetic Hall Effect</span>
        </div>
      </div>

    </div>
  );
}
