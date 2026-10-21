import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Legend
} from 'recharts';
import { Activity, Thermometer, Droplets, Sliders, Maximize2 } from 'lucide-react';

export default function TelemetryChart({ telemetryList, shipmentData }) {
  const [showHumidity, setShowHumidity] = useState(true);

  const minTemp = shipmentData?.target_temp_min ?? 10.0;
  const maxTemp = shipmentData?.target_temp_max ?? 13.0;

  // Format telemetry list in chronological order (oldest to newest)
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

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-card-hover)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-modal)',
          minWidth: '180px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ping ID #{data.id}</span>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: '700' }}>{label}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-primary-blue)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                <Thermometer size={13} /> Temp:
              </span>
              <span className="font-mono" style={{ 
                fontSize: '13px', 
                fontWeight: '800', 
                color: data.isSafe ? '#16A34A' : '#DC2626' 
              }}>
                {data.temperature} °C
              </span>
            </div>

            {data.humidity !== null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <Droplets size={13} /> Humidity:
                </span>
                <span className="font-mono" style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                  {data.humidity} %
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Door: <b style={{ color: data.door_status === 'CLOSED' ? '#16A34A' : '#DC2626' }}>{data.door_status}</b></span>
              <span>Reefer: <b style={{ color: '#16A34A' }}>{data.refrigeration_status}</b></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--color-primary-blue)" />
            <h2 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
              Real-Time Sensor Telemetry Stream
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Target Safe Zone Band: <b style={{ color: '#15803D' }}>{minTemp}°C – {maxTemp}°C</b> · Continuous 5s Polling
          </p>
        </div>

        {/* Graph Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowHumidity(!showHumidity)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '700',
              color: showHumidity ? '#7C3AED' : 'var(--text-muted)',
              border: showHumidity ? '1px solid #D8B4FE' : '1px solid var(--border-card)',
              background: showHumidity ? '#F3E8FF' : '#FFFFFF'
            }}
          >
            <Droplets size={12} />
            <span>{showHumidity ? 'Humidity Curve Visible' : 'Hide Humidity'}</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ flex: 1, minHeight: '320px', width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#018180" />
                <stop offset="100%" stopColor="#02A2A0" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#DCEEED" vertical={false} />

            <XAxis 
              dataKey="time" 
              stroke="#6B7280" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: '#CFE8E7' }}
            />

            <YAxis 
              yAxisId="left"
              domain={['auto', 'auto']} 
              stroke="#6B7280" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: '#CFE8E7' }}
              tickFormatter={(v) => `${v}°C`}
            />

            {showHumidity && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[50, 90]} 
                stroke="#6B7280" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
            )}

            {/* Shaded Target Safe Band */}
            <ReferenceArea 
              yAxisId="left"
              y1={minTemp} 
              y2={maxTemp} 
              fill="rgba(22, 163, 74, 0.08)" 
              stroke="rgba(22, 163, 74, 0.3)" 
              strokeDasharray="4 4"
            />

            <ReferenceLine yAxisId="left" y={maxTemp} stroke="#DC2626" strokeDasharray="3 3" label={{ value: `Max ${maxTemp}°C`, fill: '#DC2626', fontSize: 10, position: 'right' }} />
            <ReferenceLine yAxisId="left" y={minTemp} stroke="#D97706" strokeDasharray="3 3" label={{ value: `Min ${minTemp}°C`, fill: '#D97706', fontSize: 10, position: 'right' }} />

            <Tooltip content={<CustomTooltip />} />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              name="Temperature (°C)"
              stroke="url(#tempGradient)"
              strokeWidth={3}
              dot={{ r: 4, fill: '#018180', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 7, fill: '#005E5D', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {showHumidity && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                name="Humidity (% RH)"
                stroke="#7C3AED"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Safe zone pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', background: '#018180', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Cargo Temperature</span>
          </span>
          {showHumidity && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '2px', background: '#7C3AED', borderTop: '2px dashed #7C3AED' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Relative Humidity</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', background: 'rgba(22, 163, 74, 0.25)', border: '1px solid #16A34A', borderRadius: '2px' }} />
          <span style={{ fontWeight: '600', color: '#15803D' }}>Optimal Preservation Band ({minTemp}°C - {maxTemp}°C)</span>
        </div>
      </div>

    </div>
  );
}
