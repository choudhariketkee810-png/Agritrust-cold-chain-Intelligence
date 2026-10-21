import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Truck,
  Ship,
  Plane,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  FileText,
  DollarSign,
  Info,
  Calendar,
  Layers,
  Thermometer,
  Zap,
  Leaf,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Box,
  Scale,
  Navigation as NavIcon,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  planAndCompareRoutes,
  fetchMultimodalQuotes,
  createMultimodalBooking,
  fetchMultimodalBookings,
  fetchMultimodalTracking,
  advanceMultimodalSegment,
  fetchPincodeDirectory,
  fetchTransportRateCards,
  updateTransportRateCard
} from '../api';
import { useAuth } from '../context/AuthContext';

// Preset scenarios for rapid demonstration
const PRESET_SCENARIOS = [
  {
    name: '🍇 Maharashtra to Delhi (Farm-to-Retail Fresh Grapes)',
    pickupPin: '422001',
    pickupLoc: 'Nashik Sahyadri Farm Hub',
    destPin: '110037',
    destLoc: 'Delhi Central Cold Hub',
    weight: 4500,
    cargoType: 'Fresh Organic Table Grapes',
    volume: 18,
    perishable: true,
    shelfLife: 14,
    tempReq: 'Chilled (2°C to 6°C)',
    tempMin: 2,
    tempMax: 6,
    value: 540000,
    urgency: 'STANDARD',
    priority: 'BALANCED'
  },
  {
    name: '🥭 Nashik to Rotterdam Export (Bulk Ocean Reefer)',
    pickupPin: '422001',
    pickupLoc: 'Nashik Packhouse CC-02',
    destPin: '300002',
    destLoc: 'EuroFresh Logistics BV, Rotterdam',
    weight: 18500,
    cargoType: 'Export Alphonso Mangoes',
    volume: 54,
    perishable: true,
    shelfLife: 30,
    tempReq: 'Controlled Atmosphere (8°C to 12°C)',
    tempMin: 8,
    tempMax: 12,
    value: 2200000,
    urgency: 'STANDARD',
    priority: 'COST'
  },
  {
    name: '💉 Bangalore to Guwahati (Urgent High-Value Cold Pharma/Berries)',
    pickupPin: '560001',
    pickupLoc: 'Bengaluru Whitefield Cold Hub',
    destPin: '781001',
    destLoc: 'Guwahati Northeast Health Depot',
    weight: 850,
    cargoType: 'Pharmaceutical Vaccines & Fresh Berries',
    volume: 3.8,
    length: 120,
    width: 100,
    height: 160,
    perishable: true,
    shelfLife: 4,
    tempReq: 'Deep Chilled (2°C to 4°C)',
    tempMin: 2,
    tempMax: 4,
    value: 1500000,
    urgency: 'CRITICAL',
    priority: 'SPEED'
  },
  {
    name: '🍎 Mumbai to Chennai Coastal (Apples & Dairy)',
    pickupPin: '400001',
    pickupLoc: 'Mumbai Agro Wholesale Terminal',
    destPin: '600001',
    destLoc: 'Chennai Retail Cold Dock',
    weight: 10000,
    cargoType: 'Apples & Dairy Products',
    volume: 35,
    perishable: true,
    shelfLife: 21,
    tempReq: 'Chilled (2°C to 6°C)',
    tempMin: 2,
    tempMax: 6,
    value: 950000,
    urgency: 'STANDARD',
    priority: 'BALANCED'
  }
];

export default function MultiRoutePlanner({ activeTab: externalTab, onNavigateTab }) {
  const { user, role } = useAuth();

  // Navigation sub-tabs inside Multi-Route Intelligence
  const [activeSubTab, setActiveSubTab] = useState('planner'); // 'planner', 'tracking', 'history', 'rate-cards'

  // Input Form State
  const [formData, setFormData] = useState({
    pickup_pincode: '422001',
    pickup_location: 'Nashik Sahyadri Farm Hub',
    destination_pincode: '110037',
    destination_location: 'Delhi Central Cold Distribution Hub',
    cargo_weight_kg: 4500,
    cargo_weight_unit: 'KG', // 'KG' or 'MT'
    cargo_type: 'Fresh Table Grapes',
    cargo_volume_cbm: 18,
    package_length_cm: 120,
    package_width_cm: 100,
    package_height_cm: 150,
    is_perishable: true,
    shelf_life_days: 14,
    required_delivery_date: '',
    urgency_level: 'STANDARD',
    temperature_requirement: 'Chilled (2°C to 6°C)',
    temp_min_c: 2.0,
    temp_max_c: 6.0,
    insurance_preference: 'STANDARD',
    declared_cargo_value_inr: 540000,
    priority_preference: 'BALANCED'
  });

  // UI & Data States
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [selectedRouteForDetail, setSelectedRouteForDetail] = useState('ROAD');
  const [showCostBreakdownModal, setShowCostBreakdownModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [routeToBook, setRouteToBook] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  // Booking Form
  const [bookingContact, setBookingContact] = useState({
    sender_name: 'Sahyadri Farmer Producer Co.',
    sender_phone: '+91 98220 54321',
    receiver_name: 'Delhi Fresh Agro Mart Hub',
    receiver_phone: '+91 98110 98765',
    special_instructions: 'Maintain uninterrupted reefer setpoint. Temperature logs required at dock discharge.'
  });

  // Multimodal Tracking & History
  const [quotesList, setQuotesList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [selectedTrackingShipmentId, setSelectedTrackingShipmentId] = useState('SHP-MM-ROAD-001');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [advancingSegment, setAdvancingSegment] = useState(false);

  // Rate Cards (Admin view)
  const [rateCards, setRateCards] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [rateCardSaving, setRateCardSaving] = useState(false);

  // Feedback banner
  const [bannerMessage, setBannerMessage] = useState(null);

  // Load initial quotes, bookings, and default plan on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [quotesRes, bookingsRes, pinsRes, ratesRes] = await Promise.allSettled([
        fetchMultimodalQuotes(20),
        fetchMultimodalBookings(20),
        fetchPincodeDirectory(),
        fetchTransportRateCards()
      ]);

      if (quotesRes.status === 'fulfilled' && quotesRes.value?.data) {
        setQuotesList(quotesRes.value.data);
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.data) {
        setBookingsList(bookingsRes.value.data);
        if (bookingsRes.value.data.length > 0 && !selectedTrackingShipmentId) {
          setSelectedTrackingShipmentId(bookingsRes.value.data[0].shipment_id);
        }
      }
      if (pinsRes.status === 'fulfilled' && pinsRes.value?.data) {
        setPincodes(pinsRes.value.data);
      }
      if (ratesRes.status === 'fulfilled' && ratesRes.value?.data) {
        setRateCards(ratesRes.value.data);
      }

      // Run initial comparison
      handleCompareRoutes();
    } catch (err) {
      console.error('Failed to load initial multimodal data:', err);
    }
  };

  // Load tracking details when tracking tab or shipment changes
  useEffect(() => {
    if (selectedTrackingShipmentId && activeSubTab === 'tracking') {
      loadShipmentTracking(selectedTrackingShipmentId);
    }
  }, [selectedTrackingShipmentId, activeSubTab]);

  const loadShipmentTracking = async (shipmentId) => {
    setTrackingLoading(true);
    try {
      const res = await fetchMultimodalTracking(shipmentId);
      if (res && res.data) {
        setTrackingData(res.data);
      }
    } catch (err) {
      console.error('Tracking fetch error:', err);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Handle Preset Selection
  const applyPreset = (preset) => {
    setFormData({
      pickup_pincode: preset.pickupPin,
      pickup_location: preset.pickupLoc,
      destination_pincode: preset.destPin,
      destination_location: preset.destLoc,
      cargo_weight_kg: preset.weight,
      cargo_weight_unit: 'KG',
      cargo_type: preset.cargoType,
      cargo_volume_cbm: preset.volume,
      package_length_cm: preset.length || 120,
      package_width_cm: preset.width || 100,
      package_height_cm: preset.height || 150,
      is_perishable: preset.perishable,
      shelf_life_days: preset.shelfLife,
      required_delivery_date: '',
      urgency_level: preset.urgency,
      temperature_requirement: preset.tempReq,
      temp_min_c: preset.tempMin,
      temp_max_c: preset.tempMax,
      insurance_preference: 'COMPREHENSIVE',
      declared_cargo_value_inr: preset.value,
      priority_preference: preset.priority
    });
    setBannerMessage({ type: 'info', text: `Loaded preset: ${preset.name}` });
    setTimeout(() => setBannerMessage(null), 3500);
  };

  // Compare All 3 Routes Action
  const handleCompareRoutes = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setBannerMessage(null);
    try {
      const weightInKg = formData.cargo_weight_unit === 'MT'
        ? Number(formData.cargo_weight_kg) * 1000
        : Number(formData.cargo_weight_kg);

      const payload = {
        pickup_pincode: formData.pickup_pincode,
        pickup_location: formData.pickup_location,
        destination_pincode: formData.destination_pincode,
        destination_location: formData.destination_location,
        cargo_weight_kg: weightInKg,
        cargo_type: formData.cargo_type,
        cargo_volume_cbm: Number(formData.cargo_volume_cbm) || null,
        package_length_cm: Number(formData.package_length_cm) || null,
        package_width_cm: Number(formData.package_width_cm) || null,
        package_height_cm: Number(formData.package_height_cm) || null,
        is_perishable: Boolean(formData.is_perishable),
        shelf_life_days: Number(formData.shelf_life_days) || 7,
        required_delivery_date: formData.required_delivery_date || null,
        urgency_level: formData.urgency_level,
        temperature_requirement: formData.temperature_requirement,
        temp_min_c: Number(formData.temp_min_c),
        temp_max_c: Number(formData.temp_max_c),
        insurance_preference: formData.insurance_preference,
        declared_cargo_value_inr: Number(formData.declared_cargo_value_inr) || 0,
        priority_preference: formData.priority_preference,
        user_id: user?.user_id || 'usr_logistics_01',
        user_role: role || 'LOGISTICS'
      };

      const response = await planAndCompareRoutes(payload);
      if (response && response.data) {
        setComparisonResult(response.data);
        // Refresh quote history list
        fetchMultimodalQuotes(20).then(q => q?.data && setQuotesList(q.data));
      }
    } catch (err) {
      console.error('Failed to compare routes:', err);
      setBannerMessage({ type: 'error', text: err.message || 'Failed to compare multimodal routes.' });
    } finally {
      setLoading(false);
    }
  };

  // Open Booking Confirmation Modal
  const initiateBooking = (mode) => {
    if (!comparisonResult?.routes?.[mode]) return;
    const opt = comparisonResult.routes[mode];
    if (!opt.is_feasible) {
      alert(`Cannot book infeasible route: ${opt.infeasibility_reason}`);
      return;
    }
    setRouteToBook({ mode, option: opt });
    setShowBookingModal(true);
  };

  // Submit Booking to Backend
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!routeToBook || !comparisonResult) return;
    setBookingLoading(true);
    try {
      const payload = {
        quote_id: comparisonResult.quote_id,
        selected_mode: routeToBook.mode,
        produce_name: formData.cargo_type,
        cargo_weight_kg: Number(formData.cargo_weight_kg),
        pickup_pincode: formData.pickup_pincode,
        pickup_location: formData.pickup_location,
        destination_pincode: formData.destination_pincode,
        destination_location: formData.destination_location,
        sender_name: bookingContact.sender_name,
        sender_phone: bookingContact.sender_phone,
        receiver_name: bookingContact.receiver_name,
        receiver_phone: bookingContact.receiver_phone,
        special_instructions: bookingContact.special_instructions,
        user_id: user?.user_id || 'usr_logistics_01'
      };

      const res = await createMultimodalBooking(payload);
      if (res && res.data) {
        setBookingSuccessData(res.data);
        setShowBookingModal(false);
        // Refresh bookings list and navigate to tracking
        fetchMultimodalBookings(20).then(b => {
          if (b?.data) {
            setBookingsList(b.data);
            setSelectedTrackingShipmentId(res.data.shipment_id);
          }
        });
        setBannerMessage({
          type: 'success',
          text: `🎉 Booking Confirmed! Shipment ID: ${res.data.shipment_id} via ${routeToBook.mode} mode.`
        });
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      alert(`Failed to confirm booking: ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  // Advance route segment in tracking view (demo progression)
  const handleAdvanceSegment = async () => {
    if (!selectedTrackingShipmentId) return;
    setAdvancingSegment(true);
    try {
      const res = await advanceMultimodalSegment(selectedTrackingShipmentId);
      if (res && res.data) {
        loadShipmentTracking(selectedTrackingShipmentId);
        fetchMultimodalBookings(20).then(b => b?.data && setBookingsList(b.data));
      }
    } catch (err) {
      alert(`Error advancing segment: ${err.message}`);
    } finally {
      setAdvancingSegment(false);
    }
  };

  // Helper Badge Color & Icon Mapper
  const renderBadge = (badgeKey) => {
    switch (badgeKey) {
      case 'BEST_BALANCED':
        return (
          <span key={badgeKey} style={{
            background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE',
            padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <Sparkles size={13} color="#4338CA" /> ⚖️ Best Balanced
          </span>
        );
      case 'LOWEST_COST':
        return (
          <span key={badgeKey} style={{
            background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
            padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <DollarSign size={13} color="#065F46" /> 🏆 Lowest Estimated Cost
          </span>
        );
      case 'FASTEST_DELIVERY':
        return (
          <span key={badgeKey} style={{
            background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A',
            padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <Zap size={13} color="#D97706" /> ⚡ Fastest Delivery
          </span>
        );
      case 'BEST_PERISHABLE':
        return (
          <span key={badgeKey} style={{
            background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE',
            padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <Thermometer size={13} color="#2563EB" /> ❄️ Best for Perishables
          </span>
        );
      case 'LOWEST_EMISSIONS':
        return (
          <span key={badgeKey} style={{
            background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
            padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <Leaf size={13} color="#16A34A" /> 🌱 Lowest CO₂ Emissions
          </span>
        );
      default:
        return null;
    }
  };

  const routes = comparisonResult?.routes;

  return (
    <div style={{ padding: '24px 32px', background: '#F8FAFC', minHeight: '100vh', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. HEADER & TOP BANNER */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#0284C7', color: '#FFFFFF', padding: '8px', borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Compass size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
                Multi-Route Intelligence & Shipment Planner
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Compare door-to-door cost, transit velocity, cold-chain preservation & carbon footprint across <b>Road</b>, <b>Marine</b>, and <b>Air</b> transport modes.
              </p>
            </div>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS */}
        <div style={{ display: 'flex', background: '#FFFFFF', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('planner')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '7px',
              background: activeSubTab === 'planner' ? '#0284C7' : 'transparent',
              color: activeSubTab === 'planner' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            <Sliders size={15} /> 3-Route Planner
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tracking')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '7px',
              background: activeSubTab === 'tracking' ? '#0284C7' : 'transparent',
              color: activeSubTab === 'tracking' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            <NavIcon size={15} /> Multimodal Tracking ({bookingsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '7px',
              background: activeSubTab === 'history' ? '#0284C7' : 'transparent',
              color: activeSubTab === 'history' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            <FileText size={15} /> Saved Quotes ({quotesList.length})
          </button>
          {['ADMIN', 'LOGISTICS'].includes(role) && (
            <button
              type="button"
              onClick={() => setActiveSubTab('rate-cards')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '7px',
                background: activeSubTab === 'rate-cards' ? '#0284C7' : 'transparent',
                color: activeSubTab === 'rate-cards' ? '#FFFFFF' : '#475569',
                transition: 'all 0.2s'
              }}
            >
              <DollarSign size={15} /> Rate Cards ({rateCards.length})
            </button>
          )}
        </div>
      </div>

      {/* BANNER NOTICES */}
      {bannerMessage && (
        <div style={{
          background: bannerMessage.type === 'error' ? '#FEE2E2' : (bannerMessage.type === 'success' ? '#DCFCE7' : '#E0F2FE'),
          border: `1px solid ${bannerMessage.type === 'error' ? '#FCA5A5' : (bannerMessage.type === 'success' ? '#86EFAC' : '#7DD3FC')}`,
          color: bannerMessage.type === 'error' ? '#991B1B' : (bannerMessage.type === 'success' ? '#166534' : '#0369A1'),
          padding: '12px 18px', borderRadius: '8px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            {bannerMessage.type === 'error' ? <AlertCircle size={18} /> : (bannerMessage.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />)}
            <span>{bannerMessage.text}</span>
          </div>
          <button type="button" onClick={() => setBannerMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB 1: SMART MULTI-ROUTE SHIPMENT PLANNER & 3-CARD COMPARISON */}
      {/* ========================================================================= */}
      {activeSubTab === 'planner' && (
        <>
          {/* RAPID PRESET SELECTOR BAR */}
          <div style={{
            background: '#FFFFFF', padding: '14px 20px', borderRadius: '12px', border: '1px solid #E2E8F0',
            marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center',
            gap: '12px', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Scenario Presets:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
              {PRESET_SCENARIOS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px',
                    padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: '#1E293B',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E0F2FE'; e.currentTarget.style.borderColor = '#38BDF8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT FORM CONTAINER */}
          <div style={{
            background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0',
            padding: '24px 28px', marginBottom: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="#0284C7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                  Shipment Parameters & Cargo Specifications
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                All 3 modes are evaluated against identical consignor criteria
              </span>
            </div>

            <form onSubmit={handleCompareRoutes}>
              {/* ROW 1: ORIGIN & DESTINATION WITH PINCODES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Pickup PIN Code & Location *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. 422001"
                      value={formData.pickup_pincode}
                      onChange={(e) => setFormData({ ...formData, pickup_pincode: e.target.value })}
                      style={{
                        width: '100px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                        fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FAFAFA'
                      }}
                      required
                    />
                    <input
                      type="text"
                      placeholder="e.g. Nashik Sahyadri Farm Hub"
                      value={formData.pickup_location}
                      onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                        fontSize: '13px', color: '#0F172A', background: '#FAFAFA'
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Destination PIN Code & Location *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. 110037"
                      value={formData.destination_pincode}
                      onChange={(e) => setFormData({ ...formData, destination_pincode: e.target.value })}
                      style={{
                        width: '100px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                        fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FAFAFA'
                      }}
                      required
                    />
                    <input
                      type="text"
                      placeholder="e.g. Delhi Central Cold Distribution Hub"
                      value={formData.destination_location}
                      onChange={(e) => setFormData({ ...formData, destination_location: e.target.value })}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                        fontSize: '13px', color: '#0F172A', background: '#FAFAFA'
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ROW 2: CARGO TYPE, WEIGHT & VOLUME */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Cargo Classification *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fresh Table Grapes"
                    value={formData.cargo_type}
                    onChange={(e) => setFormData({ ...formData, cargo_type: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                      fontSize: '13px', color: '#0F172A', background: '#FAFAFA', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Cargo Weight *
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={formData.cargo_weight_kg}
                      onChange={(e) => setFormData({ ...formData, cargo_weight_kg: e.target.value })}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                        fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FAFAFA'
                      }}
                      required
                    />
                    <select
                      value={formData.cargo_weight_unit}
                      onChange={(e) => setFormData({ ...formData, cargo_weight_unit: e.target.value })}
                      style={{
                        padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                        fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FAFAFA'
                      }}
                    >
                      <option value="KG">kg</option>
                      <option value="MT">MT (Tonnes)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Cargo Volume (m³)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 18.0"
                    value={formData.cargo_volume_cbm}
                    onChange={(e) => setFormData({ ...formData, cargo_volume_cbm: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                      fontSize: '13px', color: '#0F172A', background: '#FAFAFA', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Package Dims (L × W × H cm)
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="number"
                      placeholder="L"
                      value={formData.package_length_cm}
                      onChange={(e) => setFormData({ ...formData, package_length_cm: e.target.value })}
                      style={{ width: '33%', padding: '10px 6px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', textAlign: 'center' }}
                    />
                    <input
                      type="number"
                      placeholder="W"
                      value={formData.package_width_cm}
                      onChange={(e) => setFormData({ ...formData, package_width_cm: e.target.value })}
                      style={{ width: '33%', padding: '10px 6px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', textAlign: 'center' }}
                    />
                    <input
                      type="number"
                      placeholder="H"
                      value={formData.package_height_cm}
                      onChange={(e) => setFormData({ ...formData, package_height_cm: e.target.value })}
                      style={{ width: '33%', padding: '10px 6px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>

              {/* ROW 3: COLD CHAIN, SHELF LIFE, TEMPERATURE BRACKET */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Perishable Cold-Chain? *
                  </label>
                  <select
                    value={formData.is_perishable ? 'YES' : 'NO'}
                    onChange={(e) => setFormData({ ...formData, is_perishable: e.target.value === 'YES' })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                      fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FAFAFA'
                    }}
                  >
                    <option value="YES">❄️ Yes (Requires Active Temperature Control)</option>
                    <option value="NO">📦 No (Ambient General Goods)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Total Shelf Life (Days) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                      fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FAFAFA', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Temperature Setpoint Range (°C)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Min °C"
                      value={formData.temp_min_c}
                      onChange={(e) => setFormData({ ...formData, temp_min_c: e.target.value })}
                      style={{ width: '50%', padding: '10px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', textAlign: 'center' }}
                    />
                    <span style={{ color: '#94A3B8' }}>to</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Max °C"
                      value={formData.temp_max_c}
                      onChange={(e) => setFormData({ ...formData, temp_max_c: e.target.value })}
                      style={{ width: '50%', padding: '10px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', textAlign: 'center' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Declared Cargo Value (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 540000"
                    value={formData.declared_cargo_value_inr}
                    onChange={(e) => setFormData({ ...formData, declared_cargo_value_inr: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                      fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FAFAFA', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* ROW 4: PREFERENCES & SUBMISSION BUTTON */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginRight: '8px' }}>Urgency:</span>
                    <select
                      value={formData.urgency_level}
                      onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: '600' }}
                    >
                      <option value="STANDARD">Standard Delivery</option>
                      <option value="EXPRESS">Express Priority</option>
                      <option value="CRITICAL">Critical Emergency</option>
                    </select>
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginRight: '8px' }}>Optimization Priority:</span>
                    <select
                      value={formData.priority_preference}
                      onChange={(e) => setFormData({ ...formData, priority_preference: e.target.value })}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: '600' }}
                    >
                      <option value="BALANCED">⚖️ Balanced (Cost + Speed)</option>
                      <option value="COST">💰 Lowest Cost Priority</option>
                      <option value="SPEED">⚡ Fastest Speed Priority</option>
                    </select>
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginRight: '8px' }}>Insurance:</span>
                    <select
                      value={formData.insurance_preference}
                      onChange={(e) => setFormData({ ...formData, insurance_preference: e.target.value })}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: '600' }}
                    >
                      <option value="STANDARD">Standard Transit Cover</option>
                      <option value="COMPREHENSIVE">Comprehensive All-Risk (Cold-Chain Excursion)</option>
                      <option value="NONE">None</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '12px 28px',
                    fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)', display: 'flex', alignItems: 'center', gap: '9px',
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Computing 3-Mode Matrix...</span>
                    </>
                  ) : (
                    <>
                      <Compass size={18} />
                      <span>Compare All 3 Routes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* 3. 3-MODE COMPARISON CARDS (SIDE BY SIDE ON DESKTOP) */}
          {/* ========================================================================= */}
          {comparisonResult && (
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
                    Multi-Modal Route Intelligence Comparison
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Quote Ref: <b style={{ color: '#0284C7' }}>{comparisonResult.quote_reference}</b> · Feasible Modes: <b>{comparisonResult.summary.feasible_count} of 3</b> · Rate Baseline: <i>Illustrative Estimates (Configurable Rates)</i>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCostBreakdownModal(true)}
                  style={{
                    background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px',
                    padding: '8px 16px', fontSize: '13px', fontWeight: '700', color: '#0284C7',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <FileText size={15} /> View Full Itemized Breakdown Table
                </button>
              </div>

              {/* 3 COMPARISON CARDS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px' }}>
                
                {/* ---------------- CARD A: ROAD TRANSPORT ---------------- */}
                {routes?.ROAD && (
                  <div style={{
                    background: '#FFFFFF', borderRadius: '16px',
                    border: routes.ROAD.is_feasible ? '2px solid #38BDF8' : '1px solid #E2E8F0',
                    boxShadow: routes.ROAD.is_feasible ? '0 8px 24px rgba(2, 132, 199, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
                    padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative',
                    opacity: routes.ROAD.is_feasible ? 1 : 0.75
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          background: '#E0F2FE', color: '#0284C7', padding: '10px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Truck size={24} />
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            TRANSPORT MODE A
                          </span>
                          <h3 style={{ margin: '1px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                            ROAD TRANSPORT
                          </h3>
                        </div>
                      </div>
                      <span style={{
                        background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC',
                        fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px'
                      }}>
                        FEASIBLE
                      </span>
                    </div>

                    {/* AI Recommendation Badges */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', minHeight: '28px' }}>
                      {routes.ROAD.ai_recommendation_badges?.map(renderBadge)}
                    </div>

                    {/* Price & Transit Time Block */}
                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Estimated Total Cost</span>
                        <span style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>
                          ₹{routes.ROAD.total_estimated_cost_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={14} color="#0284C7" /> Transit Duration:
                        </span>
                        <span style={{ fontWeight: '700', color: '#0F172A' }}>
                          {routes.ROAD.estimated_transit_hours} hrs (~{Math.round(routes.ROAD.estimated_transit_hours / 24 * 10) / 10} days)
                        </span>
                      </div>
                    </div>

                    {/* Key Attributes */}
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Assigned Vehicle:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A', textAlign: 'right', maxWidth: '65%' }}>
                          {routes.ROAD.vehicle_or_vessel_desc}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Road Distance:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A' }}>{routes.ROAD.total_distance_km} km</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Cold-Chain Reefer:</span>
                        <span style={{ fontWeight: '700', color: '#16A34A' }}>Active Continuous Cooling</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Shelf-Life Impact:</span>
                        <span style={{ fontWeight: '600', color: routes.ROAD.shelf_life_depletion_pct > 50 ? '#D97706' : '#16A34A' }}>
                          {routes.ROAD.shelf_life_depletion_pct}% Depleted
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Carbon Footprint:</span>
                        <span style={{ fontWeight: '600', color: '#475569' }}>{routes.ROAD.co2_emissions_kg} kg CO₂</span>
                      </div>
                    </div>

                    {/* AI Reasoning Pill */}
                    {routes.ROAD.ai_reasoning_summary && (
                      <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#0369A1', marginBottom: '18px' }}>
                        <b>AI Insight:</b> {routes.ROAD.ai_reasoning_summary}
                      </div>
                    )}

                    {/* Booking Action Button */}
                    <button
                      type="button"
                      onClick={() => initiateBooking('ROAD')}
                      style={{
                        background: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '10px',
                        padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)', transition: 'all 0.2s'
                      }}
                    >
                      <span>Select Road Transport</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}


                {/* ---------------- CARD B: MARINE TRANSPORT ---------------- */}
                {routes?.MARINE && (
                  <div style={{
                    background: '#FFFFFF', borderRadius: '16px',
                    border: routes.MARINE.is_feasible ? '2px solid #0284C7' : '1px solid #E2E8F0',
                    boxShadow: routes.MARINE.is_feasible ? '0 8px 24px rgba(2, 132, 199, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
                    padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative',
                    opacity: routes.MARINE.is_feasible ? 1 : 0.85
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          background: '#E0F2FE', color: '#0369A1', padding: '10px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Ship size={24} />
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            TRANSPORT MODE B
                          </span>
                          <h3 style={{ margin: '1px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                            MARINE TRANSPORT
                          </h3>
                        </div>
                      </div>
                      <span style={{
                        background: routes.MARINE.is_feasible ? '#DCFCE7' : '#FEE2E2',
                        color: routes.MARINE.is_feasible ? '#166534' : '#991B1B',
                        border: `1px solid ${routes.MARINE.is_feasible ? '#86EFAC' : '#FCA5A5'}`,
                        fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px'
                      }}>
                        {routes.MARINE.is_feasible ? 'FEASIBLE' : 'NOT SUITABLE'}
                      </span>
                    </div>

                    {/* AI Recommendation Badges */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', minHeight: '28px' }}>
                      {routes.MARINE.is_feasible ? (
                        routes.MARINE.ai_recommendation_badges?.map(renderBadge)
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                          Route constraints prevent nautical scheduling
                        </span>
                      )}
                    </div>

                    {/* Price & Transit Time Block */}
                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9', marginBottom: '18px' }}>
                      {routes.MARINE.is_feasible ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Estimated Total Cost</span>
                            <span style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>
                              ₹{routes.MARINE.total_estimated_cost_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={14} color="#0369A1" /> Total Door-to-Door:
                            </span>
                            <span style={{ fontWeight: '700', color: '#0F172A' }}>
                              {routes.MARINE.estimated_transit_hours} hrs (~{Math.round(routes.MARINE.estimated_transit_hours / 24 * 10) / 10} days)
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '8px 0', color: '#991B1B', fontSize: '12px', lineHeight: '1.4' }}>
                          <b>Unsuitability Notice:</b> {routes.MARINE.infeasibility_reason}
                        </div>
                      )}
                    </div>

                    {/* Key Attributes */}
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Origin / Dest Ports:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A', textAlign: 'right', maxWidth: '65%', fontSize: '12px' }}>
                          {routes.MARINE.origin_facility_name} → {routes.MARINE.destination_facility_name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Container Type:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A', textAlign: 'right', maxWidth: '65%' }}>
                          {routes.MARINE.vehicle_or_vessel_desc}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Total Distance:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A' }}>{routes.MARINE.total_distance_km} km</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Port Dwell & Customs:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A' }}>~36 hrs Included</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Carbon Footprint:</span>
                        <span style={{ fontWeight: '600', color: '#16A34A' }}>{routes.MARINE.co2_emissions_kg} kg CO₂ (Lowest)</span>
                      </div>
                    </div>

                    {/* AI Reasoning Pill */}
                    {routes.MARINE.ai_reasoning_summary && (
                      <div style={{
                        background: routes.MARINE.is_feasible ? '#F0FDF4' : '#FEF2F2',
                        border: `1px solid ${routes.MARINE.is_feasible ? '#BBF7D0' : '#FECACA'}`,
                        padding: '10px 12px', borderRadius: '8px', fontSize: '12px',
                        color: routes.MARINE.is_feasible ? '#166534' : '#991B1B', marginBottom: '18px'
                      }}>
                        <b>AI Evaluation:</b> {routes.MARINE.ai_reasoning_summary}
                      </div>
                    )}

                    {/* Booking Action Button */}
                    <button
                      type="button"
                      disabled={!routes.MARINE.is_feasible}
                      onClick={() => initiateBooking('MARINE')}
                      style={{
                        background: routes.MARINE.is_feasible ? '#0369A1' : '#CBD5E1',
                        color: routes.MARINE.is_feasible ? '#FFFFFF' : '#64748B',
                        border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700',
                        cursor: routes.MARINE.is_feasible ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: routes.MARINE.is_feasible ? '0 3px 10px rgba(3, 105, 161, 0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>{routes.MARINE.is_feasible ? 'Select Marine Transport' : 'Marine Route Infeasible'}</span>
                      {routes.MARINE.is_feasible && <ArrowRight size={16} />}
                    </button>
                  </div>
                )}


                {/* ---------------- CARD C: AIR TRANSPORT ---------------- */}
                {routes?.AIR && (
                  <div style={{
                    background: '#FFFFFF', borderRadius: '16px',
                    border: routes.AIR.is_feasible ? '2px solid #818CF8' : '1px solid #E2E8F0',
                    boxShadow: routes.AIR.is_feasible ? '0 8px 24px rgba(99, 102, 241, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
                    padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative',
                    opacity: routes.AIR.is_feasible ? 1 : 0.85
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          background: '#EEF2FF', color: '#4F46E5', padding: '10px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Plane size={24} />
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            TRANSPORT MODE C
                          </span>
                          <h3 style={{ margin: '1px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                            AIR TRANSPORT
                          </h3>
                        </div>
                      </div>
                      <span style={{
                        background: routes.AIR.is_feasible ? '#DCFCE7' : '#FEE2E2',
                        color: routes.AIR.is_feasible ? '#166534' : '#991B1B',
                        border: `1px solid ${routes.AIR.is_feasible ? '#86EFAC' : '#FCA5A5'}`,
                        fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px'
                      }}>
                        {routes.AIR.is_feasible ? 'FEASIBLE' : 'NOT SUITABLE'}
                      </span>
                    </div>

                    {/* AI Recommendation Badges */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', minHeight: '28px' }}>
                      {routes.AIR.is_feasible ? (
                        routes.AIR.ai_recommendation_badges?.map(renderBadge)
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                          Distance or weight constraints apply
                        </span>
                      )}
                    </div>

                    {/* Price & Transit Time Block */}
                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9', marginBottom: '18px' }}>
                      {routes.AIR.is_feasible ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Estimated Total Cost</span>
                            <span style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>
                              ₹{routes.AIR.total_estimated_cost_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Zap size={14} color="#D97706" /> Total Door-to-Door:
                            </span>
                            <span style={{ fontWeight: '700', color: '#16A34A' }}>
                              {routes.AIR.estimated_transit_hours} hrs (~{Math.round(routes.AIR.estimated_transit_hours / 24 * 10) / 10} days)
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '8px 0', color: '#991B1B', fontSize: '12px', lineHeight: '1.4' }}>
                          <b>Unsuitability Notice:</b> {routes.AIR.infeasibility_reason}
                        </div>
                      )}
                    </div>

                    {/* Key Attributes */}
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Airport Hubs:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A', textAlign: 'right', maxWidth: '65%', fontSize: '12px' }}>
                          {routes.AIR.origin_facility_name} → {routes.AIR.destination_facility_name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Chargeable Weight:</span>
                        <span style={{ fontWeight: '700', color: '#4F46E5' }}>
                          {routes.AIR.chargeable_weight_kg} kg <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '400' }}>(Vol: {routes.AIR.volumetric_weight_kg} kg)</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Thermal Protection:</span>
                        <span style={{ fontWeight: '600', color: '#0F172A', textAlign: 'right', maxWidth: '65%' }}>
                          {routes.AIR.vehicle_or_vessel_desc}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748B' }}>Shelf-Life Depletion:</span>
                        <span style={{ fontWeight: '700', color: '#16A34A' }}>
                          Only {routes.AIR.shelf_life_depletion_pct}% (Max Freshness)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Carbon Footprint:</span>
                        <span style={{ fontWeight: '600', color: '#DC2626' }}>{routes.AIR.co2_emissions_kg} kg CO₂</span>
                      </div>
                    </div>

                    {/* AI Reasoning Pill */}
                    {routes.AIR.ai_reasoning_summary && (
                      <div style={{
                        background: routes.AIR.is_feasible ? '#F5F3FF' : '#FEF2F2',
                        border: `1px solid ${routes.AIR.is_feasible ? '#DDD6FE' : '#FECACA'}`,
                        padding: '10px 12px', borderRadius: '8px', fontSize: '12px',
                        color: routes.AIR.is_feasible ? '#5B21B6' : '#991B1B', marginBottom: '18px'
                      }}>
                        <b>AI Evaluation:</b> {routes.AIR.ai_reasoning_summary}
                      </div>
                    )}

                    {/* Booking Action Button */}
                    <button
                      type="button"
                      disabled={!routes.AIR.is_feasible}
                      onClick={() => initiateBooking('AIR')}
                      style={{
                        background: routes.AIR.is_feasible ? '#4F46E5' : '#CBD5E1',
                        color: routes.AIR.is_feasible ? '#FFFFFF' : '#64748B',
                        border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700',
                        cursor: routes.AIR.is_feasible ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: routes.AIR.is_feasible ? '0 3px 10px rgba(79, 70, 229, 0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>{routes.AIR.is_feasible ? 'Select Priority Air Cargo' : 'Air Transport Infeasible'}</span>
                      {routes.AIR.is_feasible && <ArrowRight size={16} />}
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-TAB 2: UNIFIED MULTIMODAL SHIPMENT TRACKING & SEGMENTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'tracking' && (
        <div>
          {/* Active Bookings Selector */}
          <div style={{
            background: '#FFFFFF', padding: '18px 24px', borderRadius: '14px', border: '1px solid #E2E8F0',
            marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <NavIcon size={18} color="#0284C7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                  Active Multimodal Consignments
                </h3>
              </div>
              <button
                type="button"
                onClick={() => loadShipmentTracking(selectedTrackingShipmentId)}
                style={{
                  background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px',
                  padding: '5px 12px', fontSize: '12px', fontWeight: '600', color: '#475569',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                }}
              >
                <RefreshCw size={12} className={trackingLoading ? 'animate-spin' : ''} /> Refresh Telematics
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
              {bookingsList.map((b) => (
                <div
                  key={b.booking_id}
                  onClick={() => setSelectedTrackingShipmentId(b.shipment_id)}
                  style={{
                    background: selectedTrackingShipmentId === b.shipment_id ? '#F0F9FF' : '#FAFAFA',
                    border: `1.5px solid ${selectedTrackingShipmentId === b.shipment_id ? '#0284C7' : '#E2E8F0'}`,
                    borderRadius: '10px', padding: '12px 16px', minWidth: '240px', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284C7' }}>{b.shipment_id}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                      background: b.selected_mode === 'AIR' ? '#EEF2FF' : (b.selected_mode === 'MARINE' ? '#E0F2FE' : '#F0FDF4'),
                      color: b.selected_mode === 'AIR' ? '#4338CA' : (b.selected_mode === 'MARINE' ? '#0369A1' : '#166534')
                    }}>
                      {b.selected_mode}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.produce_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    {b.pickup_location?.split(' ')[0]} → {b.destination_location?.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking Detail Panel */}
          {trackingData ? (
            <div style={{
              background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
              padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
            }}>
              {/* Header Info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0F172A' }}>
                      Shipment: {trackingData.shipment_id}
                    </h2>
                    <span style={{
                      background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC',
                      padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700'
                    }}>
                      {trackingData.booking?.booking_status || 'IN_TRANSIT'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                    Mode: <b>{trackingData.booking?.selected_mode}</b> · Produce: <b>{trackingData.booking?.produce_name}</b> · Weight: <b>{trackingData.booking?.cargo_weight_kg} kg</b>
                  </p>
                </div>

                {/* Interactive Advance Segment Simulator */}
                <button
                  type="button"
                  onClick={handleAdvanceSegment}
                  disabled={advancingSegment}
                  style={{
                    background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px',
                    padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: advancingSegment ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  <Play size={14} color="#38BDF8" />
                  <span>{advancingSegment ? 'Advancing Milestone...' : 'Advance Segment Simulation'}</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>
                  <span>Multimodal Journey Progression</span>
                  <span style={{ color: '#0284C7' }}>{trackingData.progress_percentage}% Completed</span>
                </div>
                <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${trackingData.progress_percentage}%`, height: '100%',
                    background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* Route Segments Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                  Custody Transfer Milestones & Segments
                </h4>
                {trackingData.all_segments?.map((seg, idx) => (
                  <div
                    key={seg.segment_id}
                    style={{
                      background: seg.segment_status === 'ACTIVE' ? '#F0F9FF' : (seg.segment_status === 'COMPLETED' ? '#F8FAFC' : '#FFFFFF'),
                      border: `1.5px solid ${seg.segment_status === 'ACTIVE' ? '#0284C7' : (seg.segment_status === 'COMPLETED' ? '#CBD5E1' : '#E2E8F0')}`,
                      borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: seg.segment_status === 'COMPLETED' ? '#16A34A' : (seg.segment_status === 'ACTIVE' ? '#0284C7' : '#94A3B8'),
                        color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '13px'
                      }}>
                        {seg.segment_status === 'COMPLETED' ? <Check size={16} /> : (idx + 1)}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>
                          {seg.segment_title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {seg.origin_point} → {seg.destination_point} · Operator: <b>{seg.carrier_operator}</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Custody Holder:</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{seg.custody_holder}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Telemetry Temp:</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0284C7' }}>
                          {seg.current_temp_c ? `${seg.current_temp_c}°C` : `${seg.temp_setpoint_c}°C (Set)`}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px',
                        background: seg.segment_status === 'COMPLETED' ? '#DCFCE7' : (seg.segment_status === 'ACTIVE' ? '#E0F2FE' : '#F1F5F9'),
                        color: seg.segment_status === 'COMPLETED' ? '#166534' : (seg.segment_status === 'ACTIVE' ? '#0369A1' : '#64748B'),
                        border: `1px solid ${seg.segment_status === 'COMPLETED' ? '#86EFAC' : (seg.segment_status === 'ACTIVE' ? '#7DD3FC' : '#CBD5E1')}`
                      }}>
                        {seg.segment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', padding: '48px', borderRadius: '16px', textAlign: 'center', color: '#64748B' }}>
              <Compass size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>No Consignment Selected</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Select an active booking above to inspect multimodal segments and live sensor preservation.</div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-TAB 3: SAVED QUOTES & AUDIT HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
              Saved Quotations & Multi-Route Comparisons Log
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Total: {quotesList.length} quotes</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Quote Reference</th>
                  <th style={{ padding: '12px 14px' }}>Origin → Destination</th>
                  <th style={{ padding: '12px 14px' }}>Produce & Weight</th>
                  <th style={{ padding: '12px 14px' }}>Priority</th>
                  <th style={{ padding: '12px 14px' }}>Road Est.</th>
                  <th style={{ padding: '12px 14px' }}>Marine Est.</th>
                  <th style={{ padding: '12px 14px' }}>Air Est.</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {quotesList.map((q) => {
                  const roadOpt = q.route_options?.find(r => r.mode === 'ROAD');
                  const marineOpt = q.route_options?.find(r => r.mode === 'MARINE');
                  const airOpt = q.route_options?.find(r => r.mode === 'AIR');
                  return (
                    <tr key={q.quote_id} style={{ borderBottom: '1px solid #F1F5F9', color: '#1E293B' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0284C7' }}>
                        {q.quote_reference || q.quote_id}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {q.pickup_location?.split(' ')[0]} → {q.destination_location?.split(' ')[0]}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {q.cargo_type} ({q.cargo_weight_kg} kg)
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 6px', background: '#F1F5F9', borderRadius: '4px' }}>
                          {q.priority_preference}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                        {roadOpt ? `₹${Number(roadOpt.total_estimated_cost_inr).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                        {marineOpt?.is_feasible ? `₹${Number(marineOpt.total_estimated_cost_inr).toLocaleString()}` : <span style={{ color: '#94A3B8' }}>Infeasible</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                        {airOpt?.is_feasible ? `₹${Number(airOpt.total_estimated_cost_inr).toLocaleString()}` : <span style={{ color: '#94A3B8' }}>Infeasible</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748B' }}>
                        {new Date(q.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-TAB 4: RATE CARDS & ADMIN CONFIGURATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'rate-cards' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                Configurable Transport Rate Cards (PostgreSQL Database)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Admin parameters used to compute transparent illustrative freight quotations across Road, Sea, and Air corridors.
              </p>
            </div>
            <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', color: '#475569' }}>
              Governance Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
            {rateCards.map((rc) => (
              <div key={rc.rate_id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284C7' }}>{rc.mode}</span>
                  <span style={{ fontSize: '10px', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{rc.service_code}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>{rc.service_name}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>{rc.description}</div>

                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Base Rate:</span>
                    <b>₹{rc.base_freight_per_km_or_kg} / {rc.mode === 'AIR' ? 'kg' : (rc.mode === 'MARINE' ? 'nmi' : 'km')}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cold Chain Surcharge:</span>
                    <b>+{rc.cold_chain_surcharge_pct}%</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fuel Surcharge:</span>
                    <b>+{rc.fuel_surcharge_pct}%</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Toll / Port Charge:</span>
                    <b>₹{rc.toll_rate_per_km || rc.handling_doc_charge}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CO₂ Emission Factor:</span>
                    <b>{rc.emissions_co2_kg_per_tonne_km} kg/ton-km</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: FULL ITEMIZED COST BREAKDOWN TABLE */}
      {/* ========================================================================= */}
      {showCostBreakdownModal && comparisonResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '850px',
            maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                  Full Itemized Cost Comparison Table
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Transparent breakdown for Quote Ref: <b>{comparisonResult.quote_reference}</b>
                </span>
              </div>
              <button type="button" onClick={() => setShowCostBreakdownModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 14px', color: '#475569' }}>Cost Component Line Item</th>
                  <th style={{ padding: '12px 14px', color: '#0284C7', textAlign: 'right' }}>Road Transport</th>
                  <th style={{ padding: '12px 14px', color: '#0369A1', textAlign: 'right' }}>Marine Transport</th>
                  <th style={{ padding: '12px 14px', color: '#4F46E5', textAlign: 'right' }}>Air Transport</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '1. Base Freight / Transportation', key: 'base_freight' },
                  { label: '2. First-Mile Pickup / Drayage', key: 'first_mile' },
                  { label: '3. Last-Mile Delivery Haulage', key: 'last_mile' },
                  { label: '4. Loading & Unloading / Palletizing', key: 'loading_unloading' },
                  { label: '5. Handling & Documentation (E-Way/B-L/AWB)', key: 'handling_documentation' },
                  { label: '6. Tolls / Port THC / Airport Terminal Charges', key: 'tolls_port_airport_charges' },
                  { label: '7. Fuel / Bunker Adjustment Surcharge', key: 'fuel_surcharge' },
                  { label: '8. Cold-Chain Reefer / Active Cooling Surcharge', key: 'cold_chain_surcharge' },
                  { label: '9. Cargo Insurance Coverage', key: 'insurance' },
                  { label: '10. Taxes (GST 18%)', key: 'taxes_gst' }
                ].map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', color: '#334155', fontWeight: '500' }}>{item.label}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600' }}>
                      ₹{routes?.ROAD?.cost_breakdown?.[item.key]?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', color: routes?.MARINE?.is_feasible ? '#0F172A' : '#94A3B8' }}>
                      {routes?.MARINE?.is_feasible
                        ? `₹${routes?.MARINE?.cost_breakdown?.[item.key]?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                        : 'Infeasible'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', color: routes?.AIR?.is_feasible ? '#0F172A' : '#94A3B8' }}>
                      {routes?.AIR?.is_feasible
                        ? `₹${routes?.AIR?.cost_breakdown?.[item.key]?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                        : 'Infeasible'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: '800', fontSize: '15px' }}>
                  <td style={{ padding: '14px', color: '#0F172A' }}>TOTAL ESTIMATED COST</td>
                  <td style={{ padding: '14px', textAlign: 'right', color: '#0284C7' }}>
                    ₹{routes?.ROAD?.total_estimated_cost_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', color: '#0369A1' }}>
                    {routes?.MARINE?.is_feasible
                      ? `₹${routes?.MARINE?.total_estimated_cost_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', color: '#4F46E5' }}>
                    {routes?.AIR?.is_feasible
                      ? `₹${routes?.AIR?.total_estimated_cost_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCostBreakdownModal(false)}
                style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer' }}
              >
                Close Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: SHIPMENT BOOKING CONFIRMATION */}
      {/* ========================================================================= */}
      {showBookingModal && routeToBook && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '600px',
            padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#0284C7" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                  Confirm {routeToBook.mode} Route Booking
                </h3>
              </div>
              <button type="button" onClick={() => setShowBookingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking}>
              <div style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Selected Mode:</span>
                  <b style={{ color: '#0284C7' }}>{routeToBook.mode} ({routeToBook.option.vehicle_or_vessel_desc})</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Estimated Transit:</span>
                  <b>{routeToBook.option.estimated_transit_hours} hrs</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Total Amount:</span>
                  <b style={{ color: '#0F172A', fontSize: '15px' }}>
                    ₹{routeToBook.option.total_estimated_cost_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </b>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Sender Contact Name *
                  </label>
                  <input
                    type="text"
                    value={bookingContact.sender_name}
                    onChange={(e) => setBookingContact({ ...bookingContact, sender_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Sender Phone *
                  </label>
                  <input
                    type="text"
                    value={bookingContact.sender_phone}
                    onChange={(e) => setBookingContact({ ...bookingContact, sender_phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Receiver Contact Name *
                  </label>
                  <input
                    type="text"
                    value={bookingContact.receiver_name}
                    onChange={(e) => setBookingContact({ ...bookingContact, receiver_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Receiver Phone *
                  </label>
                  <input
                    type="text"
                    value={bookingContact.receiver_phone}
                    onChange={(e) => setBookingContact({ ...bookingContact, receiver_phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Special Cold-Chain Handling Instructions
                </label>
                <textarea
                  rows="2"
                  value={bookingContact.special_instructions}
                  onChange={(e) => setBookingContact({ ...bookingContact, special_instructions: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 18px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  style={{
                    background: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '8px',
                    padding: '10px 22px', fontWeight: '700', cursor: bookingLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {bookingLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                  <span>{bookingLoading ? 'Confirming...' : 'Confirm & Generate Shipment ID'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
