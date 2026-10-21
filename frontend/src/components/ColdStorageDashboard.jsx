import React, { useState, useEffect, useCallback } from 'react';
import { 
  Warehouse, 
  Layers, 
  Thermometer, 
  Droplets, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Check, 
  X, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  Sliders, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar, 
  PackageCheck,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { 
  fetchColdStorageFacility, 
  fetchColdStorageChambers, 
  createColdStorageChamber, 
  updateColdStorageChamber, 
  fetchColdStorageBookings, 
  actionColdStorageBooking, 
  intakeColdStorageBooking, 
  dispatchColdStorageBooking, 
  fetchColdStorageInventory,
  fetchRecentAlerts
} from '../api';
import ColdStorageEmergencyRescue from './ColdStorageEmergencyRescue';

export default function ColdStorageDashboard({ activeTab: externalTab, onNavigateTab }) {
  const [internalTab, setInternalTab] = useState('dashboard');

  // Sync external tab from role sidebar
  useEffect(() => {
    if (!externalTab || externalTab === 'dashboard') {
      setInternalTab('dashboard');
    } else if (['facility'].includes(externalTab)) {
      setInternalTab('facility');
    } else if (['chambers', 'capacity', 'temperature', 'humidity'].includes(externalTab)) {
      setInternalTab('chambers');
    } else if (['incoming', 'outgoing'].includes(externalTab)) {
      setInternalTab('intake-dispatch');
    } else if (['stored'].includes(externalTab)) {
      setInternalTab('inventory');
    } else if (['bookings'].includes(externalTab)) {
      setInternalTab('bookings');
    } else if (['alerts', 'incidents'].includes(externalTab)) {
      setInternalTab('emergency-rescue');
    } else if (['emergency-rescue'].includes(externalTab)) {
      setInternalTab('emergency-rescue');
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
  const [facility, setFacility] = useState(null);
  const [chambers, setChambers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showAddChamberModal, setShowAddChamberModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedBookingForAction, setSelectedBookingForAction] = useState(null);

  // Forms
  const [chamberForm, setChamberForm] = useState({
    chamber_name: 'Chamber 3 — Controlled Atmosphere',
    capacity_mt: 100.0,
    target_temp_min: 10.0,
    target_temp_max: 13.0,
    current_humidity: 85.0,
    compatible_produce: 'Mango, Pomegranate, Citrus'
  });

  const [intakeForm, setIntakeForm] = useState({
    actual_quantity_mt: 5.0,
    intake_temperature: 11.2,
    intake_quality_grade: 'Grade A (Intact)',
    chamber_id: '',
    notes: 'Pre-cooled at intake dock. Pallets labeled.'
  });

  const [dispatchForm, setDispatchForm] = useState({
    dispatch_quantity_mt: 5.0,
    dispatch_temperature: 11.0,
    dispatch_condition: 'Excellent / Export Ready',
    notes: 'Loaded into reefer truck MH-15-XY-1234.'
  });

  // Load Cold Storage data
  const loadColdStorageData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [facRes, chmRes, bookRes, invRes, alertRes] = await Promise.allSettled([
        fetchColdStorageFacility(),
        fetchColdStorageChambers(),
        fetchColdStorageBookings(),
        fetchColdStorageInventory(),
        fetchRecentAlerts()
      ]);

      if (facRes.status === 'fulfilled') setFacility(facRes.value?.data || null);
      if (chmRes.status === 'fulfilled') setChambers(chmRes.value?.data || []);
      if (bookRes.status === 'fulfilled') setBookings(bookRes.value?.data || []);
      if (invRes.status === 'fulfilled') setInventory(invRes.value?.data || []);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value?.data || []);

      if (chmRes.status === 'fulfilled' && chmRes.value?.data?.length > 0) {
        setIntakeForm(prev => ({ ...prev, chamber_id: chmRes.value.data[0].chamber_id }));
      }
    } catch (err) {
      console.error('Cold storage load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadColdStorageData();
    const timer = setInterval(() => loadColdStorageData(false), 5000);
    return () => clearInterval(timer);
  }, [loadColdStorageData]);

  // Create Chamber
  const handleAddChamber = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        chamber_name: chamberForm.chamber_name,
        capacity_mt: parseFloat(chamberForm.capacity_mt),
        target_temp_min: parseFloat(chamberForm.target_temp_min),
        target_temp_max: parseFloat(chamberForm.target_temp_max),
        current_humidity: parseFloat(chamberForm.current_humidity),
        compatible_produce: chamberForm.compatible_produce.split(',').map(s => s.trim())
      };
      await createColdStorageChamber(payload);
      setFeedback({ type: 'success', message: `Chamber '${chamberForm.chamber_name}' created successfully!` });
      setShowAddChamberModal(false);
      loadColdStorageData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Accept / Reject Booking
  const handleBookingAction = async (bookingId, action) => {
    setFeedback(null);
    try {
      await actionColdStorageBooking(bookingId, {
        action,
        chamber_id: chambers[0]?.chamber_id,
        notes: action === 'ACCEPT' ? 'Reservation accepted. Chamber capacity allocated.' : 'Declined due to chamber temperature incompatibility.'
      });
      setFeedback({ type: 'success', message: `Booking #${bookingId} has been ${action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'}!` });
      loadColdStorageData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Record Intake
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingForAction) return;
    setFeedback(null);
    try {
      const payload = {
        actual_quantity_mt: parseFloat(intakeForm.actual_quantity_mt),
        intake_temperature: parseFloat(intakeForm.intake_temperature),
        intake_quality_grade: intakeForm.intake_quality_grade,
        chamber_id: intakeForm.chamber_id,
        notes: intakeForm.notes
      };
      await intakeColdStorageBooking(selectedBookingForAction.booking_id, payload);
      setFeedback({ type: 'success', message: `Produce intake recorded for Booking #${selectedBookingForAction.booking_id}. Inventory updated!` });
      setShowIntakeModal(false);
      loadColdStorageData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Record Dispatch
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingForAction) return;
    setFeedback(null);
    try {
      const payload = {
        dispatch_quantity_mt: parseFloat(dispatchForm.dispatch_quantity_mt),
        dispatch_temperature: parseFloat(dispatchForm.dispatch_temperature),
        dispatch_condition: dispatchForm.dispatch_condition,
        notes: dispatchForm.notes
      };
      await dispatchColdStorageBooking(selectedBookingForAction.booking_id, payload);
      setFeedback({ type: 'success', message: `Dispatch recorded for Booking #${selectedBookingForAction.booking_id}. Capacity freed!` });
      setShowDispatchModal(false);
      loadColdStorageData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const totalCapacity = chambers.reduce((acc, c) => acc + (parseFloat(c.capacity_mt) || 0), 0);
  const totalOccupied = chambers.reduce((acc, c) => acc + (parseFloat(c.occupied_mt) || 0), 0);
  const availableCapacity = totalCapacity - totalOccupied;
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const pendingRequests = bookings.filter(b => b.status === 'REQUESTED');

  return (
    <div>
      {/* 1. TOP HEADER & QUICK ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Warehouse size={24} color="var(--accent-blue)" />
            Cold Storage Facility Manager
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Controlled atmosphere chambers, farmer intake inspections, temperature compliance & dispatch logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAddChamberModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} />
            <span>Add Chamber</span>
          </button>

          <button
            type="button"
            onClick={() => loadColdStorageData(true)}
            disabled={refreshing}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Facility</span>
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
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Storage Capacity</span>
            <Warehouse size={18} color="var(--accent-blue)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {totalCapacity || 500} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>MT</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {chambers.length} separate cooling chambers
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Occupancy Rate</span>
            <Layers size={18} color="var(--accent-cyan)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
            {occupancyPercent}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {totalOccupied.toFixed(1)} MT occupied · <b style={{ color: 'var(--accent-emerald-light)' }}>{availableCapacity.toFixed(1)} MT free</b>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Pending Booking Requests</span>
            <Clock size={18} color="var(--accent-amber)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-amber-light)' }}>
            {pendingRequests.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Awaiting confirmation
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Stored Lots</span>
            <PackageCheck size={18} color="var(--accent-emerald)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
            {inventory.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Live monitored commodities
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
          { id: 'emergency-rescue', label: 'Emergency Rescue Storage', icon: AlertTriangle, isSpecial: true },
          { id: 'chambers', label: 'Chamber Management & Thermals', count: chambers.length, icon: Warehouse },
          { id: 'bookings', label: 'Farmer Booking Requests', count: bookings.length, icon: Clock },
          { id: 'inventory', label: 'Stored Inventory Registry', count: inventory.length, icon: Layers },
          { id: 'facility', label: 'Facility Profile', icon: Building2 }
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
                background: isSpecial && isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? (isSpecial ? 'var(--accent-cyan)' : 'var(--accent-blue)') : 'transparent'}`,
                color: isActive ? (isSpecial ? 'var(--accent-cyan)' : 'var(--accent-blue)') : (isSpecial ? 'var(--accent-cyan)' : 'var(--text-secondary)'),
                fontWeight: isActive ? '800' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                borderRadius: isSpecial ? 'var(--radius-sm) var(--radius-sm) 0 0' : '0'
              }}
            >
              <Icon size={16} color={isSpecial ? 'var(--accent-cyan)' : undefined} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 0: COLD STORAGE DASHBOARD OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* CHAMBERS STATUS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Chamber Occupancy & Temperature Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-blue)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>Chamber Status & Temperatures</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('chambers')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Manage ({chambers.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chambers.map((ch) => (
                  <div key={ch.chamber_id} style={{
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
                        {ch.chamber_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Capacity: <b>{ch.capacity_mt} MT</b> · Humidity: <b>{ch.current_humidity || 85}%</b>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                        {ch.current_temp ? `${ch.current_temp.toFixed(1)}°C` : '4.2°C'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--accent-emerald)', fontWeight: '700' }}>
                        Active Cooling
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stored Produce Inventory & Bookings */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageCheck size={18} color="var(--accent-emerald)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>Stored Produce Lots</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Full Inventory ({inventory.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {inventory.slice(0, 3).map((item) => (
                  <div key={item.inventory_id} style={{
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
                        {item.produce_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Depositor: <b>{item.farmer_name || 'Sahyadri Orchards'}</b>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                        {item.stored_quantity_mt} MT
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Grade: {item.quality_grade || 'Grade A'}
                      </div>
                    </div>
                  </div>
                ))}
                {inventory.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No active produce lots in storage. Check pending bookings.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 0.5: EMERGENCY RESCUE STORAGE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'emergency-rescue' && (
        <ColdStorageEmergencyRescue />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB A: CHAMBER MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'chambers' && (

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {chambers.map((chm) => {
              const chmOccPercent = chm.capacity_mt > 0 ? Math.round((chm.occupied_mt / chm.capacity_mt) * 100) : 0;
              const isTempSafe = chm.current_temperature >= chm.target_temp_min && chm.current_temperature <= chm.target_temp_max;
              return (
                <div key={chm.chamber_id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {chm.chamber_name}
                      </h3>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>
                        ID: {chm.chamber_id}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: chm.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: chm.status === 'ACTIVE' ? 'var(--accent-emerald-light)' : 'var(--accent-amber-light)'
                    }}>
                      {chm.status}
                    </span>
                  </div>

                  {/* Temperature & Humidity Monitoring */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        <Thermometer size={12} color="var(--accent-blue)" />
                        <span>Chamber Temp</span>
                      </div>
                      <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: isTempSafe ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)' }}>
                        {chm.current_temperature?.toFixed(1) || '11.4'}°C
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Range: {chm.target_temp_min}° - {chm.target_temp_max}°C
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        <Droplets size={12} color="var(--accent-cyan)" />
                        <span>Chamber Humidity</span>
                      </div>
                      <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                        {chm.current_humidity?.toFixed(0) || '85'}%
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--accent-emerald-light)' }}>
                        ⚡ Atmosphere Controlled
                      </div>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Occupancy</span>
                      <b style={{ color: 'var(--text-primary)' }}>{chm.occupied_mt} / {chm.capacity_mt} MT ({chmOccPercent}%)</b>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(chmOccPercent, 100)}%`, background: chmOccPercent > 85 ? 'var(--accent-amber)' : 'var(--accent-blue)', borderRadius: 'var(--radius-full)' }} />
                    </div>
                  </div>

                  {/* Compatible Produce Tags */}
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Compatible Crops:</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(chm.compatible_produce || []).map((crop, idx) => (
                        <span key={idx} style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB B: BOOKINGS & INTAKE/DISPATCH ACTIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'bookings' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--accent-amber)" />
            Farmer Storage Bookings & Intake Pipeline
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 14px' }}>Booking ID</th>
                  <th style={{ padding: '12px 14px' }}>Farmer</th>
                  <th style={{ padding: '12px 14px' }}>Produce</th>
                  <th style={{ padding: '12px 14px' }}>Quantity</th>
                  <th style={{ padding: '12px 14px' }}>Requested Intake</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.booking_id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <td className="font-mono" style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                      {b.booking_id}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <b>{b.farmer_name || 'Farmer Ramesh'}</b>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{b.farmer_phone || '+91 98220 54321'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <b>{b.produce_name}</b>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Duration: {b.duration_days} days</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700' }}>
                      {b.quantity_mt} MT
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {b.requested_intake_date}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: b.status === 'INTAKE_COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : b.status === 'ACCEPTED' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: b.status === 'INTAKE_COMPLETED' ? 'var(--accent-emerald-light)' : b.status === 'ACCEPTED' ? 'var(--accent-blue)' : 'var(--accent-amber-light)'
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {b.status === 'REQUESTED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleBookingAction(b.booking_id, 'ACCEPT')}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 10px' }}
                            >
                              <Check size={12} />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBookingAction(b.booking_id, 'REJECT')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', color: 'var(--accent-rose)' }}
                            >
                              <X size={12} />
                            </button>
                          </>
                        )}

                        {b.status === 'ACCEPTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForAction(b);
                              setIntakeForm(prev => ({ ...prev, actual_quantity_mt: b.quantity_mt }));
                              setShowIntakeModal(true);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', background: 'linear-gradient(135deg, #06B6D4, #0284C7)' }}
                          >
                            <ArrowDownLeft size={12} />
                            <span>Record Intake</span>
                          </button>
                        )}

                        {b.status === 'INTAKE_COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForAction(b);
                              setDispatchForm(prev => ({ ...prev, dispatch_quantity_mt: b.quantity_mt }));
                              setShowDispatchModal(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', color: 'var(--accent-emerald-light)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                          >
                            <ArrowUpRight size={12} />
                            <span>Dispatch</span>
                          </button>
                        )}
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
      {/* TAB C: INVENTORY REGISTRY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-emerald)" />
            Active Stored Inventory & Commodity Lots
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 14px' }}>Lot / Booking ID</th>
                  <th style={{ padding: '12px 14px' }}>Commodity</th>
                  <th style={{ padding: '12px 14px' }}>Chamber</th>
                  <th style={{ padding: '12px 14px' }}>Stored Weight</th>
                  <th style={{ padding: '12px 14px' }}>Intake Temp & Grade</th>
                  <th style={{ padding: '12px 14px' }}>Expected Dispatch</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((inv) => (
                  <tr key={inv.booking_id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <td className="font-mono" style={{ padding: '12px 14px', color: 'var(--accent-blue)', fontWeight: '700' }}>
                      {inv.booking_id}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <b>{inv.produce_name}</b>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Farmer: {inv.farmer_name}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                        {inv.chamber_name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {inv.quantity_mt} MT
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{inv.intake_temperature}°C</span> · {inv.intake_quality_grade}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {inv.dispatch_date || 'In 10 Days'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB D: FACILITY PROFILE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'facility' && (
        <div className="card" style={{ padding: '24px', maxWidth: '680px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="var(--accent-blue)" />
            Facility Profile & APEDA Compliance
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '18px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Facility Name</span>
              <b style={{ color: 'var(--text-primary)' }}>{facility?.facility_name || 'MahaCold Agro Hub'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Location</span>
              <b style={{ color: 'var(--text-primary)' }}>{facility?.location || 'MIDC Agro Cluster, Nashik'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Contact Phone</span>
              <b style={{ color: 'var(--text-primary)' }}>{facility?.contact_phone || '+91 97650 12345'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Verification Status</span>
              <span style={{ color: 'var(--accent-emerald-light)', fontWeight: '700' }}>✅ APEDA Certified</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD CHAMBER */}
      {/* ------------------------------------------------------------- */}
      {showAddChamberModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Add Controlled Atmosphere Cooling Chamber
            </h3>
            <form onSubmit={handleAddChamber}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Chamber Name *</label>
                <input
                  type="text"
                  value={chamberForm.chamber_name}
                  onChange={(e) => setChamberForm({ ...chamberForm, chamber_name: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Capacity (MT)</label>
                  <input
                    type="number"
                    value={chamberForm.capacity_mt}
                    onChange={(e) => setChamberForm({ ...chamberForm, capacity_mt: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Humidity Target (%)</label>
                  <input
                    type="number"
                    value={chamberForm.current_humidity}
                    onChange={(e) => setChamberForm({ ...chamberForm, current_humidity: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Temp Min (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={chamberForm.target_temp_min}
                    onChange={(e) => setChamberForm({ ...chamberForm, target_temp_min: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Temp Max (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={chamberForm.target_temp_max}
                    onChange={(e) => setChamberForm({ ...chamberForm, target_temp_max: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Compatible Produce Types</label>
                <input
                  type="text"
                  value={chamberForm.compatible_produce}
                  onChange={(e) => setChamberForm({ ...chamberForm, compatible_produce: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddChamberModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Chamber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INTAKE INSPECTION RECORD */}
      {/* ------------------------------------------------------------- */}
      {showIntakeModal && selectedBookingForAction && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Record Produce Intake Inspection
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Booking: <b className="font-mono" style={{ color: 'var(--accent-blue)' }}>#{selectedBookingForAction.booking_id}</b> ({selectedBookingForAction.produce_name})
            </p>

            <form onSubmit={handleIntakeSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Actual Ingested (MT)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={intakeForm.actual_quantity_mt}
                    onChange={(e) => setIntakeForm({ ...intakeForm, actual_quantity_mt: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dock Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={intakeForm.intake_temperature}
                    onChange={(e) => setIntakeForm({ ...intakeForm, intake_temperature: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Quality Grade at Intake</label>
                <select
                  value={intakeForm.intake_quality_grade}
                  onChange={(e) => setIntakeForm({ ...intakeForm, intake_quality_grade: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="Grade A (Export / Intact)">Grade A (Export / Intact)</option>
                  <option value="Grade B (Minor Surface Blemishes)">Grade B (Minor Surface Blemishes)</option>
                  <option value="Grade C (Processing Grade)">Grade C (Processing Grade)</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Assign Cooling Chamber</label>
                <select
                  value={intakeForm.chamber_id}
                  onChange={(e) => setIntakeForm({ ...intakeForm, chamber_id: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  {chambers.map((c) => (
                    <option key={c.chamber_id} value={c.chamber_id}>
                      {c.chamber_name} ({c.capacity_mt - c.occupied_mt} MT Free)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Intake Notes & Pallet ID</label>
                <textarea
                  rows={2}
                  value={intakeForm.notes}
                  onChange={(e) => setIntakeForm({ ...intakeForm, notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowIntakeModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirm Intake & Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DISPATCH RECORD */}
      {/* ------------------------------------------------------------- */}
      {showDispatchModal && selectedBookingForAction && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Record Produce Dispatch / Release
            </h3>

            <form onSubmit={handleDispatchSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dispatch Quantity (MT)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dispatchForm.dispatch_quantity_mt}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatch_quantity_mt: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dispatch Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dispatchForm.dispatch_temperature}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatch_temperature: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Condition & Carrier Plate</label>
                <input
                  type="text"
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowDispatchModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Release Cargo & Free Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
