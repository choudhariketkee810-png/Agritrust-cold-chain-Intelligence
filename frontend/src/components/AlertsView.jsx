import React, { useState } from 'react';
import { 
  BellRing, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  Thermometer, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { triggerAlertCheck } from '../api';

export default function AlertsView({ 
  alertsList = [], 
  onRefresh, 
  onSelectShipment 
}) {
  const [filter, setFilter] = useState('ALL'); // ALL, OPEN, RESOLVED
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const openAlerts = alertsList.filter(a => a.status === 'OPEN');
  const resolvedAlerts = alertsList.filter(a => a.status === 'RESOLVED');

  const filteredAlerts = alertsList.filter(a => {
    if (filter === 'OPEN' && a.status !== 'OPEN') return false;
    if (filter === 'RESOLVED' && a.status !== 'RESOLVED') return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    return true;
  });

  const handleTriggerCheck = async () => {
    setCheckingAlerts(true);
    setCheckResult(null);
    try {
      const res = await triggerAlertCheck();
      setCheckResult(res);
      onRefresh();
    } catch (err) {
      console.error('Error triggering alert check:', err);
    } finally {
      setCheckingAlerts(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BellRing size={20} color="var(--accent-rose)" />
              <h1 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                Cold-Chain Anomaly & Incident Alert Engine
              </h1>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Real-time threshold violation tracking, automatic boundary checks, and prescriptive remediation
            </p>
          </div>

          <button
            onClick={handleTriggerCheck}
            disabled={checkingAlerts}
            className="btn btn-primary"
          >
            <RefreshCw size={14} className={checkingAlerts ? 'animate-spin' : ''} />
            <span>Run Diagnostic Alert Check</span>
          </button>
        </div>

        {/* Diagnostic Check Result Banner */}
        {checkResult && (
          <div className="panel" style={{ marginTop: '14px', padding: '12px 16px', background: '#DCFCE7', borderLeft: '3px solid #16A34A', borderColor: '#86EFAC', fontSize: '12px' }}>
            <div style={{ fontWeight: '800', color: '#15803D' }}>Diagnostic Rule Run Completed</div>
            <div style={{ color: '#166534', marginTop: '2px', fontWeight: '500' }}>
              {checkResult.message || `Processed ${checkResult.alerts_generated || 0} alert rule evaluations.`}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setFilter('ALL')}
              className="btn btn-secondary btn-sm"
              style={{
                background: filter === 'ALL' ? 'var(--bg-panel-light)' : '#FFFFFF',
                borderColor: filter === 'ALL' ? 'var(--color-primary-blue)' : 'var(--border-card)',
                color: filter === 'ALL' ? 'var(--color-dark-blue)' : 'var(--text-secondary)',
                fontWeight: filter === 'ALL' ? '700' : '600'
              }}
            >
              All Alerts ({alertsList.length})
            </button>
            <button
              onClick={() => setFilter('OPEN')}
              className="btn btn-secondary btn-sm"
              style={{
                background: filter === 'OPEN' ? 'var(--accent-rose-bg)' : '#FFFFFF',
                borderColor: filter === 'OPEN' ? 'var(--accent-rose)' : 'var(--border-card)',
                color: filter === 'OPEN' ? '#DC2626' : 'var(--text-secondary)',
                fontWeight: filter === 'OPEN' ? '700' : '600'
              }}
            >
              Active Excursions ({openAlerts.length})
            </button>
            <button
              onClick={() => setFilter('RESOLVED')}
              className="btn btn-secondary btn-sm"
              style={{
                background: filter === 'RESOLVED' ? '#DCFCE7' : '#FFFFFF',
                borderColor: filter === 'RESOLVED' ? '#16A34A' : 'var(--border-card)',
                color: filter === 'RESOLVED' ? '#15803D' : 'var(--text-secondary)',
                fontWeight: filter === 'RESOLVED' ? '700' : '600'
              }}
            >
              Resolved ({resolvedAlerts.length})
            </button>
          </div>

          {/* Severity Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} color="var(--text-muted)" />
            {['ALL', 'CRITICAL', 'WARNING'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className="btn btn-secondary btn-sm"
                style={{
                  background: severityFilter === sev ? '#018180' : '#FFFFFF',
                  color: severityFilter === sev ? '#FFFFFF' : 'var(--text-muted)',
                  borderColor: severityFilter === sev ? '#005E5D' : 'var(--border-card)',
                  fontWeight: severityFilter === sev ? '700' : '600'
                }}
              >
                {sev}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* 2. ALERTS FEED GRID */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAlerts.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: '#FFFFFF' }}>
            <ShieldCheck size={32} color="#16A34A" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: '800', color: '#111827' }}>No Alerts Matching Filter</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Cold chain telemetry is operating safely within all defined boundary ranges.
            </div>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isOpen = alert.status === 'OPEN';
            const createdDate = alert.created_at ? new Date(alert.created_at) : null;
            const resolvedDate = alert.resolved_at ? new Date(alert.resolved_at) : null;

            return (
              <div 
                key={alert.alert_id} 
                className="card" 
                style={{ 
                  padding: '18px 20px', 
                  background: '#FFFFFF',
                  borderLeft: `4px solid ${isOpen ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Alert Top Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${isOpen ? 'badge-critical' : 'badge-normal'}`}>
                      {alert.status}
                    </span>
                    <span className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>
                      Alert #{alert.alert_id} · {alert.alert_type}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>
                      Shipment: {alert.shipment_id || 'AGRI-1001'}
                    </span>
                  </div>

                  <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} />
                    <span>Triggered: {createdDate ? `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()}` : ''}</span>
                  </div>
                </div>

                {/* Message Body */}
                <div style={{ fontSize: '13px', color: '#111827', fontWeight: '600' }}>
                  {alert.message}
                </div>

                {/* Prescriptive Remediation Box */}
                {alert.recommended_action && (
                  <div className="panel" style={{ padding: '10px 14px', background: 'var(--bg-panel-light)', borderLeft: '3px solid var(--color-primary-blue)', borderColor: 'var(--border-card)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Sparkles size={16} color="var(--color-primary-blue)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-dark-blue)', textTransform: 'uppercase' }}>
                        Automated Prescriptive Remediation
                      </div>
                      <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px', fontWeight: '500' }}>
                        {alert.recommended_action}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Stats & Resolution */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span>Trigger Temp: <b style={{ color: isOpen ? '#DC2626' : '#16A34A' }}>{alert.temperature !== null ? `${alert.temperature}°C` : 'N/A'}</b></span>
                    <span>Severity: <b style={{ color: alert.severity === 'CRITICAL' ? '#DC2626' : '#D97706' }}>{alert.severity || 'CRITICAL'}</b></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {resolvedDate && (
                      <span style={{ color: '#16A34A', fontWeight: '700' }}>
                        ✓ Resolved at {resolvedDate.toLocaleTimeString()}
                      </span>
                    )}

                    <button
                      onClick={() => onSelectShipment(alert.shipment_id || 'AGRI-1001')}
                      className="btn btn-secondary btn-sm"
                    >
                      <span>View Live Stream</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
