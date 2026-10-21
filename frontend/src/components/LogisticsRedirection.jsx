import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, 
  MapPin, 
  Navigation as NavIcon, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  X, 
  ShieldCheck, 
  Thermometer, 
  Radio, 
  Sliders, 
  Users,
  Activity,
  AlertCircle
} from 'lucide-react';
import { 
  fetchMarketplaceOffers, 
  logisticsActionOnOffer, 
  fetchShipmentRedirectionRequests, 
  fetchLogisticsDrivers, 
  fetchLogisticsVehicles,
  fetchShipmentRouteHistory
} from '../api';

export default function LogisticsRedirection() {
  const [offers, setOffers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedOfferForAction, setSelectedOfferForAction] = useState(null);

  // Action form
  const [actionForm, setActionForm] = useState({
    vehicle_id: 'FTL-V001',
    driver_id: '',
    revised_logistics_cost: 850.0,
    estimated_travel_time_hours: 1.0,
    notes: 'Driver confirmed detour route along Thane-Ghodbunder bypass is clear.'
  });

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  // Load logistics redirection data
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [offRes, drvRes, vehRes] = await Promise.allSettled([
        fetchMarketplaceOffers(),
        fetchLogisticsDrivers(),
        fetchLogisticsVehicles()
      ]);

      if (offRes.status === 'fulfilled') setOffers(offRes.value?.data || []);
      if (drvRes.status === 'fulfilled') {
        const dList = drvRes.value?.data || [];
        setDrivers(dList);
        if (dList.length > 0) {
          setActionForm(prev => ({ ...prev, driver_id: dList[0].driver_id }));
        }
      }
      if (vehRes.status === 'fulfilled') setVehicles(vehRes.value?.data || []);
    } catch (err) {
      console.error('Error loading logistics redirection data:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load redirection requests' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Logistics Action (Approve / Reject route feasibility)
  const handleLogisticsAction = async (actionType) => {
    if (!selectedOfferForAction) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        action: actionType,
        vehicle_id: actionForm.vehicle_id,
        driver_id: actionForm.driver_id,
        revised_logistics_cost: parseFloat(actionForm.revised_logistics_cost),
        estimated_travel_time_hours: parseFloat(actionForm.estimated_travel_time_hours),
        notes: actionForm.notes
      };

      await logisticsActionOnOffer(selectedOfferForAction.offer_id, payload);
      setFeedback({
        type: 'success',
        message: `Redirection route ${actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED'} for Offer #${selectedOfferForAction.offer_id}. Farmer notified for final authorization.`
      });
      setShowActionModal(false);
      setSelectedOfferForAction(null);
      loadData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingOffers = offers.filter(o => o.status === 'BUYER_ACCEPTED');
  const activeRedirectedOffers = offers.filter(o => ['LOGISTICS_APPROVED', 'FARMER_CONFIRMED', 'DELIVERED'].includes(o.status));

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" color="var(--accent-amber)" style={{ margin: '0 auto 12px auto' }} />
        <div>Loading Dynamic Route Redirection Requests & Detour Corridor Telemetry...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 1. HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', fontSize: '11px', fontWeight: '800' }}>
                DYNAMIC ROUTE MANAGEMENT
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Emergency Detour & Redirection Corridor</span>
            </div>
            <h3 className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              At-Risk Shipment Redirection & Detour Approvals
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '800px' }}>
              Evaluate proposed destination changes for at-risk cold-chain cargo, verify driver and vehicle availability, assess detour travel time, and update authorized delivery routes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Routes</span>
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

      {/* 2. PENDING REDIRECTION ROUTE REQUESTS (AWAITING LOGISTICS FEASIBILITY APPROVAL) */}
      <div style={{ marginBottom: '28px' }}>
        <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--accent-amber)" />
          Pending Route Redirection Requests ({pendingOffers.length})
        </h4>

        {pendingOffers.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No pending route redirection requests requiring logistics approval. Fleet is operating on authorized corridors.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            {pendingOffers.map((off) => (
              <div key={off.offer_id} className="card" style={{ padding: '20px', border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', fontSize: '10px', fontWeight: '800' }}>
                      DETOUR FEASIBILITY REVIEW
                    </span>
                    <h5 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                      {off.shipment_id} — {off.product_name || 'Tomatoes'} ({off.quantity_kg} kg)
                    </h5>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Farmer: <b>{off.farmer_name}</b> | Proposed Buyer: <b>{off.buyer_name}</b>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOfferForAction(off);
                      setActionForm({
                        vehicle_id: off.vehicle_id || 'FTL-V001',
                        driver_id: drivers.length > 0 ? drivers[0].driver_id : '',
                        revised_logistics_cost: parseFloat(off.additional_logistics_cost || 850.0),
                        estimated_travel_time_hours: parseFloat(off.estimated_delivery_time_hours || 1.0),
                        notes: 'Driver confirmed detour route is clear.'
                      });
                      setShowActionModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <span>Review & Confirm Route</span>
                  </button>
                </div>

                {/* Side-by-Side Route Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Original Scheduled Route
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                      {off.origin} <ArrowRight size={10} style={{ display: 'inline' }} /> {off.original_destination}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Transit ETA: ~30.0 hrs | Risk: <b style={{ color: '#F43F5E' }}>Narrow Shelf Margin</b>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Proposed Alternative Detour
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                      Detour to: {off.destination_address}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                      Detour: <b>{off.distance_km} km</b> (~{off.estimated_delivery_time_hours}h) | Extra Cost: <b>₹{off.additional_logistics_cost}</b>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  * Route estimates are computed from corridor distance matrix. Vehicle driver approval commits carrier resources.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. ACTIVE REDIRECTED SHIPMENTS LEDGER */}
      <div>
        <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NavIcon size={18} color="var(--accent-cyan)" />
          Redirected Shipments & Active Detour Corridors ({activeRedirectedOffers.length})
        </h4>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Redirected Quantity</th>
                  <th>Original Route</th>
                  <th>Authorized New Destination</th>
                  <th>Detour Distance / Time</th>
                  <th>Additional Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeRedirectedOffers.map((o) => (
                  <tr key={o.offer_id}>
                    <td><b>{o.shipment_id}</b> ({o.product_name || 'Tomatoes'})</td>
                    <td><b style={{ color: 'var(--text-primary)' }}>{o.quantity_kg} kg</b></td>
                    <td>{o.original_destination}</td>
                    <td><b style={{ color: 'var(--accent-emerald-light)' }}>{o.destination_address}</b></td>
                    <td>{o.distance_km} km (~{o.estimated_delivery_time_hours}h)</td>
                    <td>₹{parseFloat(o.additional_logistics_cost).toFixed(2)}</td>
                    <td>
                      <span className="badge" style={{
                        background: o.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: o.status === 'DELIVERED' ? '#34D399' : '#38BDF8',
                        fontSize: '10px'
                      }}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. LOGISTICS APPROVAL MODAL */}
      {showActionModal && selectedOfferForAction && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)' }}>
                <Truck size={18} />
                <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  Logistics Redirection Feasibility Review
                </h3>
              </div>
              <button type="button" onClick={() => setShowActionModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '12px' }}>
                <div>Shipment: <b>{selectedOfferForAction.shipment_id}</b> ({selectedOfferForAction.quantity_kg} kg tomatoes)</div>
                <div style={{ marginTop: '4px' }}>Detour Destination: <b>{selectedOfferForAction.destination_address}</b> ({selectedOfferForAction.distance_km} km)</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="input-label">Assigned Vehicle *</label>
                  <select
                    value={actionForm.vehicle_id}
                    onChange={(e) => setActionForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                    className="input-field"
                  >
                    {vehicles.map(v => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.vehicle_id} ({v.vehicle_number || 'Reefer 5T'})
                      </option>
                    ))}
                    {vehicles.length === 0 && <option value="FTL-V001">FTL-V001 (Reefer 5T)</option>}
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">Assigned Driver *</label>
                  <select
                    value={actionForm.driver_id}
                    onChange={(e) => setActionForm(prev => ({ ...prev, driver_id: e.target.value }))}
                    className="input-field"
                  >
                    {drivers.map(d => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.driver_name} ({d.phone})
                      </option>
                    ))}
                    {drivers.length === 0 && <option value="DRV-01">Ramesh Shinde (Driver)</option>}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="input-label">Revised Transport Cost (₹)</label>
                  <input
                    type="number"
                    step="50"
                    value={actionForm.revised_logistics_cost}
                    onChange={(e) => setActionForm(prev => ({ ...prev, revised_logistics_cost: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Estimated Travel Time (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={actionForm.estimated_travel_time_hours}
                    onChange={(e) => setActionForm(prev => ({ ...prev, estimated_travel_time_hours: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="input-label">Logistics Route Notes</label>
                <input
                  type="text"
                  value={actionForm.notes}
                  onChange={(e) => setActionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleLogisticsAction('REJECT')}
                  disabled={actionLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: '#FB7185' }}
                >
                  <X size={14} />
                  <span>Reject Detour</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogisticsAction('APPROVE')}
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
                >
                  <Check size={14} />
                  <span>Approve Route Feasibility</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
