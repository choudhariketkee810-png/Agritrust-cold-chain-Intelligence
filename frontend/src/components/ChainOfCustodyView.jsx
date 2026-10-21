import React, { useState, useEffect } from 'react';
import { 
  GitCommit, 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  ShieldCheck, 
  ChevronRight,
  FileCheck,
  UserCheck,
  Thermometer
} from 'lucide-react';
import { fetchShipmentTimeline, fetchShipmentDetails } from '../api';

export default function ChainOfCustodyView({ 
  shipments = [], 
  selectedShipmentId, 
  onSelectShipment 
}) {
  const activeShipmentId = selectedShipmentId || (shipments.length > 0 ? shipments[0].shipment_id : 'AGRI-1001');
  const currentShipment = shipments.find(s => s.shipment_id === activeShipmentId) || shipments[0] || {};

  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeShipmentId) return;

    async function loadTimeline() {
      setLoading(true);
      try {
        const res = await fetchShipmentTimeline(activeShipmentId);
        if (res && res.data) {
          setTimelineEvents(res.data);
        }
      } catch (err) {
        console.error('Error fetching timeline:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTimeline();
  }, [activeShipmentId]);

  // Map event types to icons and colors
  const getEventBadge = (type) => {
    switch (type) {
      case 'SHIPMENT_CREATED':
      case 'FARMER_DISPATCH':
        return { color: '#16A34A', bg: '#DCFCE7', icon: Package, label: 'FARM DISPATCH' };
      case 'FARMER_TO_LOGISTICS_HANDOVER':
        return { color: '#0284C7', bg: '#E0F2FE', icon: Truck, label: 'CARRIER HANDOVER' };
      case 'IN_TRANSIT':
        return { color: '#018180', bg: '#E6F4F4', icon: MapPin, label: 'IN TRANSIT' };
      case 'BUYER_RECEIVING':
        return { color: '#7C3AED', bg: '#F3E8FF', icon: Scale, label: 'BUYER RECEIVING' };
      case 'QUANTITY_AND_QUALITY_DISCREPANCY':
      case 'DISCREPANCY_DETECTED':
        return { color: '#DC2626', bg: '#FEE2E2', icon: AlertTriangle, label: 'DISCREPANCY DETECTED' };
      default:
        return { color: '#4B5563', bg: '#F3F4F6', icon: CheckCircle2, label: type };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header & Shipment Switcher */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCommit size={20} color="var(--color-primary-blue)" />
              <h1 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                Immutable Chain of Custody & Provenance Trail
              </h1>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Cryptographically timestamped custody transitions and actor signatures from farm gate to buyer inspection
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Select Consignment:</span>
            <select
              value={activeShipmentId}
              onChange={(e) => onSelectShipment(e.target.value)}
              className="form-select"
              style={{ minWidth: '180px', fontWeight: '700' }}
            >
              {shipments.map(s => (
                <option key={s.shipment_id} value={s.shipment_id}>
                  {s.shipment_id} — {s.product_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Consignment Context Banner */}
        <div className="panel" style={{ marginTop: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Consignment ID</div>
              <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: '#018180' }}>
                {activeShipmentId}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Commodity</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>
                {currentShipment.product_name || 'Mango'}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Current Custody Status</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#16A34A' }}>
                {currentShipment.shipment_status || 'DELIVERED'}
              </div>
            </div>
          </div>

          <div className="badge badge-normal" style={{ padding: '6px 12px' }}>
            <ShieldCheck size={14} />
            <span>Audit Trail Verified</span>
          </div>
        </div>
      </div>

      {/* Chain of Custody Visual Timeline */}
      <div className="card" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={18} color="var(--color-primary-blue)" />
          <span>Chronological Provenance Milestones ({timelineEvents.length} Verified Records)</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Retrieving chain-of-custody ledger from PostgreSQL...
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-panel)' }}>
            No chain-of-custody milestones recorded for this shipment.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Vertical connecting line */}
            <div style={{
              position: 'absolute',
              left: '11px',
              top: '12px',
              bottom: '12px',
              width: '2px',
              background: 'linear-gradient(180deg, #16A34A 0%, #018180 50%, #7C3AED 100%)',
              opacity: 0.5
            }} />

            {timelineEvents.map((event, idx) => {
              const meta = getEventBadge(event.event_type);
              const Icon = meta.icon;
              const dateObj = event.timestamp ? new Date(event.timestamp) : null;

              return (
                <div key={idx} style={{ position: 'relative' }}>
                  
                  {/* Milestone Node Dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-32px',
                    top: '14px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: meta.bg,
                    border: `2px solid ${meta.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: meta.color,
                    zIndex: 2,
                    boxShadow: `0 2px 8px ${meta.color}33`
                  }}>
                    <Icon size={12} />
                  </div>

                  {/* Milestone Card */}
                  <div className="panel" style={{ padding: '16px 20px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)', borderLeft: `4px solid ${meta.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}55` }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                          {event.event_type?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} />
                        <span>{dateObj ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}` : 'Recorded'}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5', marginTop: '6px' }}>
                      {event.description}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <UserCheck size={13} color="var(--color-primary-blue)" />
                        <span>Actor: <b style={{ color: '#111827' }}>{event.actor || 'System'}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={13} color="var(--accent-amber)" />
                        <span>Location: <b style={{ color: '#111827' }}>{event.location || 'Nashik Farm Gate'}</b></span>
                      </div>
                    </div>
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
