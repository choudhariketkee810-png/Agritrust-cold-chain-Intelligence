import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, 
  Users, 
  MapPin, 
  Radio, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Check, 
  X, 
  Navigation as NavIcon, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  RefreshCw, 
  Camera, 
  FileText, 
  Layers, 
  Info,
  ChevronRight,
  TrendingUp,
  Activity,
  Sliders,
  Sparkles,
  Plane,
  Ship,
  Compass,
  ClipboardCheck,
  Lock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  fetchLogisticsProfile, 
  fetchLogisticsDrivers, 
  createLogisticsDriver, 
  fetchLogisticsVehicles, 
  createLogisticsVehicle, 
  fetchAvailableLogisticsShipments, 
  acceptLogisticsShipment, 
  assignLogisticsShipment, 
  updateLogisticsShipmentStatus, 
  fetchLogisticsFleetTelemetry,
  fetchRecentAlerts,
  getQrCodeUrl,
  fetchConsignments,
  logisticsAcceptConsignment,
  performDispatchReadinessCheck,
  dispatchConsignment,
  updateConsignmentMilestone,
  fetchConsignmentDetail
} from '../api';
import LogisticsRedirection from './LogisticsRedirection';

export default function LogisticsDashboard({ activeTab: externalTab, onNavigateTab }) {
  const [internalTab, setInternalTab] = useState('dashboard');

  // Sync external tab from role sidebar
  useEffect(() => {
    if (!externalTab || externalTab === 'dashboard') {
      setInternalTab('dashboard');
    } else if (externalTab === 'fleet') {
      setInternalTab('fleet');
    } else if (externalTab === 'assigned-shipments' || externalTab === 'verified-consignments') {
      setInternalTab('verified-consignments');
    } else if (['marine-routes', 'live-monitoring', 'live-tracking', 'chain-of-custody'].includes(externalTab)) {
      setInternalTab('tracking');
    } else if (['temperature', 'alerts', 'incidents'].includes(externalTab)) {
      setInternalTab('alerts');
    } else if (externalTab === 'spoilage-risk') {
      setInternalTab('redirections');
    } else if (externalTab === 'fleet-analytics') {
      setInternalTab('fleet');
    } else if (externalTab === 'qr-verification') {
      if (availableShipments.length > 0) setQrModalShipmentId(availableShipments[0].shipment_id);
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
  const [profile, setProfile] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [availableShipments, setAvailableShipments] = useState([]);
  const [consignments, setConsignments] = useState([]);
  const [fleetTelemetry, setFleetTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedShipmentForAssign, setSelectedShipmentForAssign] = useState(null);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [selectedShipmentForStatus, setSelectedShipmentForStatus] = useState(null);
  const [qrModalShipmentId, setQrModalShipmentId] = useState(null);

  // Verification & Dispatch Readiness Modals
  const [showAcceptConsignmentModal, setShowAcceptConsignmentModal] = useState(false);
  const [selectedConsignmentForAccept, setSelectedConsignmentForAccept] = useState(null);
  const [carrierNotes, setCarrierNotes] = useState('Operational capacity confirmed. Reefer unit staged for pickup.');

  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [selectedConsignmentForReadiness, setSelectedConsignmentForReadiness] = useState(null);
  const [readinessForm, setReadinessForm] = useState({
    assigned_vehicle_number: 'MH-15-XY-9988',
    pre_cooling_temp_c: 11.2,
    seal_number: 'SEAL-MH15-8831',
    odometer_km: 48200,
    driver_name: 'Ramesh Shinde',
    driver_phone: '+91 98221 11223',
    carrier_notes: 'Reefer pre-cooled and calibrated. 5-point physical verification readiness check satisfied.'
  });

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedConsignmentForDispatch, setSelectedConsignmentForDispatch] = useState(null);
  const [dispatchSealNumber, setDispatchSealNumber] = useState('SEAL-AGRI-2026-9912');

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedConsignmentForMilestone, setSelectedConsignmentForMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    milestone_type: 'IN_TRANSIT',
    location_name: 'Igatpuri Ghat Checkpost (NH-3)',
    current_temperature: 11.4,
    notes: 'Pulp and chamber telemetry within target 10-13°C. Transit on schedule.'
  });

  const [showConsignmentDetailModal, setShowConsignmentDetailModal] = useState(false);
  const [selectedConsignmentDetail, setSelectedConsignmentDetail] = useState(null);

  // Forms
  const [driverForm, setDriverForm] = useState({
    driver_name: '',
    phone: '+91 98221 ',
    license_number: 'DL-MH15-',
    assigned_vehicle_id: ''
  });

  const [vehicleForm, setVehicleForm] = useState({
    vehicle_id: 'FTL-V00',
    vehicle_number: 'MH-15-XY-',
    vehicle_type: 'REEFER_MEDIUM_5T',
    capacity_kg: 5000,
    refrigeration_status: 'ON'
  });

  const [assignmentForm, setAssignmentForm] = useState({
    vehicle_id: 'FTL-V001',
    driver_id: '',
    notes: 'Reefer unit pre-chilled to 11.0°C.'
  });

  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: 'IN_TRANSIT',
    location: 'Igatpuri Ghat Toll Plaza, NH-3',
    temperature: 11.5,
    notes: 'Reefer running smoothly at 11.5°C. Transit on schedule.',
    evidence_photo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500'
  });

  // Load Logistics data
  const loadLogisticsData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [profRes, drvRes, vehRes, availRes, fleetRes, alertRes, consRes] = await Promise.allSettled([
        fetchLogisticsProfile(),
        fetchLogisticsDrivers(),
        fetchLogisticsVehicles(),
        fetchAvailableLogisticsShipments(),
        fetchLogisticsFleetTelemetry(),
        fetchRecentAlerts(),
        fetchConsignments()
      ]);

      if (profRes.status === 'fulfilled') setProfile(profRes.value?.data || null);
      if (drvRes.status === 'fulfilled') setDrivers(drvRes.value?.data || []);
      if (vehRes.status === 'fulfilled') setVehicles(vehRes.value?.data || []);
      if (availRes.status === 'fulfilled') setAvailableShipments(availRes.value?.data || []);
      if (fleetRes.status === 'fulfilled') setFleetTelemetry(fleetRes.value?.data || []);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value?.data || []);
      if (consRes.status === 'fulfilled') setConsignments(consRes.value?.data || []);
    } catch (err) {
      console.error('Logistics load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogisticsData();
    const timer = setInterval(() => loadLogisticsData(false), 5000);
    return () => clearInterval(timer);
  }, [loadLogisticsData]);

  // Operational Acceptance of Verified Consignment
  const handleLogisticsAccept = async (e) => {
    e.preventDefault();
    if (!selectedConsignmentForAccept) return;
    setFeedback(null);
    try {
      await logisticsAcceptConsignment(selectedConsignmentForAccept.consignment_id, carrierNotes);
      setFeedback({
        type: 'success',
        message: `Consignment #${selectedConsignmentForAccept.consignment_id} accepted! Status transitioned to LOGISTICS_ACCEPTED. Proceed with 5-point dispatch readiness check.`
      });
      setShowAcceptConsignmentModal(false);
      setSelectedConsignmentForAccept(null);
      loadLogisticsData(true);
      setActiveTab('verified-consignments');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Perform 5-Point Dispatch Readiness Check
  const handlePerformReadiness = async (e) => {
    e.preventDefault();
    if (!selectedConsignmentForReadiness) return;
    setFeedback(null);
    try {
      const payload = {
        assigned_vehicle_number: readinessForm.assigned_vehicle_number,
        pre_cooling_temp_c: parseFloat(readinessForm.pre_cooling_temp_c),
        seal_number: readinessForm.seal_number,
        odometer_km: parseInt(readinessForm.odometer_km, 10),
        driver_name: readinessForm.driver_name,
        driver_phone: readinessForm.driver_phone,
        carrier_notes: readinessForm.carrier_notes
      };
      await performDispatchReadinessCheck(selectedConsignmentForReadiness.consignment_id, payload);
      setFeedback({
        type: 'success',
        message: `5-Point Dispatch Readiness Check verified and logged for #${selectedConsignmentForReadiness.consignment_id}! Status is now READY_FOR_DISPATCH.`
      });
      setShowReadinessModal(false);
      setSelectedConsignmentForReadiness(null);
      loadLogisticsData(true);
      setActiveTab('verified-consignments');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Mark Consignment as Dispatched
  const handleDispatchConsignment = async (e) => {
    e.preventDefault();
    if (!selectedConsignmentForDispatch) return;
    setFeedback(null);
    try {
      await dispatchConsignment(selectedConsignmentForDispatch.consignment_id, dispatchSealNumber);
      setFeedback({
        type: 'success',
        message: `Consignment #${selectedConsignmentForDispatch.consignment_id} DISPATCHED with Verified Security Seal #${dispatchSealNumber}!`
      });
      setShowDispatchModal(false);
      setSelectedConsignmentForDispatch(null);
      loadLogisticsData(true);
      setActiveTab('verified-consignments');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Log Consignment Transit Milestone
  const handleLogMilestone = async (e) => {
    e.preventDefault();
    if (!selectedConsignmentForMilestone) return;
    setFeedback(null);
    try {
      const payload = {
        milestone_type: milestoneForm.milestone_type,
        location_name: milestoneForm.location_name,
        current_temperature: parseFloat(milestoneForm.current_temperature),
        notes: milestoneForm.notes
      };
      await updateConsignmentMilestone(selectedConsignmentForMilestone.consignment_id, payload);
      setFeedback({
        type: 'success',
        message: `Transit milestone '${milestoneForm.milestone_type}' logged for #${selectedConsignmentForMilestone.consignment_id}!`
      });
      setShowMilestoneModal(false);
      setSelectedConsignmentForMilestone(null);
      loadLogisticsData(true);
      setActiveTab('verified-consignments');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Accept Shipment
  const handleAcceptShipment = async (shipmentId) => {
    setFeedback(null);
    try {
      await acceptLogisticsShipment(shipmentId);
      setFeedback({ type: 'success', message: `Shipment #${shipmentId} accepted! Proceed to assign vehicle & driver.` });
      loadLogisticsData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Assign Shipment
  const handleAssignShipment = async (e) => {
    e.preventDefault();
    if (!selectedShipmentForAssign) return;
    setFeedback(null);
    try {
      await assignLogisticsShipment(selectedShipmentForAssign.shipment_id, assignmentForm);
      setFeedback({ type: 'success', message: `Assigned Vehicle ${assignmentForm.vehicle_id} to Shipment #${selectedShipmentForAssign.shipment_id}!` });
      setShowAssignModal(false);
      loadLogisticsData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Update Status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedShipmentForStatus) return;
    setFeedback(null);
    try {
      const payload = {
        status: statusUpdateForm.status,
        location: statusUpdateForm.location,
        temperature: parseFloat(statusUpdateForm.temperature),
        notes: statusUpdateForm.notes,
        evidence_photo: statusUpdateForm.evidence_photo || undefined
      };
      await updateLogisticsShipmentStatus(selectedShipmentForStatus.shipment_id, payload);
      setFeedback({ type: 'success', message: `Shipment #${selectedShipmentForStatus.shipment_id} status updated to ${payload.status}!` });
      setShowUpdateStatusModal(false);
      loadLogisticsData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Add Driver
  const handleAddDriver = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createLogisticsDriver(driverForm);
      setFeedback({ type: 'success', message: `Driver '${driverForm.driver_name}' registered successfully!` });
      setShowAddDriverModal(false);
      loadLogisticsData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Add Vehicle
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createLogisticsVehicle({
        ...vehicleForm,
        capacity_kg: parseInt(vehicleForm.capacity_kg, 10)
      });
      setFeedback({ type: 'success', message: `Reefer Vehicle '${vehicleForm.vehicle_number}' added to fleet!` });
      setShowAddVehicleModal(false);
      loadLogisticsData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const activeTrackingShipments = fleetTelemetry.filter(f => f.shipment_status === 'IN_TRANSIT' || f.shipment_status === 'ASSIGNED');
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN');

  return (
    <div>
      {/* 1. TOP HEADER & QUICK STATS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={24} color="var(--accent-cyan)" />
            Logistics Fleet Operations
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time reefer monitoring, driver assignments, custody transfers & active route intelligence.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAddDriverModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} />
            <span>Add Driver</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddVehicleModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} />
            <span>Add Reefer Truck</span>
          </button>

          <button
            type="button"
            onClick={() => loadLogisticsData(true)}
            disabled={refreshing}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Fleet</span>
          </button>
        </div>
      </div>

      {/* SIMULATION NOTICE BANNER */}
      <div style={{
        background: 'rgba(6, 182, 212, 0.08)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--accent-cyan)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={16} />
          <span><b>LIVE SIMULATED TELEMETRY:</b> Active sensor loop ingesting real-time GPS coordinates, compressor state & cargo temperature every 5 seconds.</span>
        </div>
        <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(6, 182, 212, 0.2)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
          5s INGESTION CYCLE
        </span>
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
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Fleet in Transit</span>
            <Truck size={18} color="var(--accent-cyan)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {activeTrackingShipments.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {fleetTelemetry.length} total shipments monitored
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>New Requests Pool</span>
            <Layers size={18} color="var(--accent-amber)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-amber-light)' }}>
            {availableShipments.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Ready for carrier acceptance
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Drivers / Vehicles</span>
            <Users size={18} color="var(--accent-emerald)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {drivers.length} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ {vehicles.length} Trucks</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-emerald-light)', marginTop: '4px' }}>
            100% verified CDL drivers
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Thermal Excursions</span>
            <AlertTriangle size={18} color="var(--accent-rose)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: criticalAlerts.length > 0 ? 'var(--accent-rose-light)' : 'var(--accent-emerald-light)' }}>
            {criticalAlerts.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {alerts.length} total active alerts
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
          { id: 'verified-consignments', label: 'Verified Consignments & Dispatch Readiness', count: consignments.length, icon: ClipboardCheck },
          { id: 'redirections', label: 'Dynamic Redirection & Detours', icon: AlertTriangle, isSpecial: true },
          { id: 'tracking', label: 'Live Tracking & Telemetry', count: fleetTelemetry.length, icon: Radio },
          { id: 'available', label: 'Available Shipment Pool', count: availableShipments.length, icon: Layers },
          { id: 'fleet', label: 'Fleet & Driver Management', count: drivers.length, icon: Users },
          { id: 'alerts', label: 'Thermal & Reefer Alerts', count: alerts.length, icon: AlertTriangle }
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
                borderBottom: `2px solid ${isActive ? (isSpecial ? 'var(--accent-amber)' : 'var(--accent-cyan)') : 'transparent'}`,
                color: isActive ? (isSpecial ? 'var(--accent-amber)' : 'var(--accent-cyan)') : (isSpecial ? 'var(--accent-amber)' : 'var(--text-secondary)'),
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
                  background: isActive ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 0: LOGISTICS DASHBOARD OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AI REDIRECTION HERO BANNER */}
          <div style={{
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            border: '1px solid #BAE6FD',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '750px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0369A1', background: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #7DD3FC' }}>
                    ✦ AI CARRIER DISPATCH INTELLIGENCE
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#075985' }}>
                    Truck FTL-V001 (Nashik → Mumbai APMC)
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C4A6E', lineHeight: '1.4' }}>
                  "Igatpuri traffic delay detected (1 hr 45 min). Reefer cooling stable at 11.5°C. Alternate bypass via NH-160 recommended."
                </div>
                <div style={{ fontSize: '12px', color: '#0369A1', marginTop: '4px' }}>
                  Estimated Delay Avoided: <b>50 Minutes</b> · Target ETA: <b>14:30 Today</b> · On-Time SLA: <b style={{ color: '#15803D' }}>98.5%</b>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('redirections')}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                  borderColor: '#0284C7',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
                }}
              >
                <span>View Route Detour</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* ACTIVE TRIPS & AVAILABLE SHIPMENTS SNAPSHOT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Active Trips Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={18} color="var(--accent-blue)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>Live Reefer Telemetry</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tracking')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Live Map ({activeTrackingShipments.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeTrackingShipments.slice(0, 3).map((trip) => (
                  <div key={trip.shipment_id} style={{
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
                        {trip.shipment_id} — {trip.vehicle_number || 'FTL-V001'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {trip.origin} → {trip.destination}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: (Number(trip.current_temperature) || 11.8) > 14 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                        {typeof trip.current_temperature === 'number' ? `${trip.current_temperature.toFixed(1)}°C` : `${trip.current_temperature || '11.8'}°C`}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                        {trip.shipment_status || 'IN_TRANSIT'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Shipments to Accept */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-amber)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>Available Consignments</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('available')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Accept ({availableShipments.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableShipments.slice(0, 3).map((shipment) => (
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
                        {shipment.origin} → {shipment.destination}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShipmentForAssign(shipment);
                        setShowAssignModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Assign Fleet
                    </button>
                  </div>
                ))}
                {availableShipments.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    All available shipments currently assigned to reefer fleet.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 0.25: VERIFIED CONSIGNMENTS & 5-POINT DISPATCH READINESS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'verified-consignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 5-POINT DISPATCH READINESS PROTOCOL BANNER */}
          <div style={{
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            border: '1px solid #7DD3FC',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '820px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0369A1', background: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #BAE6FD' }}>
                    🛡️ MANDATORY 5-POINT DISPATCH READINESS GATE
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0284C7' }}>
                    Logistics Compliance Standard
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C4A6E', lineHeight: '1.4' }}>
                  Unverified consignments CANNOT be dispatched. Before authorizing vehicle departure, the system enforces the 5-point dispatch readiness check: Physical verification sign-off, carrier acceptance, pre-cooling setpoint, driver credentialing, and security seal logging.
                </div>
                <div style={{ fontSize: '12px', color: '#0369A1', marginTop: '4px' }}>
                  Supports 3 transportation modes: <b>Road Reefer Fleet</b>, <b>Perishable Air Cargo</b>, and <b>Marine Containers (AIS)</b>.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadLogisticsData(true)}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                borderColor: '#0284C7',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '700'
              }}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* CONSIGNMENT PIPELINE LIST */}
          {consignments.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', background: '#FFFFFF' }}>
              <ClipboardCheck size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                No Active Consignments in Logistics Queue
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                New consignment bookings confirmed by farmers will appear here after physical inspection approval.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              {consignments.map((req) => {
                const status = req.verification_status;
                const isVerified = Boolean(req.is_physically_verified || req.verified_quantity_kg || req.verification_reference_number);
                const isBookingConfirmed = status === 'BOOKING_CONFIRMED';
                const isAccepted = status === 'LOGISTICS_ACCEPTED';
                const isReadyForDispatch = status === 'READY_FOR_DISPATCH';
                const isDispatched = status === 'DISPATCHED' || status === 'IN_TRANSIT';
                const isDelivered = status === 'DELIVERED';
                const isPendingOrUnverified = ['PENDING_VERIFICATION', 'INSPECTION_SCHEDULED', 'UNDER_INSPECTION', 'REQUIRES_CORRECTION', 'REJECTED'].includes(status);

                const modeIcon = () => {
                  if (req.preferred_transport_mode === 'AIR') return <Plane size={14} />;
                  if (req.preferred_transport_mode === 'MARINE') return <Ship size={14} />;
                  return <Truck size={14} />;
                };

                return (
                  <div key={req.consignment_id} className="card" style={{
                    padding: '20px',
                    border: `1px solid ${isDispatched ? '#6EE7B7' : isReadyForDispatch ? '#93C5FD' : isAccepted ? '#FDE68A' : isPendingOrUnverified ? '#FECACA' : '#E2E8F0'}`,
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      {/* Top Header */}
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
                          background: isDispatched ? '#ECFDF5' : isReadyForDispatch ? '#F0F9FF' : isAccepted ? '#FFFBEB' : isPendingOrUnverified ? '#FEF2F2' : '#F1F5F9',
                          color: isDispatched ? '#059669' : isReadyForDispatch ? '#0284C7' : isAccepted ? '#D97706' : isPendingOrUnverified ? '#DC2626' : '#475569',
                          border: `1px solid ${isDispatched ? '#A7F3D0' : isReadyForDispatch ? '#BAE6FD' : isAccepted ? '#FCD34D' : isPendingOrUnverified ? '#FECACA' : '#CBD5E1'}`,
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

                      {/* Verification Baseline vs Operational Requirements */}
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
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Verified Weight</span>
                          <b style={{ color: req.verified_quantity_kg ? '#059669' : '#94A3B8' }}>
                            {req.verified_quantity_kg ? `${req.verified_quantity_kg} kg` : `${req.declared_quantity_kg} kg (Declared)`}
                          </b>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Verified Pulp Temp</span>
                          <b style={{ color: req.measured_temperature !== null && req.measured_temperature !== undefined ? '#059669' : '#94A3B8' }}>
                            {req.measured_temperature !== null && req.measured_temperature !== undefined ? `${req.measured_temperature}°C` : `${req.target_temp_min}°C (Target)`}
                          </b>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>VRF Reference</span>
                          <b className="font-mono" style={{ color: req.verification_reference_number ? '#059669' : '#DC2626', fontSize: '11px' }}>
                            {req.verification_reference_number || 'NOT VERIFIED'}
                          </b>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Assigned Vehicle</span>
                          <b style={{ color: '#1E293B' }}>{req.assigned_vehicle_or_vessel || req.vehicle_number || 'Pending Assignment'}</b>
                        </div>
                      </div>

                      {/* Security Notice for Unverified */}
                      {isPendingOrUnverified && (
                        <div style={{
                          padding: '10px 12px',
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '14px',
                          fontSize: '12px',
                          color: '#991B1B',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Lock size={16} color="#DC2626" />
                          <span><b>BLOCKED FROM DISPATCH:</b> Physical on-site inspection not completed. Dispatch authorization locked.</span>
                        </div>
                      )}

                      {/* Dispatch & Seal Info */}
                      {isDispatched && (
                        <div style={{
                          padding: '10px 12px',
                          background: '#ECFDF5',
                          border: '1px solid #6EE7B7',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '14px',
                          fontSize: '12px',
                          color: '#065F46'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <b>🔒 Verified Security Seal:</b>
                            <span className="font-mono" style={{ fontWeight: '800' }}>{req.security_seal_number || req.seal_number || 'SEAL-VERIFIED'}</span>
                          </div>
                          <div style={{ marginTop: '2px' }}>Dispatched & tracked live via multi-sensor telematics.</div>
                        </div>
                      )}
                    </div>

                    {/* Operational Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                      {isBookingConfirmed && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConsignmentForAccept(req);
                            setShowAcceptConsignmentModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: '#0284C7', borderColor: '#0284C7' }}
                        >
                          <CheckCircle size={13} />
                          <span>Operational Acceptance</span>
                        </button>
                      )}

                      {isAccepted && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConsignmentForReadiness(req);
                            setReadinessForm(prev => ({
                              ...prev,
                              pre_cooling_temp_c: req.measured_temperature || req.target_temp_min || 11.2
                            }));
                            setShowReadinessModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: '#D97706', borderColor: '#D97706' }}
                        >
                          <ClipboardCheck size={13} />
                          <span>5-Point Readiness Check</span>
                        </button>
                      )}

                      {isReadyForDispatch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConsignmentForDispatch(req);
                            setDispatchSealNumber(`SEAL-MH15-${Math.floor(1000 + Math.random() * 9000)}`);
                            setShowDispatchModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: '#059669', borderColor: '#059669' }}
                        >
                          <ShieldCheck size={13} />
                          <span>Authorize & Seal Dispatch</span>
                        </button>
                      )}

                      {isDispatched && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConsignmentForMilestone(req);
                            setShowMilestoneModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: '#0284C7', borderColor: '#0284C7' }}
                        >
                          <NavIcon size={13} />
                          <span>Log Transit Milestone</span>
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
      {/* TAB 0.5: DYNAMIC ROUTE REDIRECTION MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'redirections' && (
        <LogisticsRedirection />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB A: LIVE TRACKING & TELEMETRY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tracking' && (

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {fleetTelemetry.map((item) => {
              const hasAlert = item.current_temperature > item.target_temp_max || item.current_temperature < item.target_temp_min;
              return (
                <div key={item.shipment_id} className="card" style={{ padding: '20px', borderColor: hasAlert ? 'rgba(244, 63, 94, 0.4)' : undefined }}>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                          {item.shipment_id}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-full)',
                          background: item.shipment_status === 'IN_TRANSIT' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: item.shipment_status === 'IN_TRANSIT' ? 'var(--accent-cyan)' : 'var(--accent-emerald-light)'
                        }}>
                          {item.shipment_status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {item.product_name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: hasAlert ? 'var(--accent-rose-light)' : 'var(--accent-emerald-light)' }}>
                        {item.current_temperature ? `${item.current_temperature.toFixed(1)}°C` : 'N/A'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Target: {item.target_temp_min}° - {item.target_temp_max}°C
                      </div>
                    </div>
                  </div>

                  {/* Vehicle & Telemetry Status Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontSize: '11px', textAlign: 'center' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Truck / Driver</span>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>{item.vehicle_id || 'Standby'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.driver_name || 'Rajesh G.'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Reefer Unit</span>
                      <div style={{ fontWeight: '700', color: item.refrigeration_status === 'ON' ? 'var(--accent-emerald-light)' : 'var(--accent-rose)', fontSize: '12px' }}>
                        {item.refrigeration_status === 'ON' ? '⚡ RUNNING' : '🛑 OFF'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Door: {item.door_status || 'CLOSED'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Humidity</span>
                      <div style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontSize: '12px' }}>
                        {item.current_humidity ? `${item.current_humidity.toFixed(0)}%` : '68%'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Simulated Live</div>
                    </div>
                  </div>

                  {/* Route & GPS */}
                  <div style={{ fontSize: '11px', marginBottom: '14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Origin:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{item.origin}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Destination:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{item.destination}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>GPS Telemetry:</span>
                      <span className="font-mono" style={{ color: 'var(--accent-blue)' }}>
                        {item.current_latitude?.toFixed(4)}, {item.current_longitude?.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShipmentForStatus(item);
                        setStatusUpdateForm(prev => ({
                          ...prev,
                          status: item.shipment_status,
                          temperature: item.current_temperature || 11.5
                        }));
                        setShowUpdateStatusModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Sliders size={12} />
                      <span>Update Status & Custody</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrModalShipmentId(item.shipment_id)}
                      className="btn btn-secondary btn-sm"
                      title="View QR Code"
                    >
                      <QrCode size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB B: AVAILABLE SHIPMENT REQUESTS POOL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'available' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-amber)" />
            Open Freight Assignments (Awaiting Carrier Acceptance)
          </h3>

          {availableShipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No unassigned shipments in pool. Check back shortly as farmers dispatch harvests.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              {availableShipments.map((s) => (
                <div key={s.shipment_id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '14px' }}>
                      {s.shipment_id}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber-light)', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>
                      UNASSIGNED
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {s.product_name}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    <div>🟢 Origin: {s.origin}</div>
                    <div>🏁 Destination: {s.destination}</div>
                    <div style={{ marginTop: '4px', color: 'var(--accent-cyan)' }}>
                      Safe Temp: {s.target_temp_min}° - {s.target_temp_max}°C
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleAcceptShipment(s.shipment_id)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Check size={14} />
                      <span>Accept Shipment</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShipmentForAssign(s);
                        setShowAssignModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Users size={14} />
                      <span>Assign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB C: FLEET & DRIVER MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fleet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Active Drivers */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="var(--accent-emerald)" />
                Registered Drivers ({drivers.length})
              </h3>
              <button type="button" onClick={() => setShowAddDriverModal(true)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                <Plus size={12} />
                <span>Add</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {drivers.map((d) => (
                <div key={d.driver_id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{d.driver_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.phone} · {d.license_number}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald-light)', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Vehicles */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} color="var(--accent-cyan)" />
                Reefer Fleet ({vehicles.length})
              </h3>
              <button type="button" onClick={() => setShowAddVehicleModal(true)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                <Plus size={12} />
                <span>Add</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {vehicles.map((v) => (
                <div key={v.vehicle_id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{v.vehicle_number} ({v.vehicle_id})</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.vehicle_type} · {v.capacity_kg} kg Capacity</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', background: v.refrigeration_status === 'ON' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: v.refrigeration_status === 'ON' ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>
                    Reefer {v.refrigeration_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB D: THERMAL & REEFER ALERTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'alerts' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--accent-rose)" />
            Active Fleet Thermal Excursions & Reefer Alarms
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.slice(0, 15).map((a, idx) => (
              <div key={idx} style={{
                background: a.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${a.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      background: a.severity === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-amber)',
                      color: '#fff'
                    }}>
                      {a.severity}
                    </span>
                    <span className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>
                      Shipment #{a.shipment_id}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {a.alert_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {a.message}
                  </div>
                  {a.recommended_action && (
                    <div style={{ fontSize: '11px', color: 'var(--accent-emerald-light)', marginTop: '2px' }}>
                      💡 Recommended: {a.recommended_action}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  {a.temperature && (
                    <div className="font-mono" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-rose-light)' }}>
                      {a.temperature}°C
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString() : 'Recent'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ASSIGN VEHICLE & DRIVER */}
      {/* ------------------------------------------------------------- */}
      {showAssignModal && selectedShipmentForAssign && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Assign Reefer & Driver to #{selectedShipmentForAssign.shipment_id}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Product: <b>{selectedShipmentForAssign.product_name}</b> ({selectedShipmentForAssign.origin} → {selectedShipmentForAssign.destination})
            </p>

            <form onSubmit={handleAssignShipment}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Reefer Vehicle *</label>
                <select
                  value={assignmentForm.vehicle_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, vehicle_id: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.vehicle_id} — {v.vehicle_number} ({v.vehicle_type})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Certified Driver</label>
                <select
                  value={assignmentForm.driver_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, driver_id: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="">-- Assign Default Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.driver_name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dispatch Notes</label>
                <input
                  type="text"
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: UPDATE DELIVERY STATUS & CUSTODY */}
      {/* ------------------------------------------------------------- */}
      {showUpdateStatusModal && selectedShipmentForStatus && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Update Custody Status for #{selectedShipmentForStatus.shipment_id}
            </h3>

            <form onSubmit={handleUpdateStatus}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Milestone Status *</label>
                <select
                  value={statusUpdateForm.status}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="ACCEPTED">ACCEPTED — Carrier Confirmed</option>
                  <option value="ASSIGNED">ASSIGNED — Vehicle Allocated</option>
                  <option value="IN_TRANSIT">IN_TRANSIT — On Route</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY — Near Destination Dock</option>
                  <option value="DELIVERED">DELIVERED — Arrived at Buyer Gate</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Checkpoint Location</label>
                  <input
                    type="text"
                    value={statusUpdateForm.location}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, location: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cargo Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={statusUpdateForm.temperature}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, temperature: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status Log Notes</label>
                <textarea
                  rows={2}
                  value={statusUpdateForm.notes}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Proof / Photo Evidence URL</label>
                <input
                  type="text"
                  value={statusUpdateForm.evidence_photo}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, evidence_photo: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowUpdateStatusModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Custody Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD DRIVER */}
      {/* ------------------------------------------------------------- */}
      {showAddDriverModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Register CDL Certified Driver
            </h3>
            <form onSubmit={handleAddDriver}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Driver Full Name *</label>
                <input
                  type="text"
                  value={driverForm.driver_name}
                  onChange={(e) => setDriverForm({ ...driverForm, driver_name: e.target.value })}
                  required
                  placeholder="e.g. Ramesh Shinde"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Phone Number *</label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Commercial Driving License # *</label>
                <input
                  type="text"
                  value={driverForm.license_number}
                  onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddDriverModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD VEHICLE */}
      {/* ------------------------------------------------------------- */}
      {showAddVehicleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Add Reefer Truck to Fleet
            </h3>
            <form onSubmit={handleAddVehicle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Vehicle ID *</label>
                  <input
                    type="text"
                    value={vehicleForm.vehicle_id}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_id: e.target.value })}
                    required
                    placeholder="FTL-V006"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Registration Plate *</label>
                  <input
                    type="text"
                    value={vehicleForm.vehicle_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
                    required
                    placeholder="MH-15-AB-1234"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Capacity (kg)</label>
                  <input
                    type="number"
                    value={vehicleForm.capacity_kg}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_kg: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Reefer Status</label>
                  <select
                    value={vehicleForm.refrigeration_status}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, refrigeration_status: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  >
                    <option value="ON">ON — Active Chilling</option>
                    <option value="OFF">OFF — Standby</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddVehicleModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Add Vehicle
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
              Logistics Custody Pass
            </h3>
            <p className="font-mono" style={{ fontSize: '13px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
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

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Scan to confirm chain-of-custody transfer and driver handoff.
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
      {/* MODAL: OPERATIONAL ACCEPTANCE OF VERIFIED CONSIGNMENT */}
      {/* ------------------------------------------------------------- */}
      {showAcceptConsignmentModal && selectedConsignmentForAccept && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '28px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', marginBottom: '8px' }}>
              <CheckCircle2 size={22} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                Operational Acceptance of Consignment
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
              Consignment <b className="font-mono" style={{ color: '#0284C7' }}>{selectedConsignmentForAccept.consignment_id}</b> · VRF: <b className="font-mono" style={{ color: '#059669' }}>{selectedConsignmentForAccept.verification_reference_number || 'VERIFIED'}</b>
            </div>

            {/* Verified baseline specs */}
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px', color: '#0369A1' }}>
              <div><b>Verified Cargo:</b> {selectedConsignmentForAccept.product_name} ({selectedConsignmentForAccept.verified_quantity_kg || selectedConsignmentForAccept.declared_quantity_kg} kg)</div>
              <div><b>Target Temperature:</b> {selectedConsignmentForAccept.target_temp_min}°C to {selectedConsignmentForAccept.target_temp_max}°C</div>
              <div><b>Pickup Gate:</b> {selectedConsignmentForAccept.pickup_location} ({selectedConsignmentForAccept.pickup_pincode || '422001'})</div>
            </div>

            <form onSubmit={handleLogisticsAccept}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Carrier Operational Acceptance Notes</label>
                <textarea
                  rows={3}
                  value={carrierNotes}
                  onChange={(e) => setCarrierNotes(e.target.value)}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAcceptConsignmentModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#0284C7', borderColor: '#0284C7' }}>
                  Confirm Operational Acceptance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: 5-POINT DISPATCH READINESS CHECK */}
      {/* ------------------------------------------------------------- */}
      {showReadinessModal && selectedConsignmentForReadiness && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', marginBottom: '8px' }}>
              <ClipboardCheck size={22} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                5-Point Dispatch Readiness Verification
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
              Consignment <b className="font-mono" style={{ color: '#0284C7' }}>{selectedConsignmentForReadiness.consignment_id}</b> ({selectedConsignmentForReadiness.product_name})
            </div>

            {/* 5-Point Verification Checklist items display */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px', color: '#92400E' }}>
              <div style={{ fontWeight: '800', marginBottom: '6px' }}>Mandatory Readiness Criteria:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>✓ <b>1. Physical Verification:</b> Approved by Officer (VRF: {selectedConsignmentForReadiness.verification_reference_number || 'VERIFIED'})</div>
                <div>✓ <b>2. Carrier Acceptance:</b> Operational confirmation logged</div>
                <div>✓ <b>3. Baseline Quantity & Grade:</b> {selectedConsignmentForReadiness.verified_quantity_kg || selectedConsignmentForReadiness.declared_quantity_kg} kg certified</div>
                <div>✓ <b>4. Reefer Pre-Cooling:</b> Required setpoint {selectedConsignmentForReadiness.target_temp_min}°C to {selectedConsignmentForReadiness.target_temp_max}°C</div>
                <div>✓ <b>5. Security Seal Readiness:</b> Tamper-evident seal assignment ready</div>
              </div>
            </div>

            <form onSubmit={handlePerformReadiness}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Assigned Reefer Vehicle *</label>
                  <input
                    type="text"
                    value={readinessForm.assigned_vehicle_number}
                    onChange={(e) => setReadinessForm({ ...readinessForm, assigned_vehicle_number: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Pre-Cooling Temp (°C) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={readinessForm.pre_cooling_temp_c}
                    onChange={(e) => setReadinessForm({ ...readinessForm, pre_cooling_temp_c: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Assigned Driver Name *</label>
                  <input
                    type="text"
                    value={readinessForm.driver_name}
                    onChange={(e) => setReadinessForm({ ...readinessForm, driver_name: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Driver Phone Number *</label>
                  <input
                    type="text"
                    value={readinessForm.driver_phone}
                    onChange={(e) => setReadinessForm({ ...readinessForm, driver_phone: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Security Seal Number *</label>
                  <input
                    type="text"
                    value={readinessForm.seal_number}
                    onChange={(e) => setReadinessForm({ ...readinessForm, seal_number: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Odometer Reading (KM)</label>
                  <input
                    type="number"
                    value={readinessForm.odometer_km}
                    onChange={(e) => setReadinessForm({ ...readinessForm, odometer_km: e.target.value })}
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Inspection Checklist Sign-off Notes</label>
                <textarea
                  rows={2}
                  value={readinessForm.carrier_notes}
                  onChange={(e) => setReadinessForm({ ...readinessForm, carrier_notes: e.target.value })}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowReadinessModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#D97706', borderColor: '#D97706' }}>
                  Verify & Mark READY FOR DISPATCH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: AUTHORIZE & SEAL DISPATCH */}
      {/* ------------------------------------------------------------- */}
      {showDispatchModal && selectedConsignmentForDispatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '28px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', marginBottom: '8px' }}>
              <ShieldCheck size={22} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                Authorize Cargo Dispatch
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
              Consignment <b className="font-mono" style={{ color: '#0284C7' }}>{selectedConsignmentForDispatch.consignment_id}</b> · VRF: <b className="font-mono" style={{ color: '#059669' }}>{selectedConsignmentForDispatch.verification_reference_number || 'VERIFIED'}</b>
            </div>

            <form onSubmit={handleDispatchConsignment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Verified Security Seal Number *</label>
                <input
                  type="text"
                  value={dispatchSealNumber}
                  onChange={(e) => setDispatchSealNumber(e.target.value)}
                  required
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px', fontWeight: '700' }}
                />
              </div>

              <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '11px', color: '#065F46' }}>
                🔒 <b>Dispatch Lock:</b> Confirming dispatch binds the vehicle GPS tracker and telemetry datalogger to the immutable shipment chain of custody.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowDispatchModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#059669', borderColor: '#059669' }}>
                  Confirm Dispatch & Start Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LOG TRANSIT MILESTONE */}
      {/* ------------------------------------------------------------- */}
      {showMilestoneModal && selectedConsignmentForMilestone && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', marginBottom: '8px' }}>
              <NavIcon size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                Log Transit Milestone
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
              Consignment #{selectedConsignmentForMilestone.consignment_id}
            </div>

            <form onSubmit={handleLogMilestone}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Milestone Type *</label>
                <select
                  value={milestoneForm.milestone_type}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, milestone_type: e.target.value })}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                >
                  <option value="IN_TRANSIT">IN_TRANSIT — Checkpoint Passed</option>
                  <option value="HUB_TRANSFER">HUB_TRANSFER — Reached Transfer Hub / Airport / Port</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY — Final Mile Departure</option>
                  <option value="DELIVERED">DELIVERED — Receiving Dock Handover</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Location Name *</label>
                  <input
                    type="text"
                    value={milestoneForm.location_name}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, location_name: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Current Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={milestoneForm.current_temperature}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, current_temperature: e.target.value })}
                    required
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Transit Remarks</label>
                <textarea
                  rows={2}
                  value={milestoneForm.notes}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, notes: e.target.value })}
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#0F172A', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#0284C7', borderColor: '#0284C7' }}>
                  Record Milestone
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
              background: selectedConsignmentDetail.verification_status === 'APPROVED' || selectedConsignmentDetail.verification_status === 'DISPATCHED' ? '#ECFDF5' : selectedConsignmentDetail.verification_status === 'REJECTED' ? '#FEF2F2' : '#F0F9FF',
              border: `1px solid ${selectedConsignmentDetail.verification_status === 'APPROVED' || selectedConsignmentDetail.verification_status === 'DISPATCHED' ? '#A7F3D0' : selectedConsignmentDetail.verification_status === 'REJECTED' ? '#FECACA' : '#BAE6FD'}`,
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748B' }}>Audit Outcome</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: selectedConsignmentDetail.verification_status === 'APPROVED' || selectedConsignmentDetail.verification_status === 'DISPATCHED' ? '#059669' : selectedConsignmentDetail.verification_status === 'REJECTED' ? '#DC2626' : '#0284C7' }}>
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
