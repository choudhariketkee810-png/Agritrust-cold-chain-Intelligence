import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sprout, 
  Plus, 
  MapPin, 
  Layers, 
  Warehouse, 
  Truck, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Thermometer, 
  Droplets, 
  QrCode, 
  RefreshCw, 
  Calendar, 
  Edit3, 
  ShieldCheck, 
  FileText, 
  Eye, 
  TrendingUp, 
  Search,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  ClipboardCheck,
  Plane,
  Ship,
  FileCheck,
  AlertCircle,
  Info,
  Lock,
  Compass,
  CheckCircle
} from 'lucide-react';
import { 
  fetchFarmerFarms, 
  createFarmerFarm, 
  updateFarmerFarm,
  fetchFarmerProduce, 
  createFarmerProduce, 
  fetchNearbyColdStorages, 
  fetchFarmerStorageBookings, 
  createFarmerStorageBooking,
  fetchFarmerShipments, 
  createFarmerShipment, 
  fetchFarmerPayments,
  createDispute,
  getQrCodeUrl,
  createConsignmentRequest,
  fetchConsignments,
  fetchConsignmentDetail,
  submitConsignmentCorrections,
  bookVerifiedConsignment
} from '../api';
import SellBeforeSpoilageFarmer from './SellBeforeSpoilageFarmer';
import NewShipmentBooking from './NewShipmentBooking';

export default function FarmerDashboard({ activeTab: externalTab, onNavigateTab }) {
  const [internalTab, setInternalTab] = useState('dashboard');

  // Sync external tab from role sidebar
  useEffect(() => {
    if (!externalTab || externalTab === 'dashboard') {
      setInternalTab('dashboard');
    } else if (externalTab === 'new-booking' || externalTab === 'create-shipment') {
      setInternalTab('new-booking');
    } else if (['produce', 'quality'].includes(externalTab)) {
      setInternalTab('produce');
    } else if (['shipments', 'tracking'].includes(externalTab)) {
      setInternalTab('shipments');
    } else if (externalTab === 'cold-storage') {
      setInternalTab('cold-storage');
    } else if (externalTab === 'spoilage') {
      setInternalTab('sell-before-spoilage');
    } else if (externalTab === 'payments') {
      setInternalTab('payments');
    } else if (['disputes', 'trust-score'].includes(externalTab)) {
      setInternalTab('disputes');
    } else if (externalTab === 'qr-verification') {
      if (shipments.length > 0) setQrModalShipmentId(shipments[0].shipment_id);
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
  const [farms, setFarms] = useState([]);
  const [produceList, setProduceList] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [consignments, setConsignments] = useState([]);
  const [coldStorages, setColdStorages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState(null);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [showAddProduceModal, setShowAddProduceModal] = useState(false);
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [showCreateConsignmentModal, setShowCreateConsignmentModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedCorrectionConsignment, setSelectedCorrectionConsignment] = useState(null);
  const [showBookingModalAfterApproval, setShowBookingModalAfterApproval] = useState(false);
  const [selectedBookingConsignment, setSelectedBookingConsignment] = useState(null);
  const [showConsignmentDetailModal, setShowConsignmentDetailModal] = useState(false);
  const [selectedConsignmentDetail, setSelectedConsignmentDetail] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedStorageFacility, setSelectedStorageFacility] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeShipmentId, setDisputeShipmentId] = useState('');
  const [qrModalShipmentId, setQrModalShipmentId] = useState(null);

  // Form states
  const [farmForm, setFarmForm] = useState({
    farm_name: '',
    location: '',
    district: 'Nashik',
    state: 'Maharashtra',
    acreage: 5.0,
    primary_crops: 'Mango, Grapes, Pomegranate',
    soil_type: 'Black Loam',
    water_source: 'Drip Irrigation',
    organic_certified: false
  });

  const [produceForm, setProduceForm] = useState({
    farm_id: '',
    crop_name: 'Mango',
    variety: 'Alphonso (Hapus)',
    harvest_date: new Date().toISOString().split('T')[0],
    expected_dispatch_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    total_quantity_kg: 1000.0,
    unit_price_per_kg: 180.0,
    target_temp_min: 10.0,
    target_temp_max: 13.0,
    quality_grade: 'Grade A (Export Quality)',
    brix_level: 16.5,
    moisture_percent: 75.0,
    inspection_notes: 'Inspected on harvest gate. Pre-conditioned at 12°C. Pest-free certified.',
    photo_urls: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500'
  });

  const [consignmentForm, setConsignmentForm] = useState({
    pickup_location: 'Patil Orchards Gate #2, Dindori Road, Nashik',
    pickup_pincode: '422001',
    destination_location: 'FreshMart Central Distribution Hub, Vashi, Navi Mumbai',
    destination_pincode: '400707',
    product_category: 'Fresh Fruits & Vegetables',
    product_name: 'Alphonso Mango',
    variety: 'Devgad GI Certified',
    material_description: 'Export quality mature Alphonso mangoes in 5-ply ventilated CFB cartons.',
    declared_quantity_kg: 2500.0,
    declared_package_count: 250,
    packaging_type: '5-Ply Ventilated Corrugated Cartons',
    packaging_requirements: 'Food grade CFB boxes with foam dividers and ethylene pads',
    storage_requirements: 'Pre-cooled to 11.5°C before container loading',
    requires_temperature_control: true,
    target_temp_min: 10.0,
    target_temp_max: 13.0,
    preferred_transport_mode: 'ROAD',
    expected_pickup_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    urgency_level: 'STANDARD',
    declared_cargo_value_inr: 350000.0,
    customer_photos: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600',
    customer_notes: 'Harvest completed early morning. Requesting mandatory physical verification.'
  });

  const [correctionForm, setCorrectionForm] = useState({
    description: 'Applied tamper-evident holographic bands on all cartons and re-conditioned pulp temperature to required setpoint.',
    photos: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600',
    request_reinspection: true
  });

  const [bookingFormAfterApproval, setBookingFormAfterApproval] = useState({
    selected_mode: 'ROAD',
    quote_id: null,
    special_handling_instructions: 'Keep temperature strictly between 10.0°C and 13.0°C. Verified at farm-gate.'
  });

  const [shipmentForm, setShipmentForm] = useState({
    product_name: 'Alphonso Mango',
    variety: 'Grade A Export',
    total_quantity: 1000.0,
    grade_a_quantity: 850.0,
    grade_b_quantity: 150.0,
    damaged_quantity: 0.0,
    quality_notes: 'Optimal harvest maturity. Packed in ventilated reefer crates.',
    origin: 'Sahyadri Orchards, Nashik Gate #2',
    destination: 'APMC Market Hub / FreshMart Vashi',
    target_temp_min: 10.0,
    target_temp_max: 13.0,
    cold_storage_id: ''
  });

  const [bookingForm, setBookingForm] = useState({
    produce_name: 'Alphonso Mango',
    quantity_mt: 5.0,
    requested_intake_date: new Date().toISOString().split('T')[0],
    duration_days: 14,
    notes: 'Pre-cooling and controlled atmosphere storage before export dispatch.'
  });

  const [disputeForm, setDisputeForm] = useState({
    dispute_category: 'TEMPERATURE_EXCURSION',
    against_role: 'LOGISTICS',
    claim_amount: 15000.0,
    description: 'Cargo temperature exceeded 14.5°C during transit causing premature softening.',
    evidence_urls: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500'
  });

  // Load all Farmer data
  const loadFarmerData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [farmsRes, prodRes, shipRes, storRes, bookRes, payRes, consRes] = await Promise.allSettled([
        fetchFarmerFarms(),
        fetchFarmerProduce(),
        fetchFarmerShipments(),
        fetchNearbyColdStorages(),
        fetchFarmerStorageBookings(),
        fetchFarmerPayments(),
        fetchConsignments()
      ]);

      if (farmsRes.status === 'fulfilled') setFarms(farmsRes.value?.data || []);
      if (prodRes.status === 'fulfilled') setProduceList(prodRes.value?.data || []);
      if (shipRes.status === 'fulfilled') setShipments(shipRes.value?.data || []);
      if (storRes.status === 'fulfilled') setColdStorages(storRes.value?.data || []);
      if (bookRes.status === 'fulfilled') setBookings(bookRes.value?.data || []);
      if (payRes.status === 'fulfilled') setPayments(payRes.value);
      if (consRes.status === 'fulfilled') setConsignments(consRes.value?.data || []);

      // Default farm selection in produce form
      if (farmsRes.status === 'fulfilled' && farmsRes.value?.data?.length > 0) {
        setProduceForm(prev => ({ ...prev, farm_id: farmsRes.value.data[0].farm_id }));
      }
    } catch (err) {
      console.error('Farmer load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFarmerData();
  }, [loadFarmerData]);

  // Farm Creation / Edit
  const handleSaveFarm = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        farm_name: farmForm.farm_name,
        location: farmForm.location,
        district: farmForm.district,
        state: farmForm.state,
        acreage: parseFloat(farmForm.acreage),
        primary_crops: farmForm.primary_crops.split(',').map(s => s.trim()),
        soil_type: farmForm.soil_type,
        water_source: farmForm.water_source,
        organic_certified: farmForm.organic_certified
      };

      if (editingFarm) {
        await updateFarmerFarm(editingFarm.farm_id, payload);
        setFeedback({ type: 'success', message: `Farm '${payload.farm_name}' updated successfully!` });
      } else {
        await createFarmerFarm(payload);
        setFeedback({ type: 'success', message: `New farm '${payload.farm_name}' registered successfully!` });
      }
      setShowAddFarmModal(false);
      setEditingFarm(null);
      loadFarmerData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Produce Creation
  const handleCreateProduce = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const photos = produceForm.photo_urls ? produceForm.photo_urls.split('\n').filter(Boolean) : [];
      const payload = {
        farm_id: produceForm.farm_id || undefined,
        crop_name: produceForm.crop_name,
        variety: produceForm.variety,
        harvest_date: produceForm.harvest_date,
        expected_dispatch_date: produceForm.expected_dispatch_date || undefined,
        total_quantity_kg: parseFloat(produceForm.total_quantity_kg),
        unit_price_per_kg: parseFloat(produceForm.unit_price_per_kg),
        target_temp_min: parseFloat(produceForm.target_temp_min),
        target_temp_max: parseFloat(produceForm.target_temp_max),
        quality_grade: produceForm.quality_grade,
        brix_level: parseFloat(produceForm.brix_level),
        moisture_percent: parseFloat(produceForm.moisture_percent),
        inspection_notes: produceForm.inspection_notes,
        photo_urls: photos
      };
      await createFarmerProduce(payload);
      setFeedback({ type: 'success', message: `Produce listing for ${payload.crop_name} (${payload.variety}) created!` });
      setShowAddProduceModal(false);
      loadFarmerData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Consignment Creation (Mandatory Physical Verification Pipeline)
  const handleCreateConsignment = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const photos = consignmentForm.customer_photos ? consignmentForm.customer_photos.split('\n').map(s => s.trim()).filter(Boolean) : [];
      const payload = {
        pickup_location: consignmentForm.pickup_location,
        pickup_pincode: consignmentForm.pickup_pincode,
        destination_location: consignmentForm.destination_location,
        destination_pincode: consignmentForm.destination_pincode,
        product_category: consignmentForm.product_category,
        product_name: consignmentForm.product_name,
        variety: consignmentForm.variety,
        material_description: consignmentForm.material_description,
        declared_quantity_kg: parseFloat(consignmentForm.declared_quantity_kg),
        declared_package_count: parseInt(consignmentForm.declared_package_count || 1, 10),
        packaging_type: consignmentForm.packaging_type,
        packaging_requirements: consignmentForm.packaging_requirements,
        storage_requirements: consignmentForm.storage_requirements,
        requires_temperature_control: Boolean(consignmentForm.requires_temperature_control),
        target_temp_min: parseFloat(consignmentForm.target_temp_min),
        target_temp_max: parseFloat(consignmentForm.target_temp_max),
        preferred_transport_mode: consignmentForm.preferred_transport_mode,
        expected_pickup_date: consignmentForm.expected_pickup_date,
        urgency_level: consignmentForm.urgency_level,
        declared_cargo_value_inr: parseFloat(consignmentForm.declared_cargo_value_inr || 0),
        customer_photos: photos,
        customer_notes: consignmentForm.customer_notes
      };

      const res = await createConsignmentRequest(payload);
      const reqId = res.data?.consignment_id || res.consignment_id || 'REQ-NEW';
      setFeedback({ 
        type: 'success', 
        message: `Consignment Request #${reqId} submitted! Status: PENDING_VERIFICATION. Assigned to on-site physical inspection queue.` 
      });
      setShowCreateConsignmentModal(false);
      setShowCreateShipmentModal(false);
      loadFarmerData(true);
      setActiveTab('consignments');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Submit Rectifications & Request Reinspection
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!selectedCorrectionConsignment) return;
    setFeedback(null);
    try {
      const photos = correctionForm.photos ? correctionForm.photos.split('\n').map(s => s.trim()).filter(Boolean) : [];
      const payload = {
        correction_description: correctionForm.description,
        rectification_photos: photos,
        request_reinspection: Boolean(correctionForm.request_reinspection)
      };
      await submitConsignmentCorrections(selectedCorrectionConsignment.consignment_id, payload);
      setFeedback({
        type: 'success',
        message: `Corrections submitted for #${selectedCorrectionConsignment.consignment_id}. Consignment queued for reinspection!`
      });
      setShowCorrectionModal(false);
      setSelectedCorrectionConsignment(null);
      loadFarmerData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Book Verified Consignment after Approval
  const handleBookVerified = async (e) => {
    e.preventDefault();
    if (!selectedBookingConsignment) return;
    setFeedback(null);
    try {
      const payload = {
        selected_mode: bookingFormAfterApproval.selected_mode,
        quote_id: bookingFormAfterApproval.quote_id || undefined,
        special_handling_instructions: bookingFormAfterApproval.special_handling_instructions
      };
      await bookVerifiedConsignment(selectedBookingConsignment.consignment_id, payload);
      setFeedback({
        type: 'success',
        message: `Transportation booking confirmed for Verified Consignment #${selectedBookingConsignment.consignment_id}! Forwarded to Logistics for Operational Acceptance.`
      });
      setShowBookingModalAfterApproval(false);
      setSelectedBookingConsignment(null);
      loadFarmerData(true);
      setActiveTab('consignments');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Legacy Direct Shipment Creation (Auto-routed through physical verification workflow)
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    // Redirect through mandatory consignment creation
    setConsignmentForm(prev => ({
      ...prev,
      product_name: shipmentForm.product_name,
      variety: shipmentForm.variety,
      declared_quantity_kg: parseFloat(shipmentForm.total_quantity),
      pickup_location: shipmentForm.origin,
      destination_location: shipmentForm.destination,
      target_temp_min: parseFloat(shipmentForm.target_temp_min),
      target_temp_max: parseFloat(shipmentForm.target_temp_max),
      material_description: shipmentForm.quality_notes || 'Farm harvest produce ready for physical inspection.'
    }));
    setShowCreateShipmentModal(false);
    setShowCreateConsignmentModal(true);
  };

  // Storage Booking
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!selectedStorageFacility) return;
    setFeedback(null);
    try {
      const payload = {
        facility_id: selectedStorageFacility.facility_id,
        produce_name: bookingForm.produce_name,
        quantity_mt: parseFloat(bookingForm.quantity_mt),
        requested_intake_date: bookingForm.requested_intake_date,
        duration_days: parseInt(bookingForm.duration_days, 10),
        notes: bookingForm.notes
      };
      const res = await createFarmerStorageBooking(payload);
      setFeedback({ type: 'success', message: res.message || 'Cold storage reservation submitted!' });
      setShowBookingModal(false);
      loadFarmerData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Dispute submission
  const handleCreateDispute = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const evidence = disputeForm.evidence_urls ? [disputeForm.evidence_urls] : [];
      const payload = {
        shipment_id: disputeShipmentId,
        dispute_category: disputeForm.dispute_category,
        against_role: disputeForm.against_role,
        claim_amount: parseFloat(disputeForm.claim_amount),
        description: disputeForm.description,
        evidence_urls: evidence
      };
      await createDispute(payload);
      setFeedback({ type: 'success', message: `Concern/Dispute logged on #${disputeShipmentId}. Sent for AI Analysis and Admin Review.` });
      setShowDisputeModal(false);
      loadFarmerData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const totalAcreage = farms.reduce((acc, f) => acc + (parseFloat(f.acreage) || 0), 0);
  const totalProduceKg = produceList.reduce((acc, p) => acc + (parseFloat(p.available_quantity_kg) || 0), 0);
  const activeShipmentsCount = shipments.filter(s => s.shipment_status === 'IN_TRANSIT' || s.shipment_status === 'ACCEPTED' || s.shipment_status === 'CREATED').length;

  return (
    <div>
      {/* 1. TOP HEADER & QUICK STATS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sprout size={24} color="var(--accent-emerald)" />
            Farmer Command Center
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Farm registration, harvest produce quality grading, cold storage bookings & verified dispatch.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setEditingFarm(null);
              setFarmForm({
                farm_name: '',
                location: '',
                district: 'Nashik',
                state: 'Maharashtra',
                acreage: 5.0,
                primary_crops: 'Mango, Grapes',
                soil_type: 'Black Loam',
                water_source: 'Drip Irrigation',
                organic_certified: false
              });
              setShowAddFarmModal(true);
            }}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} />
            <span>Add Farm</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddProduceModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} />
            <span>List Harvest Produce</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateShipmentModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Truck size={14} />
            <span>Create Shipment</span>
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
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Registered Farms</span>
            <Sprout size={18} color="var(--accent-emerald)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {farms.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Total Cultivated: <b style={{ color: 'var(--accent-emerald-light)' }}>{totalAcreage.toFixed(1)} Acres</b>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Harvest Stock Ready</span>
            <Layers size={18} color="var(--accent-cyan)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {(totalProduceKg / 1000).toFixed(1)} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>MT</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {produceList.length} active listings
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Shipments</span>
            <Truck size={18} color="var(--accent-amber)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {activeShipmentsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {shipments.length} total shipments logged
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Escrow & Payments</span>
            <DollarSign size={18} color="var(--accent-emerald)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
            ₹{(payments?.total_revenue || 180000).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Escrow Locked: ₹{(payments?.escrow_locked || 90000).toLocaleString('en-IN')}
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
          { id: 'new-booking', label: '✦ New Shipment Booking (3 Modes)', icon: Plus, isSpecial: true },
          { id: 'consignments', label: 'Physical Verification Pipeline', count: consignments.length, icon: ClipboardCheck },
          { id: 'sell-before-spoilage', label: 'Sell Before Spoilage (Rescue)', icon: AlertTriangle, isSpecial: true },
          { id: 'farms', label: 'My Registered Farms', count: farms.length, icon: Sprout },
          { id: 'produce', label: 'Produce Catalog & Quality', count: produceList.length, icon: Layers },
          { id: 'shipments', label: 'Shipments & Live Tracking', count: shipments.length, icon: Truck },
          { id: 'cold-storage', label: 'Cold Storage Finder & Bookings', count: bookings.length, icon: Warehouse },
          { id: 'payments', label: 'Payment Milestones', icon: DollarSign },
          { id: 'disputes', label: 'Concerns & Disputes', icon: ShieldAlert }
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
                background: isSpecial && isActive ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? (isSpecial ? 'var(--accent-amber)' : 'var(--accent-emerald)') : 'transparent'}`,
                color: isActive ? (isSpecial ? 'var(--accent-amber)' : 'var(--accent-emerald-light)') : (isSpecial ? 'var(--accent-amber)' : 'var(--text-secondary)'),
                fontWeight: isActive ? '800' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                borderRadius: isSpecial ? 'var(--radius-sm) var(--radius-sm) 0 0' : '0'
              }}
            >
              <Icon size={16} color={isSpecial ? 'var(--accent-amber)' : undefined} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? 'var(--accent-emerald-light)' : 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB: NEW SHIPMENT BOOKING (ROAD / AIR / MARINE) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'new-booking' && (
        <NewShipmentBooking 
          onBookingConfirmed={() => {
            loadFarmerData(true);
            setActiveTab('shipments');
          }}
          onNavigateVerificationQueue={() => setActiveTab('consignments')}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 0: FARMER DASHBOARD OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AI LOSS PREVENTION HERO RECOMMENDATION */}
          <div style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1px solid #FCD34D',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '750px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B45309', background: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #FDE68A' }}>
                    ✦ AI LOSS PREVENTION ALERT
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400E' }}>
                    500 KG Tomatoes (Shipment #SHP-TOMATO-001)
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#78350F', lineHeight: '1.4' }}>
                  "Your tomato shipment has 18 hours of remaining shelf life. Buyer B is closer and can receive the produce earlier."
                </div>
                <div style={{ fontSize: '12px', color: '#92400E', marginTop: '4px' }}>
                  Estimated Loss Avoided: <b style={{ color: '#15803D' }}>₹18,500</b> · Predicted Quality Retention: <b>94%</b>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('sell-before-spoilage')}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #D97706, #B45309)',
                  borderColor: '#B45309',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  boxShadow: '0 4px 14px rgba(180, 83, 9, 0.25)'
                }}
              >
                <span>Review & Redirect 300 KG</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* ACTIVE PRODUCE & COLD STORAGE QUICK CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* My Produce Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sprout size={18} color="var(--accent-emerald)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>My Produce Stock</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('produce')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  View All ({produceList.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {produceList.slice(0, 3).map((prod) => (
                  <div key={prod.produce_id} style={{
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
                        {prod.crop_name} ({prod.variety})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Grade: <b style={{ color: 'var(--accent-emerald)' }}>{prod.quality_grade || 'Grade A'}</b> · Brix: {prod.brix_level || 16.5}°
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                        {prod.available_quantity_kg || prod.total_quantity_kg} KG
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ₹{prod.unit_price_per_kg}/kg
                      </div>
                    </div>
                  </div>
                ))}
                {produceList.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No produce listed yet. Click "List Harvest Produce" to begin.
                  </div>
                )}
              </div>
            </div>

            {/* Nearby Available Cold Storage */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Warehouse size={18} color="var(--accent-blue)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>Nearby Cold Storage</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cold-storage')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Find Space
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {coldStorages.slice(0, 3).map((cs) => (
                  <div key={cs.facility_id} style={{
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
                        {cs.facility_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {cs.district}, {cs.state} · Temp: <b style={{ color: 'var(--accent-blue)' }}>2°C to 12°C</b>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStorageFacility(cs);
                        setShowBookingModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--accent-blue)', borderColor: '#B8DBF7' }}
                    >
                      Book Chamber
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 0.25: MANDATORY PHYSICAL CONSIGNMENT VERIFICATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'consignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* MANDATORY VERIFICATION POLICY BANNER */}
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 16px rgba(5, 150, 105, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '820px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065F46', background: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #6EE7B7' }}>
                    🛡️ MANDATORY PHYSICAL INSPECTION PROTOCOL
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#047857' }}>
                    Standard Operating Procedure
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#064E3B', lineHeight: '1.4' }}>
                  All agricultural shipments require mandatory farm-gate or dock physical inspection by an authorized Verification Officer before transport booking (Road / Air / Marine) or dispatch can be unlocked.
                </div>
                <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                  Verified consignments receive a cryptographic <b>Verification Reference Number (VRF)</b> binding actual weight, pulp temperature, and packaging condition.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateConsignmentModal(true)}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                borderColor: '#047857',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '700',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Plus size={15} />
              <span>New Consignment Request</span>
            </button>
          </div>

          {/* CONSIGNMENT PIPELINE CARDS */}
          {consignments.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', background: '#FFFFFF' }}>
              <ClipboardCheck size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                No Consignment Requests Yet
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 20px auto' }}>
                Create your first consignment request to schedule an on-site physical inspection for your produce.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateConsignmentModal(true)}
                className="btn btn-primary btn-sm"
                style={{ margin: '0 auto' }}
              >
                <Plus size={14} />
                <span>Create Consignment Request</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              {consignments.map((req) => {
                const status = req.verification_status;
                const isApproved = ['APPROVED', 'AWAITING_BOOKING', 'BOOKING_CONFIRMED', 'LOGISTICS_ACCEPTED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(status);
                const isCorrection = status === 'REQUIRES_CORRECTION';
                const isRejected = status === 'REJECTED';
                const isPending = ['PENDING_VERIFICATION', 'INSPECTION_SCHEDULED', 'UNDER_INSPECTION'].includes(status);

                const getStatusColor = () => {
                  if (isApproved) return { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', border: '#A7F3D0' };
                  if (isCorrection) return { bg: 'rgba(245, 158, 11, 0.12)', text: '#D97706', border: '#FDE68A' };
                  if (isRejected) return { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626', border: '#FECACA' };
                  return { bg: 'rgba(2, 132, 199, 0.1)', text: '#0284C7', border: '#BAE6FD' };
                };

                const modeIcon = () => {
                  if (req.preferred_transport_mode === 'AIR') return <Plane size={14} />;
                  if (req.preferred_transport_mode === 'MARINE') return <Ship size={14} />;
                  return <Truck size={14} />;
                };

                const colors = getStatusColor();

                return (
                  <div key={req.consignment_id} className="card" style={{
                    padding: '20px',
                    border: `1px solid ${colors.border}`,
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div>
                      {/* Top bar with ID, mode and status badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="font-mono" style={{ fontSize: '13px', fontWeight: '800', color: '#0284C7' }}>
                              {req.consignment_id}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: '#F1F5F9',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {modeIcon()}
                              <span>{req.preferred_transport_mode}</span>
                            </span>
                          </div>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
                            {req.product_name} <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>({req.variety || 'Standard'})</span>
                          </h4>
                        </div>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Route specs */}
                      <div style={{
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '12px',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                          <MapPin size={13} color="#0284C7" />
                          <span><b>Pickup:</b> {req.pickup_location} ({req.pickup_pincode || '422001'})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                          <ChevronRight size={13} color="#64748B" />
                          <span><b>Destination:</b> {req.destination_location} ({req.destination_pincode || '400707'})</span>
                        </div>
                      </div>

                      {/* Quantity & Physical Parameters Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px 12px',
                        background: '#F8FAFC',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #E2E8F0',
                        marginBottom: '12px',
                        fontSize: '12px'
                      }}>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Declared Quantity</span>
                          <b style={{ color: '#1E293B' }}>{req.declared_quantity_kg?.toLocaleString()} kg</b>
                          <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>({req.declared_package_count || 1} pkgs)</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Verified Quantity</span>
                          <b style={{ color: req.verified_quantity_kg ? '#059669' : '#94A3B8' }}>
                            {req.verified_quantity_kg ? `${req.verified_quantity_kg?.toLocaleString()} kg` : 'Pending Inspection'}
                          </b>
                          {req.verified_quality_grade && (
                            <span style={{ fontSize: '10px', color: '#059669', display: 'block' }}>{req.verified_quality_grade}</span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Required Temp Range</span>
                          <b style={{ color: '#0284C7' }}>{req.target_temp_min}°C to {req.target_temp_max}°C</b>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Measured Pulp Temp</span>
                          <b style={{ color: req.measured_temperature !== null && req.measured_temperature !== undefined ? '#059669' : '#94A3B8' }}>
                            {req.measured_temperature !== null && req.measured_temperature !== undefined ? `${req.measured_temperature}°C` : 'Pending Inspection'}
                          </b>
                        </div>
                      </div>

                      {/* Officer details / Status Highlight Box */}
                      {isApproved && (
                        <div style={{
                          padding: '10px 12px',
                          background: '#ECFDF5',
                          border: '1px solid #6EE7B7',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '14px',
                          fontSize: '12px',
                          color: '#065F46'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <b>✅ Verification Reference (VRF):</b>
                            <span className="font-mono" style={{ fontWeight: '800', background: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                              {req.verification_reference_number || req.vrf_number || `VRF-${req.consignment_id}`}
                            </span>
                          </div>
                          <div>Verified by Officer <b>{req.officer_name || req.assigned_officer_id || 'Sunil Shinde (OFF-101)'}</b>. Ready for confirmed transport booking.</div>
                        </div>
                      )}

                      {isCorrection && (
                        <div style={{
                          padding: '10px 12px',
                          background: '#FFFBEB',
                          border: '1px solid #FCD34D',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '14px',
                          fontSize: '12px',
                          color: '#92400E'
                        }}>
                          <b>⚠️ Officer Discrepancy Note:</b>
                          <div style={{ marginTop: '2px' }}>
                            {req.corrective_actions_required || req.officer_remarks || 'Packaging or weight discrepancy noted. Correction required before dispatch.'}
                          </div>
                        </div>
                      )}

                      {isRejected && (
                        <div style={{
                          padding: '10px 12px',
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '14px',
                          fontSize: '12px',
                          color: '#991B1B'
                        }}>
                          <b>❌ Rejection Reason:</b>
                          <div style={{ marginTop: '2px' }}>
                            {req.officer_remarks || 'Consignment failed mandatory quality/condition thresholds.'}
                          </div>
                        </div>
                      )}

                      {isPending && (
                        <div style={{
                          padding: '8px 12px',
                          background: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '14px',
                          fontSize: '12px',
                          color: '#0369A1'
                        }}>
                          <b>⏳ Inspection Queue:</b> {req.assigned_officer_name ? `Assigned to ${req.assigned_officer_name}` : 'Awaiting officer dispatch to farm gate.'}
                        </div>
                      )}
                    </div>

                    {/* Action buttons footer */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                      {isApproved && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingConsignment(req);
                              setBookingFormAfterApproval({
                                selected_mode: req.preferred_transport_mode || 'ROAD',
                                quote_id: null,
                                special_handling_instructions: `Maintain ${req.target_temp_min}°C-${req.target_temp_max}°C. Verified under ${req.verification_reference_number || req.consignment_id}.`
                              });
                              setShowBookingModalAfterApproval(true);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, background: 'linear-gradient(135deg, #059669, #047857)', borderColor: '#047857' }}
                          >
                            <Truck size={13} />
                            <span>Book Transport</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateTab) onNavigateTab('multi-route-planner');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            title="Compare 3-Mode Transportation Options (Road / Air / Marine)"
                          >
                            <Compass size={13} />
                            <span>Compare Routes</span>
                          </button>
                        </>
                      )}

                      {isCorrection && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCorrectionConsignment(req);
                            setCorrectionForm({
                              description: '',
                              photos: '',
                              request_reinspection: true
                            });
                            setShowCorrectionModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: 'linear-gradient(135deg, #D97706, #B45309)', borderColor: '#B45309' }}
                        >
                          <Edit3 size={13} />
                          <span>Submit Rectifications</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetchConsignmentDetail(req.consignment_id);
                            setSelectedConsignmentDetail(res.data || req);
                          } catch {
                            setSelectedConsignmentDetail(req);
                          }
                          setShowConsignmentDetailModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        <FileText size={13} />
                        <span>Audit Dossier</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 0.5: SELL BEFORE SPOILAGE ENGINE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sell-before-spoilage' && (
        <SellBeforeSpoilageFarmer />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB A: REGISTERED FARMS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'farms' && (

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {farms.map((farm) => (
              <div key={farm.farm_id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {farm.farm_name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <MapPin size={12} color="var(--accent-cyan)" />
                      <span>{farm.location}, {farm.district}, {farm.state}</span>
                    </div>
                  </div>
                  {farm.organic_certified && (
                    <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald-light)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                      ORGANIC CERTIFIED
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Acreage</span>
                    <b style={{ color: 'var(--text-primary)' }}>{farm.acreage} Acres</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Soil Type</span>
                    <b style={{ color: 'var(--text-primary)' }}>{farm.soil_type || 'Black Loam'}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Water Source</span>
                    <b style={{ color: 'var(--text-primary)' }}>{farm.water_source || 'Drip'}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Farm ID</span>
                    <b className="font-mono" style={{ color: 'var(--accent-blue)', fontSize: '11px' }}>{farm.farm_id}</b>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Primary Crops:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(farm.primary_crops || []).map((crop, idx) => (
                      <span key={idx} style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingFarm(farm);
                    setFarmForm({
                      farm_name: farm.farm_name,
                      location: farm.location,
                      district: farm.district,
                      state: farm.state,
                      acreage: farm.acreage,
                      primary_crops: Array.isArray(farm.primary_crops) ? farm.primary_crops.join(', ') : (farm.primary_crops || ''),
                      soil_type: farm.soil_type || 'Black Loam',
                      water_source: farm.water_source || 'Drip Irrigation',
                      organic_certified: farm.organic_certified || false
                    });
                    setShowAddFarmModal(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  <Edit3 size={12} />
                  <span>Edit Farm Details</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB B: PRODUCE INVENTORY & QUALITY INSPECTION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'produce' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {produceList.map((item) => (
              <div key={item.listing_id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {item.crop_name}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
                      {item.variety}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: item.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: item.status === 'AVAILABLE' ? 'var(--accent-emerald-light)' : 'var(--accent-amber-light)'
                  }}>
                    {item.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontSize: '11px', textAlign: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Stock</span>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{item.available_quantity_kg} kg</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Price/kg</span>
                    <div style={{ fontWeight: '700', color: 'var(--accent-emerald-light)', fontSize: '13px' }}>₹{item.unit_price_per_kg}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Safe Range</span>
                    <div style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '13px' }}>{item.target_temp_min}°-{item.target_temp_max}°C</div>
                  </div>
                </div>

                {/* Quality Metrics */}
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px', marginBottom: '12px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Quality Grade:</span>
                    <b style={{ color: 'var(--text-primary)' }}>{item.quality_grade || 'Grade A'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Brix (Sweetness):</span>
                    <b style={{ color: 'var(--accent-amber-light)' }}>{item.brix_level || 16.0}° Bx</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Moisture Content:</span>
                    <b style={{ color: 'var(--accent-cyan)' }}>{item.moisture_percent || 75.0}%</b>
                  </div>
                </div>

                {item.inspection_notes && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontStyle: 'italic' }}>
                    "{item.inspection_notes}"
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShipmentForm(prev => ({
                        ...prev,
                        product_name: item.crop_name,
                        variety: item.variety,
                        total_quantity: item.available_quantity_kg,
                        grade_a_quantity: item.available_quantity_kg * 0.8,
                        grade_b_quantity: item.available_quantity_kg * 0.2,
                        target_temp_min: item.target_temp_min,
                        target_temp_max: item.target_temp_max
                      }));
                      setShowCreateShipmentModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Truck size={12} />
                    <span>Create Shipment</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB C: SHIPMENTS & DISPATCH TRACKING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'shipments' && (
        <div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Shipment Custody & Status Registry
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {shipments.length} records found
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px' }}>Shipment ID</th>
                    <th style={{ padding: '12px 16px' }}>Product</th>
                    <th style={{ padding: '12px 16px' }}>Origin → Destination</th>
                    <th style={{ padding: '12px 16px' }}>Temp Target</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Initial Quality</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.shipment_id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>
                          {s.shipment_id}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(s.departure_time || s.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <b>{s.product_name}</b>
                        {s.total_quantity && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.total_quantity} kg</div>}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🟢 {s.origin}
                        </div>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                          🏁 {s.destination}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>
                          {s.target_temp_min}° - {s.target_temp_max}°C
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: s.shipment_status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.15)' : s.shipment_status === 'IN_TRANSIT' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: s.shipment_status === 'DELIVERED' ? 'var(--accent-emerald-light)' : s.shipment_status === 'IN_TRANSIT' ? 'var(--accent-blue)' : 'var(--accent-amber-light)'
                        }}>
                          {s.shipment_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px' }}>
                        <div>Grade A: <b style={{ color: 'var(--accent-emerald-light)' }}>{s.grade_a_quantity || s.total_quantity || 0} kg</b></div>
                        {s.damaged_quantity > 0 && <div style={{ color: 'var(--accent-rose)' }}>Damaged: {s.damaged_quantity} kg</div>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setQrModalShipmentId(s.shipment_id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="View QR Code verification pass"
                          >
                            <QrCode size={12} />
                            <span>QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDisputeShipmentId(s.shipment_id);
                              setShowDisputeModal(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                            title="Report shipment concern or file dispute"
                          >
                            <AlertTriangle size={12} />
                            <span>Issue</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB D: COLD STORAGE FINDER & BOOKINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'cold-storage' && (
        <div>
          {/* Active Bookings */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Warehouse size={18} color="var(--accent-blue)" />
              My Storage Bookings & Intake Status
            </h3>

            {bookings.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No cold storage reservations requested yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {bookings.map((b) => (
                  <div key={b.booking_id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)' }}>{b.booking_id}</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: b.status === 'ACCEPTED' || b.status === 'INTAKE_COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: b.status === 'ACCEPTED' || b.status === 'INTAKE_COMPLETED' ? 'var(--accent-emerald-light)' : 'var(--accent-amber-light)'
                      }}>
                        {b.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {b.facility_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {b.produce_name} · <b>{b.quantity_mt} MT</b> for {b.duration_days} days
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                      <span>Intake: {b.requested_intake_date}</span>
                      <span style={{ color: 'var(--accent-emerald-light)', fontWeight: '700' }}>Est. Cost: ₹{b.estimated_cost}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nearby Facilities Finder */}
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} color="var(--accent-cyan)" />
            Verified Nearby Cold Storage Facilities
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {coldStorages.map((fac) => (
              <div key={fac.facility_id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{fac.facility_name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <MapPin size={12} color="var(--accent-cyan)" />
                      <span>{fac.location}, {fac.district}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                    VERIFIED
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Available Capacity</span>
                    <b style={{ color: 'var(--accent-emerald-light)' }}>{fac.available_capacity_mt} / {fac.total_capacity_mt} MT</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Daily Rate</span>
                    <b style={{ color: 'var(--text-primary)' }}>₹{fac.rate_per_mt_day} / MT / Day</b>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStorageFacility(fac);
                    setShowBookingModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  <Warehouse size={14} />
                  <span>Request Storage Booking</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB E: PAYMENTS & ESCROW MILESTONES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'payments' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} color="var(--accent-emerald)" />
            Escrow Payment Milestones & Invoices
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Contract Volume</span>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                ₹{(payments?.total_revenue || 180000).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-amber-light)' }}>Escrow Held in Trust</span>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-amber-light)', marginTop: '4px' }}>
                ₹{(payments?.escrow_locked || 90000).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-emerald-light)' }}>Released to Farmer</span>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-emerald-light)', marginTop: '4px' }}>
                ₹{(payments?.released_amount || 90000).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Order Escrow Status
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 14px' }}>Order ID</th>
                  <th style={{ padding: '10px 14px' }}>Produce</th>
                  <th style={{ padding: '10px 14px' }}>Quantity</th>
                  <th style={{ padding: '10px 14px' }}>Total Amount</th>
                  <th style={{ padding: '10px 14px' }}>Escrow Status</th>
                  <th style={{ padding: '10px 14px' }}>Milestone Progress</th>
                </tr>
              </thead>
              <tbody>
                {(payments?.orders || []).map((ord) => (
                  <tr key={ord.order_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="font-mono" style={{ padding: '10px 14px', color: 'var(--accent-blue)' }}>{ord.order_id}</td>
                    <td style={{ padding: '10px 14px' }}><b>{ord.produce_name}</b></td>
                    <td style={{ padding: '10px 14px' }}>{ord.quantity_kg} kg</td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-primary)' }}>₹{ord.total_amount?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: ord.payment_status === 'RELEASED_TO_FARMER' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: ord.payment_status === 'RELEASED_TO_FARMER' ? 'var(--accent-emerald-light)' : 'var(--accent-amber-light)'
                      }}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {ord.payment_status === 'RELEASED_TO_FARMER' ? '✅ Buyer Verified & Funds Released' : '⏳ Cargo in Transit / Inspection Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB F: DISPUTES & INCIDENT REPORTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'disputes' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="var(--accent-rose)" />
                Shipment Concerns & Escrow Disputes
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Report temperature excursions, delayed handoffs, or produce damage with automated AI forensic analysis
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDisputeShipmentId(shipments[0]?.shipment_id || 'AGRI-1001');
                setShowDisputeModal(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
            >
              <Plus size={14} />
              <span>File Quality / Escrow Concern</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 14px' }}>Shipment ID</th>
                  <th style={{ padding: '10px 14px' }}>Produce</th>
                  <th style={{ padding: '10px 14px' }}>Route</th>
                  <th style={{ padding: '10px 14px' }}>Vehicle</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.shipment_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="font-mono" style={{ padding: '10px 14px', color: 'var(--accent-blue)', fontWeight: '700' }}>#{s.shipment_id}</td>
                    <td style={{ padding: '10px 14px' }}><b>{s.product_name}</b> ({s.total_quantity} kg)</td>
                    <td style={{ padding: '10px 14px' }}>{s.origin} → {s.destination}</td>
                    <td style={{ padding: '10px 14px' }} className="font-mono">{s.vehicle_id}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge badge-info">{s.shipment_status}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDisputeShipmentId(s.shipment_id);
                          setShowDisputeModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--accent-rose-light)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                      >
                        <ShieldAlert size={12} />
                        <span>Report Concern</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT FARM */}
      {/* ------------------------------------------------------------- */}
      {showAddFarmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              {editingFarm ? 'Edit Farm Details' : 'Register New Farm'}
            </h3>
            <form onSubmit={handleSaveFarm}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Farm Name *</label>
                <input
                  type="text"
                  value={farmForm.farm_name}
                  onChange={(e) => setFarmForm({ ...farmForm, farm_name: e.target.value })}
                  required
                  placeholder="e.g. Sahyadri Mango Orchards"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>District</label>
                  <input
                    type="text"
                    value={farmForm.district}
                    onChange={(e) => setFarmForm({ ...farmForm, district: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>State</label>
                  <input
                    type="text"
                    value={farmForm.state}
                    onChange={(e) => setFarmForm({ ...farmForm, state: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Village / Location *</label>
                <input
                  type="text"
                  value={farmForm.location}
                  onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })}
                  required
                  placeholder="e.g. Dindori Taluka, Nashik"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Acreage (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={farmForm.acreage}
                    onChange={(e) => setFarmForm({ ...farmForm, acreage: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Soil Type</label>
                  <input
                    type="text"
                    value={farmForm.soil_type}
                    onChange={(e) => setFarmForm({ ...farmForm, soil_type: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Primary Crops (comma separated)</label>
                <input
                  type="text"
                  value={farmForm.primary_crops}
                  onChange={(e) => setFarmForm({ ...farmForm, primary_crops: e.target.value })}
                  placeholder="Mango, Grapes, Pomegranate"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="organic"
                  checked={farmForm.organic_certified}
                  onChange={(e) => setFarmForm({ ...farmForm, organic_certified: e.target.checked })}
                />
                <label htmlFor="organic" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Organic Farming Certified (NPOP / APEDA verified)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddFarmModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingFarm ? 'Update Farm' : 'Register Farm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD HARVEST PRODUCE */}
      {/* ------------------------------------------------------------- */}
      {showAddProduceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              List Harvest Produce with Quality Inspection
            </h3>
            <form onSubmit={handleCreateProduce}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Crop Name *</label>
                  <input
                    type="text"
                    value={produceForm.crop_name}
                    onChange={(e) => setProduceForm({ ...produceForm, crop_name: e.target.value })}
                    required
                    placeholder="e.g. Mango"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Variety *</label>
                  <input
                    type="text"
                    value={produceForm.variety}
                    onChange={(e) => setProduceForm({ ...produceForm, variety: e.target.value })}
                    required
                    placeholder="e.g. Alphonso"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Quantity (kg) *</label>
                  <input
                    type="number"
                    value={produceForm.total_quantity_kg}
                    onChange={(e) => setProduceForm({ ...produceForm, total_quantity_kg: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Unit Price (₹/kg) *</label>
                  <input
                    type="number"
                    value={produceForm.unit_price_per_kg}
                    onChange={(e) => setProduceForm({ ...produceForm, unit_price_per_kg: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={produceForm.target_temp_min}
                    onChange={(e) => setProduceForm({ ...produceForm, target_temp_min: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={produceForm.target_temp_max}
                    onChange={(e) => setProduceForm({ ...produceForm, target_temp_max: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Brix (°Bx)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={produceForm.brix_level}
                    onChange={(e) => setProduceForm({ ...produceForm, brix_level: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Moisture (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={produceForm.moisture_percent}
                    onChange={(e) => setProduceForm({ ...produceForm, moisture_percent: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Quality Inspection Notes</label>
                <textarea
                  rows={2}
                  value={produceForm.inspection_notes}
                  onChange={(e) => setProduceForm({ ...produceForm, inspection_notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Photo Evidence URLs</label>
                <input
                  type="text"
                  value={produceForm.photo_urls}
                  onChange={(e) => setProduceForm({ ...produceForm, photo_urls: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddProduceModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Submit Produce Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE SHIPMENT */}
      {/* ------------------------------------------------------------- */}
      {showCreateShipmentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Create Verified Shipment & Dispatch
            </h3>
            <form onSubmit={handleCreateShipment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Product Name *</label>
                  <input
                    type="text"
                    value={shipmentForm.product_name}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, product_name: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Quantity (kg) *</label>
                  <input
                    type="number"
                    value={shipmentForm.total_quantity}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, total_quantity: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Initial Quality Breakdown Baseline */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-emerald-light)', marginBottom: '8px' }}>
                  Initial Quality Baseline Breakdown (Verified at Gate)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grade A (kg)</label>
                    <input
                      type="number"
                      value={shipmentForm.grade_a_quantity}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, grade_a_quantity: e.target.value })}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grade B (kg)</label>
                    <input
                      type="number"
                      value={shipmentForm.grade_b_quantity}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, grade_b_quantity: e.target.value })}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Damaged (kg)</label>
                    <input
                      type="number"
                      value={shipmentForm.damaged_quantity}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, damaged_quantity: e.target.value })}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Origin (Farm Gate) *</label>
                <input
                  type="text"
                  value={shipmentForm.origin}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, origin: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Destination (Buyer / Hub) *</label>
                <input
                  type="text"
                  value={shipmentForm.destination}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, destination: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Safe Temp Min (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={shipmentForm.target_temp_min}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, target_temp_min: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Safe Temp Max (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={shipmentForm.target_temp_max}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, target_temp_max: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateShipmentModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Generate Shipment & QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: COLD STORAGE BOOKING */}
      {/* ------------------------------------------------------------- */}
      {showBookingModal && selectedStorageFacility && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Reserve Cold Storage Capacity
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Facility: <b style={{ color: 'var(--accent-blue)' }}>{selectedStorageFacility.facility_name}</b> (₹{selectedStorageFacility.rate_per_mt_day}/MT/Day)
            </p>

            <form onSubmit={handleCreateBooking}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Produce Name</label>
                <input
                  type="text"
                  value={bookingForm.produce_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, produce_name: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Quantity (Metric Tonnes)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bookingForm.quantity_mt}
                    onChange={(e) => setBookingForm({ ...bookingForm, quantity_mt: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Duration (Days)</label>
                  <input
                    type="number"
                    value={bookingForm.duration_days}
                    onChange={(e) => setBookingForm({ ...bookingForm, duration_days: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Intake Date</label>
                <input
                  type="date"
                  value={bookingForm.requested_intake_date}
                  onChange={(e) => setBookingForm({ ...bookingForm, requested_intake_date: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Storage Cost:</span>
                <b style={{ color: 'var(--accent-emerald-light)' }}>
                  ₹{(bookingForm.quantity_mt * bookingForm.duration_days * (selectedStorageFacility.rate_per_mt_day || 180)).toLocaleString('en-IN')}
                </b>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowBookingModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirm Reservation Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REPORT CONCERN / DISPUTE */}
      {/* ------------------------------------------------------------- */}
      {showDisputeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', marginBottom: '12px' }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Report Issue on #{disputeShipmentId}
              </h3>
            </div>

            <form onSubmit={handleCreateDispute}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Issue Category</label>
                <select
                  value={disputeForm.dispute_category}
                  onChange={(e) => setDisputeForm({ ...disputeForm, dispute_category: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="TEMPERATURE_EXCURSION">Temperature Excursion / Thermal Abuse</option>
                  <option value="QUANTITY_SHORTAGE">Quantity Shortage</option>
                  <option value="GRADE_MISMATCH">Grade & Quality Mismatch</option>
                  <option value="CARGO_DAMAGE">Physical Cargo Damage</option>
                  <option value="DELIVERY_DELAY">Unreasonable Transit Delay</option>
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
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description & Explanation</label>
                <textarea
                  rows={3}
                  value={disputeForm.description}
                  onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  required
                  placeholder="Explain what occurred..."
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
                  Submit Formal Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: QR CODE PASS */}
      {/* ------------------------------------------------------------- */}
      {qrModalShipmentId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '380px', width: '100%', padding: '28px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
              Shipment Verification Pass
            </h3>
            <p className="font-mono" style={{ fontSize: '13px', color: 'var(--accent-blue)', marginBottom: '16px' }}>
              #{qrModalShipmentId}
            </p>

            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '16px' }}>
              <img
                src={getQrCodeUrl(qrModalShipmentId)}
                alt={`QR Code for ${qrModalShipmentId}`}
                style={{ width: '180px', height: '180px', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '1.4' }}>
              Scan at logistics pickup, cold-storage intake dock, or buyer receiving point to verify provenance and quality baseline.
            </p>

            <button
              type="button"
              onClick={() => setQrModalShipmentId(null)}
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE CONSIGNMENT REQUEST (PHYSICAL VERIFICATION) */}
      {/* ------------------------------------------------------------- */}
      {showCreateConsignmentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#059669" />
                  New Consignment Verification Request
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Mandatory on-site physical inspection before transport booking (Road / Air / Marine).
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreateConsignmentModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConsignment}>
              {/* Preferred Mode Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Preferred Transportation Mode *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'ROAD', label: 'Road Logistics', icon: Truck, desc: 'Reefer Truck / FTL' },
                    { id: 'AIR', label: 'Air Cargo', icon: Plane, desc: 'Perishable Air Freight' },
                    { id: 'MARINE', label: 'Marine Logistics', icon: Ship, desc: 'Reefer Container (AIS)' }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = consignmentForm.preferred_transport_mode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setConsignmentForm({ ...consignmentForm, preferred_transport_mode: m.id })}
                        style={{
                          border: `2px solid ${isSelected ? '#0284C7' : '#E2E8F0'}`,
                          background: isSelected ? '#F0F9FF' : '#FFFFFF',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={20} color={isSelected ? '#0284C7' : '#64748B'} style={{ margin: '0 auto 4px auto' }} />
                        <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? '#0284C7' : '#1E293B' }}>{m.label}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>{m.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Product / Material Name *</label>
                  <input
                    type="text"
                    value={consignmentForm.product_name}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, product_name: e.target.value })}
                    required
                    placeholder="e.g. Alphonso Mango"
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Variety / Quality Grade *</label>
                  <input
                    type="text"
                    value={consignmentForm.variety}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, variety: e.target.value })}
                    required
                    placeholder="e.g. Devgad GI Certified Grade A"
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Origin & Destination */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Pickup Location (Farm Gate) *</label>
                  <input
                    type="text"
                    value={consignmentForm.pickup_location}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, pickup_location: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Pickup PIN *</label>
                  <input
                    type="text"
                    value={consignmentForm.pickup_pincode}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, pickup_pincode: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Destination Hub / Port *</label>
                  <input
                    type="text"
                    value={consignmentForm.destination_location}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, destination_location: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Dest PIN *</label>
                  <input
                    type="text"
                    value={consignmentForm.destination_pincode}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, destination_pincode: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Quantity, Packages, and Temperature Target */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Declared Weight (kg) *</label>
                  <input
                    type="number"
                    value={consignmentForm.declared_quantity_kg}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, declared_quantity_kg: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Package Count *</label>
                  <input
                    type="number"
                    value={consignmentForm.declared_package_count}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, declared_package_count: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Target Temp (°C)</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.5"
                      value={consignmentForm.target_temp_min}
                      onChange={(e) => setConsignmentForm({ ...consignmentForm, target_temp_min: e.target.value })}
                      style={{ width: '50%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 6px', color: '#0F172A', fontSize: '12px' }}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      step="0.5"
                      value={consignmentForm.target_temp_max}
                      onChange={(e) => setConsignmentForm({ ...consignmentForm, target_temp_max: e.target.value })}
                      style={{ width: '50%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 6px', color: '#0F172A', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Packaging Specifications */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Packaging Type</label>
                  <select
                    value={consignmentForm.packaging_type}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, packaging_type: e.target.value })}
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  >
                    <option value="5-Ply Ventilated Corrugated Cartons">5-Ply Ventilated Corrugated Cartons</option>
                    <option value="Heavy Duty Plastic Crates (Ventilated)">Heavy Duty Plastic Crates (Ventilated)</option>
                    <option value="Insulated Palletized Containers">Insulated Palletized Containers</option>
                    <option value="Standard Cold-Chain Reefer Boxes">Standard Cold-Chain Reefer Boxes</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Expected Pickup Date *</label>
                  <input
                    type="date"
                    value={consignmentForm.expected_pickup_date}
                    onChange={(e) => setConsignmentForm({ ...consignmentForm, expected_pickup_date: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Material Description & Photo */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Material Description & Handling Requirements</label>
                <textarea
                  rows={2}
                  value={consignmentForm.material_description}
                  onChange={(e) => setConsignmentForm({ ...consignmentForm, material_description: e.target.value })}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Customer Photos / Documents (URLs)</label>
                <input
                  type="text"
                  value={consignmentForm.customer_photos}
                  onChange={(e) => setConsignmentForm({ ...consignmentForm, customer_photos: e.target.value })}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              {/* Policy note */}
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '11px', color: '#166534' }}>
                ℹ️ <b>Verification Notice:</b> Submitting this request places the consignment in <code>PENDING_VERIFICATION</code>. An authorized physical verification officer will be dispatched to your pickup gate for physical inspection, weighing, and pulp temperature verification before booking or dispatch is unlocked.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateConsignmentModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#059669', borderColor: '#059669' }}>
                  Submit Consignment Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUBMIT RECTIFICATIONS & REQUEST REINSPECTION */}
      {/* ------------------------------------------------------------- */}
      {showCorrectionModal && selectedCorrectionConsignment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '28px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', marginBottom: '12px' }}>
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                Rectification & Reinspection Request
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
              Consignment: <b className="font-mono" style={{ color: '#0284C7' }}>{selectedCorrectionConsignment.consignment_id}</b> ({selectedCorrectionConsignment.product_name})
            </div>

            {/* Officer Findings */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px', color: '#92400E' }}>
              <b>Officer Discrepancy Findings:</b>
              <div style={{ marginTop: '4px' }}>
                {selectedCorrectionConsignment.corrective_actions_required || selectedCorrectionConsignment.officer_remarks || 'Packaging or weight discrepancy noted by inspection team.'}
              </div>
            </div>

            <form onSubmit={handleSubmitCorrection}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Action Taken / Rectification Description *
                </label>
                <textarea
                  rows={3}
                  value={correctionForm.description}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, description: e.target.value })}
                  required
                  placeholder="Explain how the discrepancies were corrected (e.g. repacked in ventilated cartons, pre-cooled to 11.5°C)..."
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Photo Evidence of Rectification (URL)
                </label>
                <input
                  type="text"
                  value={correctionForm.photos}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, photos: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="req_reinspec"
                  checked={correctionForm.request_reinspection}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, request_reinspection: e.target.checked })}
                />
                <label htmlFor="req_reinspec" style={{ fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                  Request on-site physical reinspection by Verification Officer
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCorrectionModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#D97706', borderColor: '#D97706' }}>
                  Submit Rectifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: BOOK 3-MODE TRANSPORT AFTER VERIFICATION APPROVAL */}
      {/* ------------------------------------------------------------- */}
      {showBookingModalAfterApproval && selectedBookingConsignment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '28px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', marginBottom: '8px' }}>
              <CheckCircle2 size={22} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                Confirm Verified Transport Booking
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
              Consignment <b className="font-mono" style={{ color: '#0284C7' }}>{selectedBookingConsignment.consignment_id}</b> · VRF Ref: <b className="font-mono" style={{ color: '#059669' }}>{selectedBookingConsignment.verification_reference_number || `VRF-${selectedBookingConsignment.consignment_id}`}</b>
            </div>

            {/* Verified baseline specs */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Verified Weight</span>
                <b>{selectedBookingConsignment.verified_quantity_kg || selectedBookingConsignment.declared_quantity_kg} kg</b>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Quality Grade</span>
                <b style={{ color: '#059669' }}>{selectedBookingConsignment.verified_quality_grade || 'Grade A Export'}</b>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Pulp Temperature</span>
                <b>{selectedBookingConsignment.measured_temperature || selectedBookingConsignment.target_temp_min}°C</b>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Origin → Destination</span>
                <b>{selectedBookingConsignment.pickup_pincode || 'Nashik'} → {selectedBookingConsignment.destination_pincode || 'Vashi'}</b>
              </div>
            </div>

            <form onSubmit={handleBookVerified}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Selected Mode of Transport *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'ROAD', label: 'Road Logistics', icon: Truck },
                    { id: 'AIR', label: 'Air Cargo', icon: Plane },
                    { id: 'MARINE', label: 'Marine Container', icon: Ship }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSel = bookingFormAfterApproval.selected_mode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setBookingFormAfterApproval({ ...bookingFormAfterApproval, selected_mode: m.id })}
                        style={{
                          border: `2px solid ${isSel ? '#059669' : '#CBD5E1'}`,
                          background: isSel ? '#ECFDF5' : '#FFFFFF',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <Icon size={18} color={isSel ? '#059669' : '#64748B'} style={{ margin: '0 auto 4px auto' }} />
                        <div style={{ fontSize: '12px', fontWeight: '800', color: isSel ? '#059669' : '#1E293B' }}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Special Handling / Cold Chain Instructions
                </label>
                <textarea
                  rows={2}
                  value={bookingFormAfterApproval.special_handling_instructions}
                  onChange={(e) => setBookingFormAfterApproval({ ...bookingFormAfterApproval, special_handling_instructions: e.target.value })}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowBookingModalAfterApproval(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#059669', borderColor: '#059669' }}>
                  Confirm Booking & Transmit to Carrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: FULL CONSIGNMENT VERIFICATION AUDIT DOSSIER */}
      {/* ------------------------------------------------------------- */}
      {showConsignmentDetailModal && selectedConsignmentDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '680px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} color="#059669" />
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                    Physical Inspection Audit Dossier
                  </h3>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Consignment #{selectedConsignmentDetail.consignment_id} · VRF Reference: <b className="font-mono" style={{ color: '#059669' }}>{selectedConsignmentDetail.verification_reference_number || 'VRF-PENDING'}</b>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowConsignmentDetailModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Status Summary Banner */}
            <div style={{
              padding: '12px 16px',
              background: selectedConsignmentDetail.verification_status === 'APPROVED' ? '#ECFDF5' : selectedConsignmentDetail.verification_status === 'REJECTED' ? '#FEF2F2' : '#F0F9FF',
              border: `1px solid ${selectedConsignmentDetail.verification_status === 'APPROVED' ? '#A7F3D0' : selectedConsignmentDetail.verification_status === 'REJECTED' ? '#FECACA' : '#BAE6FD'}`,
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748B' }}>Audit Outcome</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: selectedConsignmentDetail.verification_status === 'APPROVED' ? '#059669' : selectedConsignmentDetail.verification_status === 'REJECTED' ? '#DC2626' : '#0284C7' }}>
                  {selectedConsignmentDetail.verification_status?.replace(/_/g, ' ')}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                <div>Officer: <b>{selectedConsignmentDetail.assigned_officer_name || selectedConsignmentDetail.officer_name || 'Sunil Shinde'}</b></div>
                <div>Time: {selectedConsignmentDetail.inspection_date || selectedConsignmentDetail.created_at ? new Date(selectedConsignmentDetail.inspection_date || selectedConsignmentDetail.created_at).toLocaleString() : 'Recent'}</div>
              </div>
            </div>

            {/* Declared vs Verified Comparison Table */}
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>
              Physical Inspection Baseline Comparison
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #CBD5E1' }}>
                  <th style={{ padding: '8px 10px' }}>Parameter</th>
                  <th style={{ padding: '8px 10px' }}>Declared by Farmer</th>
                  <th style={{ padding: '8px 10px' }}>Physically Verified</th>
                  <th style={{ padding: '8px 10px' }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: '600' }}>Net Cargo Weight</td>
                  <td style={{ padding: '8px 10px' }}>{selectedConsignmentDetail.declared_quantity_kg} kg</td>
                  <td style={{ padding: '8px 10px', fontWeight: '700', color: '#059669' }}>{selectedConsignmentDetail.verified_quantity_kg || selectedConsignmentDetail.declared_quantity_kg} kg</td>
                  <td style={{ padding: '8px 10px', color: '#059669' }}>✓ Verified</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: '600' }}>Pulp / Cargo Temp</td>
                  <td style={{ padding: '8px 10px' }}>{selectedConsignmentDetail.target_temp_min}°C to {selectedConsignmentDetail.target_temp_max}°C</td>
                  <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0284C7' }}>{selectedConsignmentDetail.measured_temperature !== null && selectedConsignmentDetail.measured_temperature !== undefined ? `${selectedConsignmentDetail.measured_temperature}°C` : `${selectedConsignmentDetail.target_temp_min}°C`}</td>
                  <td style={{ padding: '8px 10px', color: '#059669' }}>✓ Within Limit</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: '600' }}>Packaging & Seals</td>
                  <td style={{ padding: '8px 10px' }}>{selectedConsignmentDetail.packaging_type}</td>
                  <td style={{ padding: '8px 10px' }}>{selectedConsignmentDetail.verified_packaging_condition || 'Tamper-Evident Sealed'}</td>
                  <td style={{ padding: '8px 10px', color: '#059669' }}>✓ Compliant</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: '600' }}>Quality Grade</td>
                  <td style={{ padding: '8px 10px' }}>{selectedConsignmentDetail.variety || 'Standard Grade'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: '700' }}>{selectedConsignmentDetail.verified_quality_grade || 'Grade A Export'}</td>
                  <td style={{ padding: '8px 10px', color: '#059669' }}>✓ Passed</td>
                </tr>
              </tbody>
            </table>

            {/* Officer Remarks */}
            {selectedConsignmentDetail.officer_remarks && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Officer Remarks & Audit Log:</div>
                <div style={{ color: '#475569', fontStyle: 'italic' }}>"{selectedConsignmentDetail.officer_remarks}"</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConsignmentDetailModal(false)}
                className="btn btn-primary btn-sm"
              >
                Close Audit Dossier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
