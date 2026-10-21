import React, { useState, useEffect, useCallback } from 'react';
import { 
  Warehouse, 
  Layers, 
  Thermometer, 
  Droplets, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  X, 
  Clock, 
  PackageCheck, 
  ShieldAlert, 
  Calendar,
  Building2,
  AlertCircle
} from 'lucide-react';
import { 
  fetchEmergencyRescueCapacity, 
  fetchRescueStorageRequests, 
  actionRescueStorageRequest,
  fetchColdStorageChambers
} from '../api';

export default function ColdStorageEmergencyRescue() {
  const [facilities, setFacilities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [chambers, setChambers] = useState([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load cold storage emergency data
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [facRes, reqRes, chmRes] = await Promise.allSettled([
        fetchEmergencyRescueCapacity(),
        fetchRescueStorageRequests(),
        fetchColdStorageChambers()
      ]);

      if (facRes.status === 'fulfilled') setFacilities(facRes.value?.data || []);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value?.data || []);
      if (chmRes.status === 'fulfilled') setChambers(chmRes.value?.data || []);
    } catch (err) {
      console.error('Error loading cold storage emergency rescue data:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load emergency rescue data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Accept or Reject emergency rescue request
  const handleActionRequest = async (requestId, action, notes = '') => {
    setActionLoading(true);
    setFeedback(null);
    try {
      await actionRescueStorageRequest(requestId, { action, notes });
      setFeedback({
        type: 'success',
        message: `Emergency storage request #${requestId} ${action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'}. Farmer notified.`
      });
      loadData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" color="var(--accent-cyan)" style={{ margin: '0 auto 12px auto' }} />
        <div>Loading Emergency Rescue Capacity & Intake Requests...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 1. HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-cyan)', fontSize: '11px', fontWeight: '800' }}>
                EMERGENCY STORAGE & RESCUE CAPACITY
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cold-Chain Safety Net</span>
            </div>
            <h3 className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Emergency Storage & Spoilage Arrest Chambers
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '800px' }}>
              Offer emergency short-term pre-cooling and controlled atmosphere storage to rescue at-risk farm produce when immediate market delivery cannot be achieved.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Chambers</span>
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div style={{
            marginTop: '16px',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: feedback.type === 'success' ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)'
          }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* 2. INCOMING EMERGENCY RESCUE STORAGE REQUESTS */}
      <div style={{ marginBottom: '28px' }}>
        <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--accent-amber)" />
          Incoming Emergency Rescue Requests ({requests.length})
        </h4>

        {requests.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No pending emergency rescue requests. Facility capacity is registered in the regional cold-chain rescue network.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
            {requests.map((req) => (
              <div key={req.request_id} className="card" style={{ padding: '20px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-cyan)', fontSize: '10px', fontWeight: '800' }}>
                      RESCUE REQUEST #{req.request_id}
                    </span>
                    <h5 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                      {req.product_name} ({req.quantity_mt} MT)
                    </h5>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Farmer: <b>{req.farmer_name}</b> ({req.farmer_phone})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
                      ₹{parseFloat(req.estimated_cost || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {req.duration_days} Days Pre-cooling
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Target Temp:</span> <b style={{ color: 'var(--accent-cyan)' }}>{req.target_temperature}°C</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span> <b style={{ color: req.status === 'ACCEPTED' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>{req.status}</b>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Notes:</span> <span style={{ color: 'var(--text-secondary)' }}>{req.notes || 'Emergency shelf life arrest required.'}</span>
                  </div>
                </div>

                {req.status === 'REQUESTED' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleActionRequest(req.request_id, 'ACCEPT', 'Chamber space reserved.')}
                      disabled={actionLoading}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Check size={14} />
                      <span>Accept Rescue Request</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActionRequest(req.request_id, 'REJECT', 'Chamber capacity full.')}
                      disabled={actionLoading}
                      className="btn btn-secondary btn-sm"
                      style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: '#FB7185' }}
                    >
                      <X size={14} />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. CHAMBER EMERGENCY CAPACITY OVERVIEW */}
      <div>
        <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="var(--accent-cyan)" />
          Available Chamber Capacity & Telemetry Band
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {chambers.map((ch) => (
            <div key={ch.chamber_id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {ch.chamber_name}
                </h5>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>{ch.status}</span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Capacity: <b>{ch.occupied_mt} / {ch.capacity_mt} MT</b> ({((ch.occupied_mt / ch.capacity_mt) * 100).toFixed(0)}% full)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Safe Temp:</span> <b style={{ color: 'var(--accent-emerald)' }}>{ch.target_temp_min}°C – {ch.target_temp_max}°C</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Current Temp:</span> <b style={{ color: 'var(--accent-cyan)' }}>{ch.current_temperature}°C</b>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Compatible:</span> {Array.isArray(ch.compatible_produce) ? ch.compatible_produce.join(', ') : 'Tomatoes, Mango, Fruits'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
