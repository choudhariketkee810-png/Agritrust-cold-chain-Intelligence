import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Sliders, 
  Sparkles,
  Info
} from 'lucide-react';

export default function AlertsPanel({ alertsList, latestTelemetry, shipmentData }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'OPEN', 'RESOLVED'

  // Extract open alerts
  const openAlerts = alertsList.filter(a => a.status === 'OPEN');
  const resolvedAlerts = alertsList.filter(a => a.status === 'RESOLVED');

  const filteredAlerts = alertsList.filter(a => {
    if (filter === 'OPEN') return a.status === 'OPEN';
    if (filter === 'RESOLVED') return a.status === 'RESOLVED';
    return true;
  });

  const activeIncident = openAlerts.length > 0 ? openAlerts[0] : null;

  return (
    <div className="card" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color={openAlerts.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'} />
            <h2 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
              Autonomous Incident & Alert Engine
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Automated boundary violation detection & prescriptive remediation
          </p>
        </div>

        {/* Filter Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setFilter('ALL')}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              color: filter === 'ALL' ? '#005E5D' : 'var(--text-muted)',
              border: filter === 'ALL' ? '1px solid var(--accent-blue)' : '1px solid var(--border-card)',
              background: filter === 'ALL' ? 'var(--bg-panel-light)' : '#FFFFFF'
            }}
          >
            All ({alertsList.length})
          </button>

          <button
            onClick={() => setFilter('OPEN')}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              color: filter === 'OPEN' ? '#DC2626' : 'var(--text-muted)',
              border: filter === 'OPEN' ? '1px solid var(--accent-rose)' : '1px solid var(--border-card)',
              background: filter === 'OPEN' ? 'var(--accent-rose-bg)' : '#FFFFFF'
            }}
          >
            Active ({openAlerts.length})
          </button>

          <button
            onClick={() => setFilter('RESOLVED')}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              color: filter === 'RESOLVED' ? '#16A34A' : 'var(--text-muted)',
              border: filter === 'RESOLVED' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-card)',
              background: filter === 'RESOLVED' ? 'var(--accent-emerald-bg)' : '#FFFFFF'
            }}
          >
            Resolved ({resolvedAlerts.length})
          </button>
        </div>
      </div>

      {/* ACTIVE INCIDENT BANNER (IF OPEN) */}
      {activeIncident ? (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-glow-rose)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-critical">
                <AlertTriangle size={14} /> ACTIVE CRITICAL INCIDENT
              </span>
              <span style={{ fontSize: '12px', color: '#991B1B', fontWeight: '600' }}>
                Alert #{activeIncident.alert_id} · {activeIncident.alert_type}
              </span>
            </div>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Triggered: {new Date(activeIncident.created_at).toLocaleTimeString()}
            </span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {activeIncident.message}
          </div>

          {/* Prescriptive Recommended Action */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            borderLeft: '3px solid var(--accent-rose)',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <Sparkles size={16} color="var(--accent-rose)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Automated Prescriptive Remediation
              </div>
              <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px', fontWeight: '500' }}>
                {activeIncident.recommended_action || "Inspect refrigeration unit and restore safe operating temperatures."}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16A34A'
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#15803D' }}>
              Zero Open Boundary Violations
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Reefer cargo temperature is operating safely within the defined {shipmentData?.target_temp_min || 10}°C – {shipmentData?.target_temp_max || 13}°C window.
            </div>
          </div>
        </div>
      )}

      {/* Incident Log Feed */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', paddingRight: '4px' }}>
        {filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No incident records found for this filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredAlerts.map(alert => {
              const isOpen = alert.status === 'OPEN';
              const createdDate = alert.created_at ? new Date(alert.created_at) : null;
              const resolvedDate = alert.resolved_at ? new Date(alert.resolved_at) : null;

              return (
                <div 
                  key={alert.alert_id} 
                  className="panel"
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-panel)',
                    borderColor: 'var(--border-card)',
                    borderLeft: `3px solid ${isOpen ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${isOpen ? 'badge-critical' : 'badge-normal'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {alert.status}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>
                        {alert.alert_type}
                      </span>
                    </div>

                    <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {createdDate?.toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {alert.message}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Temp: <b style={{ color: isOpen ? '#DC2626' : '#16A34A' }}>{alert.temperature}°C</b></span>
                    {resolvedDate && (
                      <span style={{ color: '#16A34A', fontWeight: '600' }}>
                        ✓ Resolved at {resolvedDate.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
