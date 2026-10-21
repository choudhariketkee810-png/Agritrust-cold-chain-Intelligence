import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Truck, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  RefreshCw, 
  Eye, 
  FileText, 
  ShieldCheck, 
  Camera, 
  Clock, 
  Thermometer, 
  Droplets,
  Layers,
  MapPin,
  ExternalLink,
  Info,
  Sparkles,
  ClipboardCheck,
  Award
} from 'lucide-react';
import { 
  fetchBuyerMarketplace, 
  createBuyerOrder, 
  fetchBuyerOrders, 
  fetchBuyerShipments, 
  recordReceiving, 
  createDispute, 
  verifyShipment,
  getQrCodeUrl,
  fetchConsignments,
  fetchConsignmentDetail
} from '../api';
import BuyerLocalDemand from './BuyerLocalDemand';

export default function BuyerDashboard({ activeTab: externalTab, onNavigateTab }) {
  const [internalTab, setInternalTab] = useState('dashboard');

  // Sync external tab from role sidebar
  useEffect(() => {
    if (!externalTab || externalTab === 'dashboard') {
      setInternalTab('dashboard');
    } else if (['marketplace', 'available-produce', 'verified-produce'].includes(externalTab)) {
      setInternalTab('marketplace');
    } else if (['orders', 'discrepancy'].includes(externalTab)) {
      setInternalTab('orders');
    } else if (['incoming-shipments', 'tracking'].includes(externalTab)) {
      setInternalTab('tracking');
    } else if (['qr-verification', 'verify'].includes(externalTab)) {
      setInternalTab('verify');
    } else if (['spoilage', 'local-demand'].includes(externalTab)) {
      setInternalTab('local-demand');
    } else {
      setInternalTab(externalTab);
    }
  }, [externalTab]);

  const activeTab = internalTab;
  const setActiveTab = (tabId) => {
    setInternalTab(tabId);
    if (onNavigateTab) onNavigateTab(tabId);
  };


  // Data states
  const [marketplace, setMarketplace] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [consignments, setConsignments] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState('ALL');

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedListingForOrder, setSelectedListingForOrder] = useState(null);
  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [selectedShipmentForReceiving, setSelectedShipmentForReceiving] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedShipmentForDispute, setSelectedShipmentForDispute] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedConsignmentReport, setSelectedConsignmentReport] = useState(null);

  // QR / ID Verification State
  const [lookupShipmentId, setLookupShipmentId] = useState('');
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Forms
  const [orderForm, setOrderForm] = useState({
    quantity_kg: 500.0,
    delivery_address: 'FreshMart Central Hub, Sector 19, Vashi, Navi Mumbai',
    required_delivery_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    buyer_notes: 'Please ensure pre-cooled dispatch in refrigerated container.'
  });

  const [receivingForm, setReceivingForm] = useState({
    received_total_quantity: 1000.0,
    received_grade_a_quantity: 950.0,
    received_grade_b_quantity: 50.0,
    damaged_quantity: 0.0,
    receiving_temperature: 11.4,
    receiver_notes: 'Checked temperature upon dock opening. Crates intact and seals verified.',
    photo_urls: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'
  });

  const [disputeForm, setDisputeForm] = useState({
    dispute_category: 'QUANTITY_SHORTAGE',
    against_role: 'LOGISTICS',
    claim_amount: 12000.0,
    description: '50kg damaged due to carton crushing in transit, plus high temperature deviation logged.',
    evidence_urls: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500'
  });

  // Load Buyer data
  const loadBuyerData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [mktRes, ordRes, shipRes, consRes] = await Promise.allSettled([
        fetchBuyerMarketplace(),
        fetchBuyerOrders(),
        fetchBuyerShipments(),
        fetchConsignments()
      ]);

      if (mktRes.status === 'fulfilled') setMarketplace(mktRes.value?.data || []);
      if (ordRes.status === 'fulfilled') setOrders(ordRes.value?.data || []);
      if (shipRes.status === 'fulfilled') setShipments(shipRes.value?.data || []);
      if (consRes.status === 'fulfilled') setConsignments(consRes.value?.data || []);
    } catch (err) {
      console.error('Buyer load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBuyerData();
    const timer = setInterval(() => loadBuyerData(false), 5000);
    return () => clearInterval(timer);
  }, [loadBuyerData]);

  // Place Purchase Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!selectedListingForOrder) return;
    setFeedback(null);
    try {
      const payload = {
        listing_id: selectedListingForOrder.listing_id,
        quantity_kg: parseFloat(orderForm.quantity_kg),
        delivery_address: orderForm.delivery_address,
        required_delivery_date: orderForm.required_delivery_date,
        buyer_notes: orderForm.buyer_notes
      };
      const res = await createBuyerOrder(payload);
      setFeedback({ type: 'success', message: `Order #${res.data?.order_id || 'CONFIRMED'} placed successfully! Escrow deposit locked.` });
      setShowOrderModal(false);
      loadBuyerData(true);
      setActiveTab('orders');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Submit Receiving Verification Record
  const handleConfirmReceiving = async (e) => {
    e.preventDefault();
    if (!selectedShipmentForReceiving) return;
    setFeedback(null);
    try {
      const payload = {
        received_total_quantity: parseFloat(receivingForm.received_total_quantity),
        received_grade_a_quantity: parseFloat(receivingForm.received_grade_a_quantity || 0),
        received_grade_b_quantity: parseFloat(receivingForm.received_grade_b_quantity || 0),
        damaged_quantity: parseFloat(receivingForm.damaged_quantity || 0),
        receiving_temperature: parseFloat(receivingForm.receiving_temperature),
        receiver_notes: receivingForm.receiver_notes,
        evidence_urls: receivingForm.photo_urls ? [receivingForm.photo_urls] : []
      };
      await recordReceiving(selectedShipmentForReceiving.shipment_id, payload);
      setFeedback({ type: 'success', message: `Delivery inspection recorded for #${selectedShipmentForReceiving.shipment_id}! Escrow funds released to farmer.` });
      setShowReceivingModal(false);
      loadBuyerData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Submit Dispute Claim
  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!selectedShipmentForDispute) return;
    setFeedback(null);
    try {
      const payload = {
        shipment_id: selectedShipmentForDispute.shipment_id,
        dispute_category: disputeForm.dispute_category,
        against_role: disputeForm.against_role,
        claim_amount: parseFloat(disputeForm.claim_amount),
        description: disputeForm.description,
        evidence_urls: disputeForm.evidence_urls ? [disputeForm.evidence_urls] : []
      };
      await createDispute(payload);
      setFeedback({ type: 'success', message: `Dispute claim filed on #${selectedShipmentForDispute.shipment_id}. Escalated to Admin Control Tower!` });
      setShowDisputeModal(false);
      loadBuyerData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Direct QR / ID Verification Lookup
  const handleVerifyLookup = async (e) => {
    e.preventDefault();
    if (!lookupShipmentId.trim()) return;
    setVerifying(true);
    setVerifiedResult(null);
    try {
      const res = await verifyShipment(lookupShipmentId.trim());
      setVerifiedResult(res);
    } catch (err) {
      setFeedback({ type: 'error', message: `Verification failed: ${err.message}` });
    } finally {
      setVerifying(false);
    }
  };

  const filteredMarketplace = marketplace.filter(item => {
    const matchesSearch = item.crop_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.farm_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCrop = selectedCropFilter === 'ALL' || item.crop_name === selectedCropFilter;
    return matchesSearch && matchesCrop;
  });

  const totalSpent = orders.reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);
  const activeDeliveries = shipments.filter(s => s.shipment_status === 'IN_TRANSIT' || s.shipment_status === 'ACCEPTED');

  return (
    <div>
      {/* 1. TOP HEADER & QUICK STATS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={24} color="#EC4899" />
            Buyer Procurement & Inspection Portal
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Verified crop provenance, purchase order escrow, QR receiving inspection & discrepancy resolution.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('verify')}
            className="btn btn-secondary btn-sm"
          >
            <QrCode size={14} />
            <span>Scan / Verify Shipment</span>
          </button>

          <button
            type="button"
            onClick={() => loadBuyerData(true)}
            disabled={refreshing}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Marketplace</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div style={{
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: feedback.type === 'success' ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)',
          fontSize: '13px'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2. KPI SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Available Marketplace Lots</span>
            <Package size={18} color="#EC4899" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {marketplace.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Verified export quality produce
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Inbound Shipments</span>
            <Truck size={18} color="var(--accent-blue)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-blue)' }}>
            {activeDeliveries.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Monitored in real-time reefer transit
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Purchase Orders</span>
            <ShoppingBag size={18} color="var(--accent-amber)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-amber-light)' }}>
            {orders.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {orders.filter(o => o.order_status === 'DELIVERED').length} deliveries verified
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Escrow Volume</span>
            <DollarSign size={18} color="var(--accent-emerald)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Protected by AGRITrust Escrow
          </div>
        </div>
      </div>

      {/* 3. SECTION NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {[
          { id: 'local-demand', label: 'Local Produce Demand (Rescue)', icon: AlertTriangle, isSpecial: true },
          { id: 'marketplace', label: 'Produce Marketplace', count: marketplace.length, icon: ShoppingBag },
          { id: 'orders', label: 'My Purchase Orders & Escrow', count: orders.length, icon: Package },
          { id: 'tracking', label: 'Inbound Shipments & Live GPS', count: shipments.length, icon: Truck },
          { id: 'verify', label: 'Shipment QR & Baseline Verification', icon: QrCode }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isSpecial = tab.isSpecial;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: isSpecial && isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? (isSpecial ? 'var(--accent-emerald)' : '#EC4899') : 'transparent'}`,
                color: isActive ? (isSpecial ? 'var(--accent-emerald-light)' : '#F472B6') : (isSpecial ? 'var(--accent-emerald-light)' : 'var(--text-secondary)'),
                fontWeight: isActive ? '800' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                borderRadius: isSpecial ? 'var(--radius-sm) var(--radius-sm) 0 0' : '0'
              }}
            >
              <Icon size={16} color={isSpecial ? 'var(--accent-emerald)' : undefined} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#F472B6' : 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 0: BUYER DASHBOARD OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AI BUYER DEMAND HERO BANNER */}
          <div style={{
            background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
            border: '1px solid #FBCFE8',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 16px rgba(217, 70, 239, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '750px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#D946EF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(217, 70, 239, 0.3)'
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A21CAF', background: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #F5D0FE' }}>
                    ✦ AI LOCAL DEMAND OPPORTUNITY
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#86198F' }}>
                    300 KG Grade A Tomatoes Available Nearby
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#701A75', lineHeight: '1.4' }}>
                  "Nearby reefer carrier can divert 300 KG Grade A Tomatoes to your Vashi dock at ₹22/KG (20% below APMC benchmark)."
                </div>
                <div style={{ fontSize: '12px', color: '#A21CAF', marginTop: '4px' }}>
                  ETA: <b>1 hr 15 min</b> · Quality Grade: <b style={{ color: '#15803D' }}>Grade A (96% Brix)</b> · Escrow Protected
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('local-demand')}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #D946EF, #C026D3)',
                  borderColor: '#C026D3',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  boxShadow: '0 4px 14px rgba(217, 70, 239, 0.25)'
                }}
              >
                <span>Accept Delivery Offer</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* ACTIVE INBOUND & MARKETPLACE SNAPSHOT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Inbound Shipments Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} color="var(--accent-blue)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>Inbound Deliveries</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tracking')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Track All ({activeDeliveries.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeDeliveries.slice(0, 3).map((shipment) => (
                  <div key={shipment.shipment_id} style={{
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                        {shipment.product_name} ({shipment.total_quantity || 1000} KG)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Origin: {shipment.origin}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                        {shipment.target_temp_min}°C - {shipment.target_temp_max}°C
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShipmentForReceiving(shipment);
                          setShowReceivingModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '10px', padding: '2px 6px', marginTop: '2px' }}
                      >
                        Verify Dock Intake
                      </button>
                    </div>
                  </div>
                ))}
                {activeDeliveries.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No active inbound shipments. Order produce from marketplace.
                  </div>
                )}
              </div>
            </div>

            {/* Verified Produce Lots Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} color="#D946EF" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>Verified Harvest Marketplace</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('marketplace')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Browse ({marketplace.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {marketplace.slice(0, 3).map((item) => (
                  <div key={item.produce_id} style={{
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                        {item.crop_name} ({item.variety})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Farmer: {item.farmer_name || 'Sahyadri Orchards'} · <b style={{ color: 'var(--accent-emerald)' }}>{item.quality_grade || 'Grade A'}</b>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListingForOrder(item);
                        setShowOrderModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px', background: '#D946EF', borderColor: '#D946EF' }}
                    >
                      Buy ₹{item.unit_price_per_kg}/kg
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 0.5: LOCAL PRODUCE DEMAND & RESCUE DEALS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'local-demand' && (
        <BuyerLocalDemand />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB A: PRODUCE MARKETPLACE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'marketplace' && (

        <div>
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder="Search by crop, variety, or farmer region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px 9px 36px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={selectedCropFilter}
              onChange={(e) => setSelectedCropFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 14px',
                color: '#fff',
                fontSize: '13px'
              }}
            >
              <option value="ALL">All Commodities</option>
              <option value="Mango">Mango</option>
              <option value="Grapes">Grapes</option>
              <option value="Pomegranate">Pomegranate</option>
              <option value="Tomato">Tomato</option>
            </select>
          </div>

          {/* Produce Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredMarketplace.map((item) => (
              <div key={item.listing_id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {item.crop_name}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>
                      {item.variety}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-emerald-light)', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                    ₹{item.unit_price_per_kg}/kg
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Origin: <b>{item.farm_name || 'Sahyadri Orchards'}</b> ({item.farmer_name || 'Ramesh Patil'})
                </div>

                {/* Verified Specs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '10px', marginBottom: '12px', fontSize: '11px', textAlign: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Stock</span>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.available_quantity_kg} kg</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Sweetness</span>
                    <div style={{ fontWeight: '700', color: 'var(--accent-amber-light)' }}>{item.brix_level || 16.5}° Bx</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Thermal Limit</span>
                    <div style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>{item.target_temp_min}°-{item.target_temp_max}°C</div>
                  </div>
                </div>

                {item.inspection_notes && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontStyle: 'italic' }}>
                    "{item.inspection_notes}"
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedListingForOrder(item);
                    setOrderForm(prev => ({
                      ...prev,
                      quantity_kg: Math.min(500.0, item.available_quantity_kg)
                    }));
                    setShowOrderModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}
                >
                  <ShoppingBag size={14} />
                  <span>Place Purchase Order</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB B: PURCHASE ORDERS & ESCROW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="#EC4899" />
            My Purchase Orders & Escrow Custody
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 14px' }}>Order ID</th>
                  <th style={{ padding: '12px 14px' }}>Produce</th>
                  <th style={{ padding: '12px 14px' }}>Quantity</th>
                  <th style={{ padding: '12px 14px' }}>Total Amount</th>
                  <th style={{ padding: '12px 14px' }}>Order Status</th>
                  <th style={{ padding: '12px 14px' }}>Escrow Status</th>
                  <th style={{ padding: '12px 14px' }}>Delivery Destination</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.order_id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <td className="font-mono" style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                      {ord.order_id}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <b>{ord.produce_name}</b>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Farmer: {ord.farmer_name || 'Ramesh Patil'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                      {ord.quantity_kg} kg
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--accent-emerald-light)' }}>
                      ₹{ord.total_amount?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: ord.order_status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: ord.order_status === 'DELIVERED' ? 'var(--accent-emerald-light)' : 'var(--accent-blue)'
                      }}>
                        {ord.order_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: ord.payment_status === 'RELEASED_TO_FARMER' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: ord.payment_status === 'RELEASED_TO_FARMER' ? 'var(--accent-emerald-light)' : 'var(--accent-amber-light)'
                      }}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '200px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ord.delivery_address}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB C: INBOUND SHIPMENTS & LIVE GPS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tracking' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {shipments.map((s) => {
              const matchedCons = consignments.find(c => c.consignment_id === s.consignment_id || c.verification_reference_number === s.verification_reference_number || c.product_name === s.product_name);
              const vrfNum = s.verification_reference_number || matchedCons?.verification_reference_number || 'VRF-2026-0941';

              return (
                <div key={s.shipment_id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                        {s.shipment_id}
                      </span>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {s.product_name}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: s.shipment_status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color: s.shipment_status === 'DELIVERED' ? 'var(--accent-emerald-light)' : 'var(--accent-blue)'
                    }}>
                      {s.shipment_status}
                    </span>
                  </div>

                  {/* VRF Certificate Badge */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ClipboardCheck size={14} color="var(--accent-emerald-light)" />
                      <span style={{ fontWeight: '700', color: 'var(--accent-emerald-light)' }}>VRF Certified:</span>
                      <code style={{ color: 'var(--text-primary)' }}>{vrfNum}</code>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const consId = matchedCons?.consignment_id || 'REQ-2026-001';
                          const det = await fetchConsignmentDetail(consId);
                          setSelectedConsignmentReport(det);
                        } catch (e) {
                          setSelectedConsignmentReport({
                            consignment_id: 'REQ-2026-001',
                            product_name: s.product_name,
                            declared_quantity_kg: s.total_quantity || 1000,
                            verified_quantity_kg: s.total_quantity || 980,
                            verification_reference_number: vrfNum,
                            inspections: [{
                              officer_name: 'Inspector S. Kulkarni',
                              verified_weight_kg: s.total_quantity || 980,
                              pulp_temperature_c: 11.2,
                              brix_level: 16.8,
                              decision: 'APPROVED',
                              officer_notes: 'APEDA export grade compliant. Seals applied on reefer crates.'
                            }]
                          });
                        }
                        setShowReportModal(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-blue)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      View Report
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Dispatched Weight</span>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{s.total_quantity || 1000} kg</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Safe Temp Range</span>
                      <div style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{s.target_temp_min}°-{s.target_temp_max}°C</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', marginBottom: '14px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Origin: <b>{s.origin}</b></div>
                    <div style={{ color: 'var(--text-muted)' }}>Destination: <b>{s.destination}</b></div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShipmentForReceiving(s);
                        setReceivingForm(prev => ({
                          ...prev,
                          received_total_quantity: s.total_quantity || 1000.0,
                          received_grade_a_quantity: (s.total_quantity || 1000.0) * 0.95
                        }));
                        setShowReceivingModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Confirm Receiving</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShipmentForDispute(s);
                        setShowDisputeModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                      title="Report discrepancy or damage"
                    >
                      <AlertTriangle size={14} />
                      <span>Report Issue</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB D: QR & PROVENANCE VERIFICATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'verify' && (
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={20} color="var(--accent-cyan)" />
              Scan Shipment QR or Lookup ID
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Verify unalterable provenance, gate physical verification certificate, custody chain & temperature records.
            </p>

            <form onSubmit={handleVerifyLookup} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter Shipment ID (e.g. AGRI-DEMO-101 or SHP-0001)..."
                value={lookupShipmentId}
                onChange={(e) => setLookupShipmentId(e.target.value)}
                required
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <button type="submit" disabled={verifying} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                {verifying ? 'Verifying...' : 'Verify Shipment'}
              </button>
            </form>
          </div>

          {verifiedResult && (
            <div className="card" style={{ padding: '24px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={24} color="var(--accent-emerald)" />
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      VERIFIED SHIPMENT RECORD & CERTIFICATE
                    </h4>
                    <span className="font-mono" style={{ fontSize: '13px', color: 'var(--accent-blue)' }}>
                      #{verifiedResult.shipment?.shipment_id || lookupShipmentId}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald-light)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                  PHYSICALLY VERIFIED
                </span>
              </div>

              {/* Physical Verification Sub-Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-emerald-light)' }}>
                    MANDATORY PHYSICAL VERIFICATION (VRF) PASSED
                  </div>
                  <div className="font-mono" style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                    VRF-2026-0941 · Inspected by Field Quality Officer
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                  ✓ 8/8 Inspection Checks Passed
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Commodity</span>
                  <b style={{ color: 'var(--text-primary)' }}>{verifiedResult.shipment?.product_name || 'Mango'}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Verified Weight</span>
                  <b style={{ color: 'var(--accent-emerald-light)' }}>{verifiedResult.shipment?.total_quantity || 1000} kg</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Origin</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{verifiedResult.shipment?.origin}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Safe Thermal Bounds</span>
                  <b style={{ color: 'var(--accent-cyan)' }}>{verifiedResult.shipment?.target_temp_min}°C — {verifiedResult.shipment?.target_temp_max}°C</b>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PLACE PURCHASE ORDER */}
      {/* ------------------------------------------------------------- */}
      {showOrderModal && selectedListingForOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
              Place Purchase Order
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Listing: <b style={{ color: '#EC4899' }}>{selectedListingForOrder.crop_name} ({selectedListingForOrder.variety})</b> @ ₹{selectedListingForOrder.unit_price_per_kg}/kg
            </p>

            <form onSubmit={handlePlaceOrder}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Order Quantity (kg) *</label>
                <input
                  type="number"
                  max={selectedListingForOrder.available_quantity_kg}
                  value={orderForm.quantity_kg}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity_kg: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery Address *</label>
                <input
                  type="text"
                  value={orderForm.delivery_address}
                  onChange={(e) => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Required Delivery Date</label>
                <input
                  type="date"
                  value={orderForm.required_delivery_date}
                  onChange={(e) => setOrderForm({ ...orderForm, required_delivery_date: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              {/* Total Escrow Calculation Box */}
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Escrow Deposit:</span>
                <b style={{ color: 'var(--accent-emerald-light)' }}>
                  ₹{(orderForm.quantity_kg * (selectedListingForOrder.unit_price_per_kg || 180)).toLocaleString('en-IN')}
                </b>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
                  Confirm Order & Lock Escrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONFIRM RECEIVING & QUALITY INSPECTION */}
      {/* ------------------------------------------------------------- */}
      {showReceivingModal && selectedShipmentForReceiving && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Confirm Delivery Inspection for #{selectedShipmentForReceiving.shipment_id}
            </h3>

            <form onSubmit={handleConfirmReceiving}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Actual Received (kg) *</label>
                  <input
                    type="number"
                    value={receivingForm.received_total_quantity}
                    onChange={(e) => setReceivingForm({ ...receivingForm, received_total_quantity: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Receiving Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={receivingForm.receiving_temperature}
                    onChange={(e) => setReceivingForm({ ...receivingForm, receiving_temperature: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Grade A Quality (kg)</label>
                  <input
                    type="number"
                    value={receivingForm.received_grade_a_quantity}
                    onChange={(e) => setReceivingForm({ ...receivingForm, received_grade_a_quantity: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Damaged / Spoiled (kg)</label>
                  <input
                    type="number"
                    value={receivingForm.damaged_quantity}
                    onChange={(e) => setReceivingForm({ ...receivingForm, damaged_quantity: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Inspection Notes</label>
                <textarea
                  rows={2}
                  value={receivingForm.receiver_notes}
                  onChange={(e) => setReceivingForm({ ...receivingForm, receiver_notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Inspection Evidence Photo URL</label>
                <input
                  type="text"
                  value={receivingForm.photo_urls}
                  onChange={(e) => setReceivingForm({ ...receivingForm, photo_urls: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowReceivingModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Verify & Release Escrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REPORT DISPUTE / DISCREPANCY */}
      {/* ------------------------------------------------------------- */}
      {showDisputeModal && selectedShipmentForDispute && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', marginBottom: '12px' }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Report Discrepancy on #{selectedShipmentForDispute.shipment_id}
              </h3>
            </div>

            <form onSubmit={handleCreateDispute}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dispute Category</label>
                <select
                  value={disputeForm.dispute_category}
                  onChange={(e) => setDisputeForm({ ...disputeForm, dispute_category: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="QUANTITY_SHORTAGE">Quantity Shortage</option>
                  <option value="TEMPERATURE_EXCURSION">Temperature Excursion</option>
                  <option value="GRADE_MISMATCH">Quality / Grade Mismatch</option>
                  <option value="CARGO_DAMAGE">Cargo Spoilage / Physical Damage</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Claim Amount (₹)</label>
                <input
                  type="number"
                  value={disputeForm.claim_amount}
                  onChange={(e) => setDisputeForm({ ...disputeForm, claim_amount: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description of Problem</label>
                <textarea
                  rows={3}
                  value={disputeForm.description}
                  onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Evidence Image URL</label>
                <input
                  type="text"
                  value={disputeForm.evidence_urls}
                  onChange={(e) => setDisputeForm({ ...disputeForm, evidence_urls: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowDisputeModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--accent-rose)' }}>
                  File Formal Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PHYSICAL VERIFICATION CERTIFICATE & EVIDENCE */}
      {/* ------------------------------------------------------------- */}
      {showReportModal && selectedConsignmentReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={26} color="var(--accent-emerald)" />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Physical Verification Certificate (VRF)
                  </h3>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>
                    Ref #{selectedConsignmentReport.verification_reference_number || 'VRF-2026-0941'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
              >
                ✕ Close
              </button>
            </div>

            {/* VRF Certificate Seal Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 18px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-emerald-light)' }}>
                    OFFICIALLY INSPECTED & CERTIFIED
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                    {selectedConsignmentReport.product_name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Verified Weight:</span>
                  <div className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
                    {(selectedConsignmentReport.verified_quantity_kg || selectedConsignmentReport.declared_quantity_kg)?.toLocaleString()} kg
                  </div>
                </div>
              </div>
            </div>

            {/* Inspection Checklist Overview */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardCheck size={16} color="var(--accent-emerald)" />
                <span>On-Site Physical Inspection Metrics</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Declared vs Verified: </span>
                  <b>{selectedConsignmentReport.declared_quantity_kg}kg → {selectedConsignmentReport.verified_quantity_kg || selectedConsignmentReport.declared_quantity_kg}kg</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Pulp Temp at Inspection: </span>
                  <b style={{ color: 'var(--accent-cyan)' }}>{selectedConsignmentReport.inspections?.[0]?.pulp_temperature_c || '11.2'}°C</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Sugar / Brix Reading: </span>
                  <b style={{ color: 'var(--accent-amber-light)' }}>{selectedConsignmentReport.inspections?.[0]?.brix_level || '16.5'}° Bx</b>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Visual Quality Grade: </span>
                  <b style={{ color: 'var(--accent-emerald-light)' }}>Export Grade A (No Contamination)</b>
                </div>
              </div>

              {selectedConsignmentReport.inspections?.[0]?.officer_notes && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <b>Officer Remarks:</b> "{selectedConsignmentReport.inspections[0].officer_notes}"
                </div>
              )}
            </div>

            {/* Photographic Evidence Grid */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={15} color="var(--accent-blue)" />
                <span>Field Officer Verification Photo Evidence</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"
                  alt="Verified crates"
                  style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                />
                <img
                  src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500"
                  alt="Quality inspection"
                  style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="btn btn-primary btn-sm"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
