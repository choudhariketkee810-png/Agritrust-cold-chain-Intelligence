import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Truck, 
  Check, 
  X, 
  RefreshCw, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Eye, 
  Tag, 
  DollarSign, 
  Thermometer, 
  Droplets,
  PackageCheck,
  AlertCircle
} from 'lucide-react';
import { 
  fetchBuyerDemands, 
  createBuyerDemand, 
  updateBuyerDemand, 
  fetchMarketplaceOffers, 
  buyerActionOnOffer, 
  deliverMarketplaceOffer,
  fetchShipmentSpoilageRisk
} from '../api';

export default function BuyerLocalDemand() {
  const [demands, setDemands] = useState([]);
  const [incomingOffers, setIncomingOffers] = useState([]);
  const [selectedOfferForInspection, setSelectedOfferForInspection] = useState(null);
  const [shipmentRiskData, setShipmentRiskData] = useState(null);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showAddDemandModal, setShowAddDemandModal] = useState(false);
  const [showDeliveryConfirmModal, setShowDeliveryConfirmModal] = useState(false);
  const [selectedOfferForDelivery, setSelectedOfferForDelivery] = useState(null);

  // Forms
  const [demandForm, setDemandForm] = useState({
    produce_name: 'Tomatoes',
    variety: 'Hybrid Table Red',
    quantity_demanded_kg: 300.0,
    offered_price_per_kg: 38.0,
    acceptable_quality_grade: 'Grade A or Export Quality',
    delivery_location: 'FreshMart Distribution Center, Ghodbunder Rd, Thane',
    delivery_district: 'Thane',
    max_delivery_distance_km: 30.0,
    receiving_window: 'TODAY',
    required_delivery_date: new Date().toISOString().split('T')[0],
    notes: 'Urgent local demand for fresh retail crates. Pre-cooling dock open today.'
  });

  const [deliveryForm, setDeliveryForm] = useState({
    received_quantity_kg: 300.0,
    quality_grade: 'Grade A (Intact & Fresh)',
    notes: 'Quality verified at receiving dock. Firmness and Brix within specifications.'
  });

  // Load Buyer demand data
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [demRes, offRes] = await Promise.allSettled([
        fetchBuyerDemands(),
        fetchMarketplaceOffers()
      ]);

      if (demRes.status === 'fulfilled') setDemands(demRes.value?.data || []);
      if (offRes.status === 'fulfilled') setIncomingOffers(offRes.value?.data || []);
    } catch (err) {
      console.error('Error loading buyer demand data:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load demands' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create new Demand requirement
  const handleCreateDemand = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        produce_name: demandForm.produce_name,
        variety: demandForm.variety,
        quantity_demanded_kg: parseFloat(demandForm.quantity_demanded_kg),
        offered_price_per_kg: parseFloat(demandForm.offered_price_per_kg),
        acceptable_quality_grade: demandForm.acceptable_quality_grade,
        delivery_location: demandForm.delivery_location,
        delivery_district: demandForm.delivery_district,
        max_delivery_distance_km: parseFloat(demandForm.max_delivery_distance_km),
        receiving_window: demandForm.receiving_window,
        required_delivery_date: demandForm.required_delivery_date || undefined,
        notes: demandForm.notes
      };

      await createBuyerDemand(payload);
      setFeedback({
        type: 'success',
        message: `Registered local purchasing demand for ${payload.quantity_demanded_kg} kg ${payload.produce_name} @ ₹${payload.offered_price_per_kg}/kg.`
      });
      setShowAddDemandModal(false);
      loadData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Buyer Action (Accept or Reject offer)
  const handleBuyerAction = async (offerId, action, notes = '') => {
    setActionLoading(true);
    setFeedback(null);
    try {
      await buyerActionOnOffer(offerId, { action, notes });
      setFeedback({
        type: 'success',
        message: `Offer #${offerId} ${action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'}. Logistics provider notified for route confirmation.`
      });
      loadData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Inspect Spoilage Risk for an incoming offer
  const handleInspectOfferTelemetry = async (offer) => {
    setSelectedOfferForInspection(offer);
    try {
      const risk = await fetchShipmentSpoilageRisk(offer.shipment_id);
      setShipmentRiskData(risk);
    } catch (err) {
      console.error('Error fetching risk telemetry:', err);
    }
  };

  // Confirm Received Produce Delivery
  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    if (!selectedOfferForDelivery) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await deliverMarketplaceOffer(selectedOfferForDelivery.offer_id, {
        received_quantity_kg: parseFloat(deliveryForm.received_quantity_kg),
        quality_grade: deliveryForm.quality_grade,
        notes: deliveryForm.notes
      });
      setFeedback({
        type: 'success',
        message: `Confirmed delivery intake of ${deliveryForm.received_quantity_kg} kg fresh produce! Payment release authorized.`
      });
      setShowDeliveryConfirmModal(false);
      setSelectedOfferForDelivery(null);
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
        <RefreshCw size={24} className="animate-spin" color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
        <div>Loading Local Produce Purchasing Requirements & Incoming Rescue Deals...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 1. HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald-light)', fontSize: '11px', fontWeight: '800' }}>
                BUYER RESCUE DEMAND REGISTRY
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Local Inbound Purchasing & Spoilage Rescue</span>
            </div>
            <h3 className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Local Produce Demand & Incoming Redirected Deals
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '800px' }}>
              Register your immediate retail/wholesale purchase demand to receive redirected farm-fresh shipments before spoilage occurs, at favorable rates with verified cold-chain history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddDemandModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} />
            <span>Register New Purchasing Demand</span>
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

      {/* 2. INCOMING REDIRECTED AT-RISK PRODUCE OFFERS */}
      <div style={{ marginBottom: '28px' }}>
        <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--accent-amber)" />
          Incoming Redirected Shipment Deals Awaiting Action ({incomingOffers.length})
        </h4>

        {incomingOffers.length === 0 ? (
          <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No incoming redirected offers pending. Registered demands are actively monitored by the Sell Before Spoilage engine.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
            {incomingOffers.map((off) => (
              <div key={off.offer_id} className="card" style={{ padding: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', fontSize: '10px', fontWeight: '800', marginBottom: '4px' }}>
                      INCOMING RESCUE OFFER #{off.offer_id}
                    </span>
                    <h5 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                      {off.product_name || 'Tomatoes (Hybrid Table Red)'}
                    </h5>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Farmer: <b>{off.farmer_name}</b> ({off.farmer_company})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
                      ₹{parseFloat(off.offered_price_per_kg).toFixed(2)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ kg</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Total: ₹{parseFloat(off.total_price).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Offer Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Offered Quantity:</span> <b style={{ color: 'var(--text-primary)' }}>{off.quantity_kg} kg</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Transit Distance:</span> <b style={{ color: 'var(--text-primary)' }}>{off.distance_km} km</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Delivery:</span> <b style={{ color: 'var(--accent-cyan)' }}>~{off.estimated_delivery_time_hours} hr(s)</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span> <b style={{ color: 'var(--accent-amber)' }}>{off.status.replace('_', ' ')}</b>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Destination Dock:</span> <span style={{ color: 'var(--text-secondary)' }}>{off.destination_address}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {off.status === 'PROPOSED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleBuyerAction(off.offer_id, 'ACCEPT')}
                        disabled={actionLoading}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Check size={14} />
                        <span>Accept Offer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBuyerAction(off.offer_id, 'REJECT')}
                        disabled={actionLoading}
                        className="btn btn-secondary btn-sm"
                        style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: '#FB7185' }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {off.status === 'FARMER_CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOfferForDelivery(off);
                        setDeliveryForm({
                          received_quantity_kg: parseFloat(off.quantity_kg),
                          quality_grade: 'Grade A (Fresh & Intact)',
                          notes: 'Verified crates at intake dock. Temperature within safe range.'
                        });
                        setShowDeliveryConfirmModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', background: 'var(--accent-emerald)' }}
                    >
                      <PackageCheck size={14} />
                      <span>Confirm Receiving & Intake</span>
                    </button>
                  )}

                  {off.status === 'DELIVERED' && (
                    <div style={{ fontSize: '12px', color: 'var(--accent-emerald-light)', fontWeight: '700', textAlign: 'center', width: '100%' }}>
                      ✓ Received & Delivered into Stock
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleInspectOfferTelemetry(off)}
                    className="btn btn-secondary btn-sm"
                    title="Inspect Telemetry & Quality History"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. REGISTERED PURCHASING DEMANDS LIST */}
      <div>
        <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} color="var(--accent-cyan)" />
          My Active Purchasing Demand Requirements ({demands.length})
        </h4>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Demand ID</th>
                  <th>Produce & Variety</th>
                  <th>Quantity Demanded</th>
                  <th>Offered Price</th>
                  <th>Receiving Window</th>
                  <th>Delivery Dock Location</th>
                  <th>Quality Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d) => (
                  <tr key={d.demand_id}>
                    <td>
                      <b>{d.demand_id}</b>
                      {d.is_demo && <span className="badge" style={{ fontSize: '9px', marginLeft: '6px', background: 'rgba(255,255,255,0.1)' }}>DEMO</span>}
                    </td>
                    <td><b>{d.produce_name}</b> ({d.variety})</td>
                    <td><b style={{ color: 'var(--text-primary)' }}>{d.quantity_demanded_kg} kg</b></td>
                    <td><b style={{ color: 'var(--accent-emerald-light)' }}>₹{parseFloat(d.offered_price_per_kg).toFixed(2)}/kg</b></td>
                    <td>
                      <span className="badge" style={{
                        background: d.receiving_window === 'TODAY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: d.receiving_window === 'TODAY' ? '#34D399' : '#FBBF24',
                        fontSize: '10px'
                      }}>
                        {d.receiving_window}
                      </span>
                    </td>
                    <td>{d.delivery_location} ({d.delivery_district})</td>
                    <td>{d.acceptable_quality_grade}</td>
                    <td>
                      <span className="badge badge-success" style={{ fontSize: '10px' }}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. REGISTER NEW PURCHASING DEMAND MODAL */}
      {showAddDemandModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)' }}>
                <ShoppingBag size={18} />
                <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  Register Produce Purchasing Requirement
                </h3>
              </div>
              <button type="button" onClick={() => setShowAddDemandModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDemand} className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="input-label">Produce Type *</label>
                  <select
                    value={demandForm.produce_name}
                    onChange={(e) => setDemandForm(prev => ({ ...prev, produce_name: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="Tomatoes">Tomatoes</option>
                    <option value="Mango">Mango</option>
                    <option value="Grapes">Grapes</option>
                    <option value="Pomegranate">Pomegranate</option>
                    <option value="Mixed Vegetables">Mixed Vegetables</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">Variety *</label>
                  <input
                    type="text"
                    value={demandForm.variety}
                    onChange={(e) => setDemandForm(prev => ({ ...prev, variety: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="input-label">Quantity Demanded (kg) *</label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    value={demandForm.quantity_demanded_kg}
                    onChange={(e) => setDemandForm(prev => ({ ...prev, quantity_demanded_kg: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Offered Price (₹/kg) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={demandForm.offered_price_per_kg}
                    onChange={(e) => setDemandForm(prev => ({ ...prev, offered_price_per_kg: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="input-label">Receiving Window *</label>
                  <select
                    value={demandForm.receiving_window}
                    onChange={(e) => setDemandForm(prev => ({ ...prev, receiving_window: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="TODAY">TODAY (Urgent)</option>
                    <option value="TOMORROW">TOMORROW Morning</option>
                    <option value="FUTURE_DATE">Future Specified Date</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">Max Delivery Radius (km)</label>
                  <input
                    type="number"
                    value={demandForm.max_delivery_distance_km}
                    onChange={(e) => setDemandForm(prev => ({ ...prev, max_delivery_distance_km: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="input-label">Delivery Location Address *</label>
                <input
                  type="text"
                  value={demandForm.delivery_location}
                  onChange={(e) => setDemandForm(prev => ({ ...prev, delivery_location: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Dock Handling Notes</label>
                <input
                  type="text"
                  value={demandForm.notes}
                  onChange={(e) => setDemandForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Unloading bay 2 open from 6am. Pre-cooling dock available."
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddDemandModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary btn-sm">
                  Publish Purchasing Demand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELIVERY INTAKE MODAL */}
      {showDeliveryConfirmModal && selectedOfferForDelivery && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)' }}>
                <PackageCheck size={18} />
                <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  Confirm Delivery Intake & Inspection
                </h3>
              </div>
              <button type="button" onClick={() => setShowDeliveryConfirmModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery} className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', fontSize: '12px' }}>
                Receiving redirected shipment from <b>{selectedOfferForDelivery.farmer_name}</b> for <b>{selectedOfferForDelivery.quantity_kg} kg</b> produce.
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="input-label">Actual Received Quantity (kg) *</label>
                <input
                  type="number"
                  step="1"
                  value={deliveryForm.received_quantity_kg}
                  onChange={(e) => setDeliveryForm(prev => ({ ...prev, received_quantity_kg: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="input-label">Intake Quality Grade *</label>
                <select
                  value={deliveryForm.quality_grade}
                  onChange={(e) => setDeliveryForm(prev => ({ ...prev, quality_grade: e.target.value }))}
                  className="input-field"
                >
                  <option value="Grade A (Fresh & Intact)">Grade A (Fresh & Intact)</option>
                  <option value="Grade B (Minor Blemishes, Good Condition)">Grade B (Good Condition)</option>
                  <option value="Grade C (Processing Quality)">Grade C (Processing Quality)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Receiving Notes & Dock Inspection Evidence</label>
                <textarea
                  rows={2}
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowDeliveryConfirmModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary btn-sm">
                  Authorize Intake & Complete Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. TELEMETRY INSPECTION MODAL */}
      {selectedOfferForInspection && shipmentRiskData && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                Quality & Telemetry Audit: {selectedOfferForInspection.shipment_id}
              </h3>
              <button type="button" onClick={() => setSelectedOfferForInspection(null)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Remaining Shelf Life</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-amber)' }}>{shipmentRiskData.estimated_shelf_life_hours}h</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Confidence Score</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-emerald)' }}>{shipmentRiskData.confidence_score}%</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Risk Status</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#FBBF24' }}>{shipmentRiskData.risk_level}</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Telemetry & Respiration Factors:
              </div>
              <ul style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0, paddingLeft: '18px' }}>
                {shipmentRiskData.factors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
