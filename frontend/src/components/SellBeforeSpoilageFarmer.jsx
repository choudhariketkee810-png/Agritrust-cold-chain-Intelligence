import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  ShieldAlert, 
  RefreshCw, 
  ArrowRight, 
  Sliders, 
  Info, 
  ChevronRight, 
  Building2, 
  Warehouse, 
  Check, 
  X, 
  Split, 
  Layers,
  Thermometer,
  Droplets,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  fetchAtRiskShipments, 
  fetchShipmentSpoilageRisk, 
  reassessShipmentSpoilageRisk, 
  fetchAlternativeBuyers, 
  createMarketplaceOffer, 
  fetchMarketplaceOffers, 
  farmerConfirmOffer, 
  fetchShipmentAllocations, 
  fetchShipmentRouteHistory,
  createRescueStorageRequest,
  fetchNearbyColdStorages
} from '../api';

export default function SellBeforeSpoilageFarmer() {
  const [atRiskShipments, setAtRiskShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('SHP-TOMATO-001');
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [candidateBuyers, setCandidateBuyers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [routeHistory, setRouteHistory] = useState([]);
  const [coldStorages, setColdStorages] = useState([]);

  // Filters & Simulation state
  const [maxDistanceFilter, setMaxDistanceFilter] = useState('');
  const [receivingWindowFilter, setReceivingWindowFilter] = useState('ALL');
  const [simulatedDelayHours, setSimulatedDelayHours] = useState(0);
  const [customBufferHours, setCustomBufferHours] = useState(6);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Multi-buyer partial allocation state
  const [buyerAllocations, setBuyerAllocations] = useState({}); // { demand_id: quantity_kg }

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingConfirmOffer, setPendingConfirmOffer] = useState(null);
  const [confirmNotes, setConfirmNotes] = useState('');

  // Storage Rescue Modal
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [rescueForm, setRescueForm] = useState({
    facility_id: '',
    quantity_mt: 0.5,
    target_temperature: 12.0,
    duration_days: 7,
    notes: 'Emergency pre-cooling and storage for at-risk cargo.'
  });

  // Load all spoilage marketplace data for the selected shipment
  const loadSpoilageData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      // 1. Fetch at-risk shipments list
      const riskShipsRes = await fetchAtRiskShipments();
      const shipsList = riskShipsRes?.data || [];
      setAtRiskShipments(shipsList);

      const targetId = selectedShipmentId || (shipsList.length > 0 ? shipsList[0].shipment_id : 'SHP-TOMATO-001');
      if (!selectedShipmentId && targetId) {
        setSelectedShipmentId(targetId);
      }

      // 2. Fetch risk assessment, alternative buyers, existing offers, allocations & route history
      const [riskRes, buyersRes, offersRes, allocRes, routeRes, csRes] = await Promise.allSettled([
        fetchShipmentSpoilageRisk(targetId),
        fetchAlternativeBuyers(targetId, {
          maxDistance: maxDistanceFilter ? parseFloat(maxDistanceFilter) : undefined,
          receivingWindow: receivingWindowFilter !== 'ALL' ? receivingWindowFilter : undefined
        }),
        fetchMarketplaceOffers({ shipmentId: targetId }),
        fetchShipmentAllocations(targetId),
        fetchShipmentRouteHistory(targetId),
        fetchNearbyColdStorages()
      ]);

      if (riskRes.status === 'fulfilled') setRiskAssessment(riskRes.value);
      if (buyersRes.status === 'fulfilled') {
        const matches = buyersRes.value?.matches || [];
        setCandidateBuyers(matches);
        // Initialize allocation quantities from matches
        const initialAlloc = {};
        matches.forEach(m => {
          initialAlloc[m.demand_id] = m.suggested_match_quantity_kg;
        });
        setBuyerAllocations(initialAlloc);
      }
      if (offersRes.status === 'fulfilled') setOffers(offersRes.value?.data || []);
      if (allocRes.status === 'fulfilled') setAllocations(allocRes.value?.data || []);
      if (routeRes.status === 'fulfilled') setRouteHistory(routeRes.value?.data || []);
      if (csRes.status === 'fulfilled') {
        const facs = csRes.value?.data || [];
        setColdStorages(facs);
        if (facs.length > 0) {
          setRescueForm(prev => ({ ...prev, facility_id: facs[0].facility_id }));
        }
      }
    } catch (err) {
      console.error('Error loading spoilage marketplace data:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load spoilage risk data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedShipmentId, maxDistanceFilter, receivingWindowFilter]);

  useEffect(() => {
    loadSpoilageData();
  }, [loadSpoilageData]);

  // Trigger reassessment with simulated delay
  const handleReassessRisk = async () => {
    if (!selectedShipmentId) return;
    setRefreshing(true);
    try {
      const res = await reassessShipmentSpoilageRisk(selectedShipmentId, {
        custom_eta_hours: 30.0,
        simulated_delay_hours: parseFloat(simulatedDelayHours || 0),
        safety_buffer_hours: parseFloat(customBufferHours || 6)
      });
      setRiskAssessment(res);
      setFeedback({
        type: 'success',
        message: `Reassessed with +${simulatedDelayHours}h delay simulation: Risk is ${res.risk_level} (Remaining Shelf Life: ${res.estimated_shelf_life_hours}h vs Adjusted ETA: ${res.predicted_eta_hours}h).`
      });
      // Refresh buyer recommendations
      const buyersRes = await fetchAlternativeBuyers(selectedShipmentId);
      if (buyersRes?.matches) {
        setCandidateBuyers(buyersRes.matches);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle proposing offer to a buyer
  const handleProposeOffer = async (buyerMatch) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const qty = parseFloat(buyerAllocations[buyerMatch.demand_id] || buyerMatch.suggested_match_quantity_kg);
      if (!qty || qty <= 0) {
        throw new Error('Please specify a valid quantity in kg to allocate.');
      }

      const payload = {
        shipment_id: selectedShipmentId,
        buyer_id: buyerMatch.buyer_id,
        demand_id: buyerMatch.demand_id,
        quantity_kg: qty,
        offered_price_per_kg: buyerMatch.offered_price_per_kg,
        original_price_per_kg: buyerMatch.original_price_per_kg || 32.0,
        estimated_delivery_time_hours: buyerMatch.estimated_delivery_time_hours,
        additional_logistics_cost: buyerMatch.estimated_additional_logistics_cost,
        destination_address: buyerMatch.delivery_location,
        distance_km: buyerMatch.distance_km
      };

      const res = await createMarketplaceOffer(payload);
      setFeedback({
        type: 'success',
        message: `Proposed deal to ${buyerMatch.buyer_name} (${buyerMatch.buyer_company}) for ${qty} kg @ ₹${buyerMatch.offered_price_per_kg}/kg! Awaiting buyer review.`
      });
      loadSpoilageData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Farmer Final Confirmation
  const handleExecuteFarmerConfirm = async () => {
    if (!pendingConfirmOffer) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await farmerConfirmOffer(pendingConfirmOffer.offer_id, {
        confirm: true,
        notes: confirmNotes || `Authorized redirection of ${pendingConfirmOffer.quantity_kg} kg to ${pendingConfirmOffer.buyer_name}.`
      });
      setFeedback({
        type: 'success',
        message: `Destination Redirection Authorized! ${pendingConfirmOffer.quantity_kg} kg tomatoes allocated to ${pendingConfirmOffer.buyer_name}. Updated route logged in audit ledger.`
      });
      setShowConfirmModal(false);
      setPendingConfirmOffer(null);
      setConfirmNotes('');
      loadSpoilageData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Emergency Storage Rescue Request
  const handleRequestStorageRescue = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        shipment_id: selectedShipmentId,
        facility_id: rescueForm.facility_id,
        quantity_mt: parseFloat(rescueForm.quantity_mt),
        target_temperature: parseFloat(rescueForm.target_temperature),
        duration_days: parseInt(rescueForm.duration_days, 10),
        notes: rescueForm.notes
      };
      await createRescueStorageRequest(payload);
      setFeedback({
        type: 'success',
        message: `Emergency cold storage rescue requested at facility! Facility manager notified.`
      });
      setShowRescueModal(false);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Total allocated vs cargo capacity calculation
  const totalCargoKg = riskAssessment?.total_quantity_kg || 500.0;
  const confirmedAllocatedKg = offers
    .filter(o => ['FARMER_CONFIRMED', 'DELIVERED'].includes(o.status))
    .reduce((sum, o) => sum + parseFloat(o.quantity_kg), 0);
  const remainingUnallocatedKg = Math.max(0, totalCargoKg - confirmedAllocatedKg);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" color="var(--accent-amber)" style={{ margin: '0 auto 12px auto' }} />
        <div>Analyzing Cold-Chain Telemetry & Matching Alternative Buyers...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 1. SECTION HERO & BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-amber)' }}>
                <AlertTriangle size={14} />
                <span>SELL BEFORE SPOILAGE ENGINE</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AI-Assisted Dynamic Rescue Marketplace</span>
            </div>
            <h3 className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Prevent Produce Loss Through Dynamic Nearby Buyer Matching
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '850px' }}>
              When transit delays or temperature excursions threaten produce shelf life, AGRITRUST identifies matching nearby wholesale buyers within the safe delivery window, enabling partial or full route redirection with farmer authorization.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowRescueModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--accent-cyan)' }}
            >
              <Warehouse size={14} />
              <span>Emergency Cold Storage</span>
            </button>

            <button
              type="button"
              onClick={() => loadSpoilageData(true)}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
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

      {/* 2. DEMONSTRATION SCENARIO SELECTOR & ALLOCATION CAPACITY BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Shipment Selector */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Active Monitored Cargo Selection
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="input-field"
              style={{ fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}
            >
              {atRiskShipments.map((s) => (
                <option key={s.shipment_id} value={s.shipment_id}>
                  {s.shipment_id} — {s.product_name} ({s.total_quantity_kg} kg) [{s.risk_level} RISK]
                </option>
              ))}
              {atRiskShipments.length === 0 && (
                <option value="SHP-TOMATO-001">SHP-TOMATO-001 — Tomatoes (500 kg Hybrid Table Red)</option>
              )}
            </select>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Origin: Nashik Gate #1</span>
            <span>Original Dest: Mumbai APMC</span>
          </div>
        </div>

        {/* Partial Allocation Meter */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Multi-Buyer Cargo Allocation Capacity
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: remainingUnallocatedKg === 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {confirmedAllocatedKg.toFixed(0)} / {totalCargoKg.toFixed(0)} kg ({((confirmedAllocatedKg / totalCargoKg) * 100).toFixed(0)}% Allocated)
            </span>
          </div>
          {/* Progress Bar */}
          <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
            {offers.filter(o => ['FARMER_CONFIRMED', 'DELIVERED'].includes(o.status)).map((o, idx) => {
              const pct = (parseFloat(o.quantity_kg) / totalCargoKg) * 100;
              const colors = ['#10B981', '#38BDF8', '#F59E0B', '#A855F7'];
              return (
                <div
                  key={o.offer_id}
                  title={`${o.buyer_name}: ${o.quantity_kg} kg`}
                  style={{ width: `${pct}%`, background: colors[idx % colors.length], height: '100%' }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            <span>Unallocated Remaining: <b style={{ color: 'var(--text-primary)' }}>{remainingUnallocatedKg.toFixed(0)} kg</b></span>
            <span>Status: <b style={{ color: remainingUnallocatedKg === 0 ? 'var(--accent-emerald-light)' : 'var(--accent-amber)' }}>{remainingUnallocatedKg === 0 ? 'Fully Allocated' : 'Partial Splitting Available'}</b></span>
          </div>
        </div>
      </div>

      {/* 3. SPOILAGE RISK & SHELF-LIFE ASSESSMENT PANEL */}
      {riskAssessment && (
        <div className="card" style={{ padding: '22px 24px', marginBottom: '24px', border: `1px solid ${riskAssessment.risk_level === 'HIGH' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge" style={{
                  background: riskAssessment.risk_level === 'HIGH' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: riskAssessment.risk_level === 'HIGH' ? '#FB7185' : '#FBBF24',
                  fontWeight: '800',
                  fontSize: '12px'
                }}>
                  {riskAssessment.risk_level} DELIVERY RISK
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Produce: <b style={{ color: 'var(--text-primary)' }}>{riskAssessment.crop_name}</b> ({riskAssessment.total_quantity_kg} kg)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Confidence Score:</span>
              <span style={{ fontWeight: '700', color: 'var(--accent-emerald-light)' }}>{riskAssessment.confidence_score}% (IoT Sensor Verified)</span>
            </div>
          </div>

          {/* Key Metric Blocks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={12} />
                <span>Estimated Remaining Shelf Life</span>
              </div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-amber)' }}>
                {riskAssessment.estimated_shelf_life_hours} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>hrs</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Range: {riskAssessment.shelf_life_range}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={12} />
                <span>Original Delivery ETA</span>
              </div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {riskAssessment.predicted_eta_hours} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>hrs</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Destination: Mumbai APMC Hub
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={12} />
                <span>Delivery Safety Margin</span>
              </div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: riskAssessment.delivery_margin_hours <= 6.0 ? '#F43F5E' : '#10B981' }}>
                +{riskAssessment.delivery_margin_hours} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>hrs</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Safety buffer required: 6.0 hrs
              </div>
            </div>
          </div>

          {/* Transparent Factors Accordion */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} color="var(--accent-cyan)" />
              <span>Transparent AI Respiration & Thermal Decay Calculation Factors:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {riskAssessment.factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          {/* Transit Delay Simulation Controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.02)', padding: '12px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={14} color="var(--accent-amber)" />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Simulate Transit Congestion Delay:</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={simulatedDelayHours}
              onChange={(e) => setSimulatedDelayHours(e.target.value)}
              style={{ width: '140px' }}
            />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-amber)' }}>+{simulatedDelayHours} Hours Delay</span>

            <button
              type="button"
              onClick={handleReassessRisk}
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
            >
              <span>Reassess Risk with Delay</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. DYNAMIC NEARBY BUYER MATCHING RESULTS */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="var(--accent-emerald)" />
              Nearby Matched Buyers ({candidateBuyers.length} Available in Transit Corridor)
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Buyers with verified active purchasing demand matching tomatoes, receiving availability, and proximity.
            </p>
          </div>

          {/* Filter Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={receivingWindowFilter}
              onChange={(e) => setReceivingWindowFilter(e.target.value)}
              className="input-field"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <option value="ALL">All Receiving Windows</option>
              <option value="TODAY">Receiving TODAY</option>
              <option value="TOMORROW">Receiving TOMORROW</option>
            </select>

            <input
              type="number"
              placeholder="Max Distance (km)"
              value={maxDistanceFilter}
              onChange={(e) => setMaxDistanceFilter(e.target.value)}
              className="input-field"
              style={{ width: '130px', padding: '6px 12px', fontSize: '12px' }}
            />
          </div>
        </div>

        {/* Candidate Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '18px' }}>
          {candidateBuyers.map((buyer) => {
            const isBuyerA = buyer.buyer_id === 'usr_buyer_a' || buyer.demand_id.includes('A');
            const isBuyerB = buyer.buyer_id === 'usr_buyer_b' || buyer.demand_id.includes('B');
            const currentAlloc = parseFloat(buyerAllocations[buyer.demand_id] || buyer.suggested_match_quantity_kg);
            const calculatedTotal = currentAlloc * buyer.offered_price_per_kg;

            // Check if already an offer proposed/confirmed for this buyer
            const existingOffer = offers.find(o => o.buyer_id === buyer.buyer_id);

            return (
              <div
                key={buyer.demand_id}
                className="card"
                style={{
                  padding: '20px',
                  border: isBuyerA ? '1px solid rgba(16, 185, 129, 0.4)' : isBuyerB ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
                  background: isBuyerA ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)' : 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className="badge" style={{
                      background: isBuyerA ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: isBuyerA ? '#34D399' : '#38BDF8',
                      marginBottom: '6px',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}>
                      {isBuyerA ? 'BUYER A (PRIMARY MATCH)' : isBuyerB ? 'BUYER B (SECONDARY MATCH)' : 'VERIFIED BUYER'}
                    </span>
                    <h5 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {buyer.buyer_name}
                    </h5>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {buyer.buyer_company}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
                      ₹{buyer.offered_price_per_kg.toFixed(2)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ kg</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontWeight: '600' }}>
                      +₹{(buyer.offered_price_per_kg - (buyer.original_price_per_kg || 32.0)).toFixed(2)}/kg vs Original
                    </div>
                  </div>
                </div>

                {/* Match Specs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Distance:</span> <b style={{ color: 'var(--text-primary)' }}>{buyer.distance_km} km</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ETA to Dock:</span> <b style={{ color: 'var(--text-primary)' }}>~{buyer.estimated_delivery_time_hours} hr(s)</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Demand:</span> <b style={{ color: 'var(--text-primary)' }}>{buyer.demanded_quantity_kg} kg</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Receiving:</span> <b style={{ color: buyer.receiving_window === 'TODAY' ? 'var(--accent-emerald-light)' : 'var(--accent-amber)' }}>{buyer.receiving_window}</b>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Location:</span> <span style={{ color: 'var(--text-secondary)' }}>{buyer.delivery_location}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Logistics Detour Cost:</span> <b style={{ color: 'var(--text-primary)' }}>₹{buyer.estimated_additional_logistics_cost.toFixed(2)}</b>
                  </div>
                </div>

                {/* Match Explanation */}
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '4px' }}>
                  <b style={{ color: 'var(--accent-cyan)' }}>Match Rationale:</b> {buyer.match_explanation}
                </div>

                {/* Partial Quantity Allocation Slider */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Allocate Quantity:</span>
                    <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{currentAlloc} kg (₹{calculatedTotal.toLocaleString('en-IN')})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="50"
                      max={Math.min(buyer.demanded_quantity_kg, totalCargoKg)}
                      step="50"
                      value={currentAlloc}
                      onChange={(e) => setBuyerAllocations(prev => ({ ...prev, [buyer.demand_id]: parseFloat(e.target.value) }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      value={currentAlloc}
                      onChange={(e) => setBuyerAllocations(prev => ({ ...prev, [buyer.demand_id]: parseFloat(e.target.value || 0) }))}
                      className="input-field"
                      style={{ width: '80px', padding: '4px 8px', fontSize: '12px', textAlign: 'center' }}
                    />
                  </div>
                </div>

                {/* Offer Status or Action Button */}
                {existingOffer ? (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: existingOffer.status === 'FARMER_CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${existingOffer.status === 'FARMER_CONFIRMED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: existingOffer.status === 'FARMER_CONFIRMED' ? 'var(--accent-emerald-light)' : 'var(--accent-amber)' }}>
                        STATUS: {existingOffer.status.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Offer #{existingOffer.offer_id} ({existingOffer.quantity_kg} kg)
                      </div>
                    </div>

                    {existingOffer.status === 'LOGISTICS_APPROVED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingConfirmOffer(existingOffer);
                          setShowConfirmModal(true);
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <Check size={14} />
                        <span>Authorize Redirection</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleProposeOffer(buyer)}
                    disabled={actionLoading || currentAlloc <= 0}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <ArrowRight size={14} />
                    <span>Propose Offer for {currentAlloc} kg to {buyer.buyer_name}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. ACTIVE REDIRECTION OFFERS & WORKFLOW PIPELINE */}
      {offers.length > 0 && (
        <div className="card" style={{ padding: '22px 24px', marginBottom: '24px' }}>
          <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Split size={18} color="var(--accent-cyan)" />
            Marketplace Offer Lifecycle & Allocation Ledger
          </h4>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Offer ID</th>
                  <th>Buyer</th>
                  <th>Quantity</th>
                  <th>Offered Price</th>
                  <th>Total Value</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((off) => (
                  <tr key={off.offer_id}>
                    <td><b>{off.offer_id}</b></td>
                    <td>{off.buyer_name} ({off.buyer_company})</td>
                    <td><b style={{ color: 'var(--text-primary)' }}>{off.quantity_kg} kg</b></td>
                    <td>₹{parseFloat(off.offered_price_per_kg).toFixed(2)}/kg</td>
                    <td><b style={{ color: 'var(--accent-emerald-light)' }}>₹{parseFloat(off.total_price).toLocaleString('en-IN')}</b></td>
                    <td>{off.destination_address}</td>
                    <td>
                      <span className="badge" style={{
                        background: off.status === 'FARMER_CONFIRMED' || off.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.2)' : off.status === 'LOGISTICS_APPROVED' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: off.status === 'FARMER_CONFIRMED' || off.status === 'DELIVERED' ? '#34D399' : off.status === 'LOGISTICS_APPROVED' ? '#38BDF8' : '#FBBF24',
                        fontSize: '10px'
                      }}>
                        {off.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {off.status === 'LOGISTICS_APPROVED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingConfirmOffer(off);
                            setShowConfirmModal(true);
                          }}
                          className="btn btn-primary btn-xs"
                        >
                          <span>Confirm Shift</span>
                        </button>
                      )}
                      {off.status === 'PROPOSED' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awaiting Buyer Review</span>
                      )}
                      {off.status === 'BUYER_ACCEPTED' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awaiting Logistics Review</span>
                      )}
                      {off.status === 'FARMER_CONFIRMED' && (
                        <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>En Route to Buyer</span>
                      )}
                      {off.status === 'DELIVERED' && (
                        <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>✓ Delivered & Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. IMMUTABLE ROUTE CHANGE AUDIT HISTORY */}
      {routeHistory.length > 0 && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <h4 className="font-display" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} color="var(--accent-amber)" />
            Authorized Route Change History & Chain of Custody
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {routeHistory.map((rh) => (
              <div key={rh.change_id} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Original:</span> <b>{rh.original_destination}</b>
                  <ArrowRight size={12} style={{ margin: '0 8px', display: 'inline' }} />
                  <span style={{ color: 'var(--accent-emerald)' }}>New Authorized:</span> <b style={{ color: 'var(--text-primary)' }}>{rh.authorized_new_destination}</b>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Redirected: <b>{rh.quantity_kg} kg</b> to {rh.buyer_name} | Changed by: {rh.changed_by_name} ({rh.changed_by_role})
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <div>{new Date(rh.changed_at).toLocaleString()}</div>
                  <span className="badge badge-success" style={{ fontSize: '9px', marginTop: '2px' }}>VERIFIED AUDIT RECORD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. EXPLICIT FARMER CONFIRMATION DIALOG MODAL */}
      {showConfirmModal && pendingConfirmOffer && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '540px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)' }}>
                <AlertTriangle size={18} />
                <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  Confirm Shipment Destination Redirection
                </h3>
              </div>
              <button type="button" onClick={() => setShowConfirmModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '16px', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                <b>Explicit Redirection Notice:</b>
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>
                  Redirect <b>{pendingConfirmOffer.quantity_kg} kg</b> of tomatoes from shipment <b>{pendingConfirmOffer.shipment_id}</b> to <b>{pendingConfirmOffer.buyer_name}</b>?
                </p>
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                  This will legally change the delivery destination for the selected quantity to <i>{pendingConfirmOffer.destination_address}</i>. Both Buyer acceptance and Logistics routing approvals are verified.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="input-label">Confirmation & Dispatch Notes (Optional):</label>
                <textarea
                  rows={2}
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="e.g. Authorized detour to Thane retail hub. Pre-cooling dock confirmed."
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExecuteFarmerConfirm}
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
                >
                  <Check size={14} />
                  <span>Confirm & Authorize Redirection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. EMERGENCY RESCUE COLD STORAGE REQUEST MODAL */}
      {showRescueModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                <Warehouse size={18} />
                <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  Request Emergency Rescue Cold Storage
                </h3>
              </div>
              <button type="button" onClick={() => setShowRescueModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestStorageRescue} className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                When immediate buyer redirection is not viable, reserve temporary controlled atmosphere chamber space to arrest biological respiration.
              </p>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="input-label">Target Cold Storage Facility *</label>
                <select
                  value={rescueForm.facility_id}
                  onChange={(e) => setRescueForm(prev => ({ ...prev, facility_id: e.target.value }))}
                  required
                  className="input-field"
                >
                  {coldStorages.map(cs => (
                    <option key={cs.facility_id} value={cs.facility_id}>
                      {cs.facility_name} ({cs.location}) — Available: {cs.available_capacity_mt} MT
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="input-label">Quantity (MT) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={rescueForm.quantity_mt}
                    onChange={(e) => setRescueForm(prev => ({ ...prev, quantity_mt: e.target.value }))}
                    required
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">Target Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rescueForm.target_temperature}
                    onChange={(e) => setRescueForm(prev => ({ ...prev, target_temperature: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Emergency Notes</label>
                <input
                  type="text"
                  value={rescueForm.notes}
                  onChange={(e) => setRescueForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowRescueModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary btn-sm">
                  Submit Rescue Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
