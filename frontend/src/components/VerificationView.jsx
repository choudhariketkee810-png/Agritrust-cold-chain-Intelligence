import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  Package, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  Scale, 
  ThermometerSnowflake, 
  FileCheck2, 
  Lock, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { verifyShipment, getQrCodeUrl } from '../api';

export default function VerificationView({ 
  shipments = [], 
  initialShipmentId,
  onNavigateShipment 
}) {
  const [queryId, setQueryId] = useState(initialShipmentId || (shipments.length > 0 ? shipments[0].shipment_id : 'AGRI-1001'));
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (idToVerify) => {
    const target = idToVerify || queryId;
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyShipment(target.trim());
      setVerificationResult(res);
    } catch (err) {
      setError(err.message || 'Verification failed. Consignment ID not found.');
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialShipmentId) {
      setQueryId(initialShipmentId);
      handleVerify(initialShipmentId);
    } else if (shipments.length > 0) {
      handleVerify(shipments[0].shipment_id);
    }
  }, [initialShipmentId, shipments]);

  const original = verificationResult?.verified_original_record;
  const custodySummary = verificationResult?.chain_of_custody_summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. TOP HEADER & VERIFICATION INPUT */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={22} color="var(--brand-primary)" />
              <h1 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                AGRITRUST Public Consignment Verification Portal
              </h1>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Verify cryptographic farm-gate digital identity and compare immutable dispatch baseline against transport events
            </p>
          </div>

          <div className="badge badge-normal" style={{ padding: '6px 14px' }}>
            <ShieldCheck size={16} />
            <span>Cryptographically Verified</span>
          </div>
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleVerify(); }}
          style={{ display: 'flex', gap: '10px', marginTop: '20px', maxWidth: '600px' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              placeholder="Enter Shipment / QR Identifier (e.g. AGRI-1001)..."
              value={queryId}
              onChange={(e) => setQueryId(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', height: '42px', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ height: '42px', padding: '0 20px' }}
          >
            {loading ? 'Verifying...' : 'Verify Consignment'}
          </button>
        </form>

        {/* Quick select pills */}
        {shipments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Quick Select:</span>
            {shipments.slice(0, 4).map(s => (
              <button
                key={s.shipment_id}
                onClick={() => {
                  setQueryId(s.shipment_id);
                  handleVerify(s.shipment_id);
                }}
                className="btn btn-secondary btn-sm"
              >
                {s.shipment_id} ({s.product_name})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. ERROR STATE */}
      {error && (
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-rose)', background: 'var(--rose-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)', fontWeight: '600' }}>
            <AlertTriangle size={18} />
            <span>Verification Error: {error}</span>
          </div>
        </div>
      )}

      {/* 3. VERIFIED RESULTS DOSSIER */}
      {verificationResult && original && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* VERIFIED BANNER */}
          <div className="card" style={{ 
            padding: '24px', 
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#DCFCE7',
                border: '2px solid #16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16A34A',
                boxShadow: '0 2px 10px rgba(22, 163, 74, 0.2)'
              }}>
                <CheckCircle2 size={28} />
              </div>

              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803D', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>✓ SHIPMENT RECORD VERIFIED</span>
                  {queryId?.includes('DEMO') && (
                    <span className="badge badge-demo" style={{ fontSize: '11px' }}>DEMO DATA</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                  Cryptographic Hash Validated · Farm-gate baseline signed by <b style={{ color: '#14532D' }}>{original.created_by || 'Farmer'}</b>
                </div>
              </div>
            </div>

            {/* QR Code thumbnail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0', boxShadow: 'var(--shadow-sm)' }}>
              <img 
                src={getQrCodeUrl(queryId)} 
                alt="Verification QR" 
                style={{ width: '48px', height: '48px', borderRadius: '4px', background: '#FFFFFF', padding: '2px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Scan with mobile to</span><br />
                <b style={{ color: 'var(--brand-primary)' }}>re-verify anytime</b>
              </div>
            </div>
          </div>

          {/* TWO CLEARLY DISTINGUISHED PANELS: ORIGINAL BASELINE vs DOWNSTREAM EVENTS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            
            {/* PANEL A: ORIGINAL VERIFIED RECORD (IMMUTABLE) */}
            <div className="card" style={{ padding: '22px', borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} color="var(--accent-emerald)" />
                  <h2 className="font-display" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    ORIGINAL VERIFIED RECORD (IMMUTABLE)
                  </h2>
                </div>
                <span className="badge badge-normal">FARM GATE BASELINE</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Shipment ID:</span>
                  <b className="font-mono" style={{ color: 'var(--brand-primary)' }}>{original.shipment_id}</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Product Name:</span>
                  <b style={{ color: 'var(--text-primary)' }}>{original.product_name}</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Original Total Quantity:</span>
                  <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{original.total_quantity} kg</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Grade A Quantity:</span>
                  <b className="font-mono" style={{ color: 'var(--accent-emerald)' }}>{original.grade_a_quantity} kg</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Grade B Quantity:</span>
                  <b className="font-mono" style={{ color: 'var(--accent-amber)' }}>{original.grade_b_quantity} kg</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Origin Point:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{original.origin}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Destination Point:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{original.destination}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Vehicle:</span>
                  <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{original.vehicle_number}</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Preservation Temp Range:</span>
                  <b className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                    {original.target_temperature_range?.min}°C – {original.target_temperature_range?.max}°C
                  </b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Timestamp Recorded:</span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {original.created_at ? new Date(original.created_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* PANEL B: DOWNSTREAM ACTIONS & RECEIVING EVENTS */}
            <div className="card" style={{ padding: '22px', borderLeft: '4px solid var(--brand-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} color="var(--brand-primary)" />
                  <h2 className="font-display" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    DOWNSTREAM HANDOVER & RECEIVING EVENTS
                  </h2>
                </div>
                <span className="badge badge-info">LOGISTICS & BUYER</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                
                {/* Handover Milestone */}
                <div className="panel" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Logistics Handover Milestone
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                    Status: <b style={{ color: custodySummary?.handover_completed ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {custodySummary?.handover_completed ? 'COMPLETED' : 'PENDING'}
                    </b>
                  </div>
                  {custodySummary?.handover_timestamp && (
                    <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Handed over at: {new Date(custodySummary.handover_timestamp).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Buyer Receiving Milestone */}
                <div className="panel" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand-dark)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Buyer Receiving & Inspection Milestone
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                    Status: <b style={{ color: custodySummary?.buyer_received ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {custodySummary?.buyer_received ? 'RECEIVED & INSPECTED' : 'IN TRANSIT'}
                    </b>
                  </div>
                  {custodySummary?.receiving_timestamp && (
                    <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Received at: {new Date(custodySummary.receiving_timestamp).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Sent vs Received Discrepancy Note */}
                {verificationResult.sent_vs_received_discrepancy && (
                  <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid var(--accent-rose)', background: 'var(--rose-light)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-rose)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Variance Flagged
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                      {verificationResult.sent_vs_received_discrepancy.details || 'Receiving record differed from initial dispatch baseline.'}
                    </div>
                  </div>
                )}

                {/* Trust Guarantee Note */}
                <div style={{ padding: '10px 12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  🛡️ <b>AGRITRUST Protocol Note:</b> Downstream custody actions, telemetry alerts, and receiving records never alter or overwrite the farmer's initial immutable dispatch record.
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
