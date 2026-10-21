import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Radio, 
  Clock, 
  Database,
  Sprout,
  Truck,
  Activity,
  ThermometerSnowflake
} from 'lucide-react';

export default function Header({ 
  lastUpdated, 
  isRefreshing, 
  onRefresh, 
  autoRefresh, 
  setAutoRefresh,
  activeAlertCount,
  openIncidentCount,
  apiConnected
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="card" style={{ padding: '14px 24px', marginBottom: '16px', borderTop: '3px solid #018180', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand & Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="agritrust-logo-badge" style={{
            width: '64px',
            height: '64px',
            padding: '4px',
            flexShrink: 0
          }}>
            <img
              src="/agritrust_logo.png"
              alt="AGRITRUST Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="font-display" style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em', color: '#111827' }}>
                AGRITRUST
              </span>
              <span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 8px' }}>
                ENTERPRISE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-primary-blue)', fontWeight: '700' }}>
                Verified Agriculture. Intelligent Logistics. Trusted Delivery.
              </span>
            </div>
          </div>
        </div>

        {/* Center Live Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* API Connection Health */}
          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', fontSize: '12px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: apiConnected ? '#16A34A' : '#DC2626'
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>PostgreSQL & API:</span>
            <span style={{ fontWeight: '700', color: apiConnected ? '#15803D' : '#DC2626' }}>
              {apiConnected ? 'Online (5432)' : 'Disconnected'}
            </span>
          </div>

          {/* Active Alerts Pill */}
          {activeAlertCount > 0 ? (
            <div className="badge badge-critical" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <ShieldAlert size={14} />
              <span>{activeAlertCount} ACTIVE ALERT{activeAlertCount > 1 ? 'S' : ''}</span>
            </div>
          ) : (
            <div className="badge badge-normal" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <ShieldCheck size={14} />
              <span>TELEMETRY STABLE</span>
            </div>
          )}

          {/* Open Incidents Pill */}
          {openIncidentCount > 0 && (
            <div className="badge badge-warning" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <span>{openIncidentCount} OPEN INCIDENT{openIncidentCount > 1 ? 'S' : ''}</span>
            </div>
          )}

          {/* Clock */}
          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
            <Clock size={13} color="var(--text-muted)" />
            <span className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{timeStr} IST</span>
          </div>
        </div>

        {/* Sync Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="btn btn-secondary btn-sm"
            style={{
              color: autoRefresh ? 'var(--color-primary-blue)' : 'var(--text-muted)',
              borderColor: autoRefresh ? 'var(--border-card-hover)' : 'var(--border-card)'
            }}
            title="Toggle automatic background sync"
          >
            <Radio size={14} className={autoRefresh ? 'animate-pulse-subtle' : ''} />
            <span>{autoRefresh ? 'Live Sync (3s)' : 'Sync Paused'}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-primary btn-sm"
            title="Fetch latest data from FastAPI"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync Now</span>
          </button>
        </div>

      </div>
    </header>
  );
}
