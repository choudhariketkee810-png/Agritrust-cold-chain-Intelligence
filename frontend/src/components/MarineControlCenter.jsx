import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ship, 
  Anchor, 
  Compass, 
  Thermometer, 
  Droplets, 
  Activity, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  ArrowRight, 
  Eye, 
  Sparkles, 
  DollarSign, 
  Wind, 
  Boxes, 
  AlertOctagon, 
  HelpCircle, 
  Lock, 
  Unlock,
  Radio,
  Sliders,
  ChevronRight,
  Filter,
  PlusCircle,
  Truck,
  Zap,
  Gauge,
  Play
} from 'lucide-react';
import { 
  fetchMarineKpis, 
  fetchNauticalWaypoints, 
  fetchMarineShipments, 
  fetchShippingContainers, 
  fetchContainerDetail, 
  fetchContainerBlackBox, 
  createContainerBlackBoxEvent, 
  fetchMultimodalLossInvestigation, 
  simulateMarineWhatIf,
  advanceContainerSimulation,
  fetchTrackingProviderMetadata,
  toggleTrackingProviderMode
} from '../api';

export default function MarineControlCenter() {
  // State
  const [kpis, setKpis] = useState(null);
  const [containers, setContainers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [selectedContainerId, setSelectedContainerId] = useState('MEDU7719203');
  const [containerDetail, setContainerDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulation & Provider State
  const [isSimulatingStep, setIsSimulatingStep] = useState(false);
  const [stepSuccessMsg, setStepSuccessMsg] = useState(null);
  const [providerMode, setProviderMode] = useState('SIMULATED');

  // Active Sub-Tab in Detail View
  const [detailTab, setDetailTab] = useState('overview');

  // Modals
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [showWhatIfModal, setShowWhatIfModal] = useState(false);
  const [investigationData, setInvestigationData] = useState(null);
  const [isInvLoading, setIsInvLoading] = useState(false);

  // What-If Simulation State
  const [whatIfType, setWhatIfType] = useState('ALTERNATIVE_PORT'); // ALTERNATIVE_PORT, ALTERNATIVE_BUYER, REEFER_RESET
  const [whatIfParamBuyer, setWhatIfParamBuyer] = useState('Jebel Ali Fresh Port Terminal Wholesale Hub');
  const [whatIfParamPort, setWhatIfParamPort] = useState('Port of Salalah / Jebel Ali Hub');
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Add Event Form State
  const [newEvent, setNewEvent] = useState({
    event_type: 'TEMP_EXCURSION',
    location_name: '',
    latitude: 18.95,
    longitude: 72.85,
    temperature: 8.5,
    humidity: 70.0,
    door_status: 'CLOSED',
    reefer_status: 'ACTIVE_COOLING',
    actor_role: 'Ocean Carrier Engineer',
    evidence_ref: 'LOG-DEMO-EV01',
    notes: 'Auxiliary compressor inspection logged.',
    severity: 'WARNING'
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Black Box Filter
  const [blackBoxFilter, setBlackBoxFilter] = useState('ALL');

  // Load Main Master Data
  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, contRes, shipRes, wpRes] = await Promise.allSettled([
        fetchMarineKpis(),
        fetchShippingContainers(),
        fetchMarineShipments(),
        fetchNauticalWaypoints()
      ]);

      if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value);
      if (contRes.status === 'fulfilled') {
        const contList = contRes.value?.data || [];
        setContainers(contList);
        if (contList.length > 0 && !selectedContainerId) {
          setSelectedContainerId(contList[0].container_id);
        }
      }
      if (shipRes.status === 'fulfilled') setShipments(shipRes.value?.data || []);
      if (wpRes.status === 'fulfilled') setWaypoints(wpRes.value?.data || []);

      setError(null);
    } catch (err) {
      console.error('Failed to load marine master data:', err);
      setError('Unable to load Marine Intelligence stream. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Container Detail
  const loadContainerDetail = async (cid) => {
    if (!cid) return;
    setIsDetailLoading(true);
    try {
      const res = await fetchContainerDetail(cid);
      setContainerDetail(res);
      // Pre-set new event coordinates
      if (res?.container) {
        setNewEvent(prev => ({
          ...prev,
          location_name: res.container.current_sea_region || res.container.origin_port,
          latitude: res.container.current_latitude,
          longitude: res.container.current_longitude,
          temperature: res.container.current_temperature,
          humidity: res.container.current_humidity
        }));
      }
    } catch (err) {
      console.error('Failed to load container detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (selectedContainerId) {
      loadContainerDetail(selectedContainerId);
    }
  }, [selectedContainerId]);

  // Handle Opening Deep Investigation Modal
  const handleOpenInvestigation = async (shipmentId) => {
    const sId = shipmentId || containerDetail?.shipment?.shipment_id || 'AGRI-SHP-9905';
    setShowInvestigationModal(true);
    setIsInvLoading(true);
    try {
      const res = await fetchMultimodalLossInvestigation(sId);
      setInvestigationData(res);
    } catch (err) {
      console.error('Failed to fetch loss investigation:', err);
    } finally {
      setIsInvLoading(false);
    }
  };

  // Handle Running What-If Simulator
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const payload = {
        container_id: selectedContainerId,
        shipment_id: containerDetail?.shipment?.shipment_id || 'AGRI-SHP-9905',
        simulation_type: whatIfType,
        simulation_params: {
          target_port: whatIfParamPort,
          buyer_name: whatIfParamBuyer
        }
      };
      const res = await simulateMarineWhatIf(payload);
      setWhatIfResult(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle Submitting Black Box Event
  const handleCreateBlackBoxEvent = async (e) => {
    e.preventDefault();
    if (!selectedContainerId) return;
    setIsSubmittingEvent(true);
    try {
      await createContainerBlackBoxEvent(selectedContainerId, newEvent);
      setShowAddEventModal(false);
      // Refresh detail and master list
      loadContainerDetail(selectedContainerId);
      loadMasterData();
    } catch (err) {
      console.error('Failed to create Black Box event:', err);
      alert('Failed to log Black Box event: ' + err.message);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Handle Advancing Vessel Simulation along Waypoint Corridor
  const handleAdvanceSimulation = async (stepNmi = 25.0) => {
    if (!selectedContainerId) return;
    setIsSimulatingStep(true);
    setStepSuccessMsg(null);
    try {
      const res = await advanceContainerSimulation(selectedContainerId, stepNmi);
      setStepSuccessMsg(`Vessel advanced +${stepNmi} nmi along nautical corridor. New coordinates: ${res.latitude}°N, ${res.longitude}°E (ETA updated)`);
      setTimeout(() => setStepSuccessMsg(null), 5000);
      await Promise.all([
        loadContainerDetail(selectedContainerId),
        loadMasterData()
      ]);
    } catch (err) {
      console.error('Simulation step error:', err);
      alert('Failed to advance vessel simulation: ' + err.message);
    } finally {
      setIsSimulatingStep(false);
    }
  };

  // Handle Toggling Tracking Provider Mode
  const handleToggleProviderMode = async (mode) => {
    try {
      await toggleTrackingProviderMode(mode);
      setProviderMode(mode);
      await Promise.all([
        loadContainerDetail(selectedContainerId),
        loadMasterData()
      ]);
    } catch (err) {
      console.error('Provider mode toggle error:', err);
    }
  };

  const selectedContainer = useMemo(() => {
    return containers.find(c => c.container_id === selectedContainerId) || containers[0];
  }, [containers, selectedContainerId]);

  const filteredBlackBoxEvents = useMemo(() => {
    const evs = containerDetail?.black_box_events || [];
    if (blackBoxFilter === 'ALL') return evs;
    if (blackBoxFilter === 'ALERTS') return evs.filter(e => e.severity === 'WARNING' || e.severity === 'CRITICAL');
    return evs.filter(e => e.event_type.includes(blackBoxFilter));
  }, [containerDetail, blackBoxFilter]);

  if (isLoading && !containerDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={28} className="animate-spin" color="var(--brand-primary)" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Loading AGRITRUST Multimodal Marine Intelligence...</h3>
        <p style={{ fontSize: '13px', marginTop: '6px' }}>Connecting to Satellite AIS Telemetry & Smart Reefer Black Box Grid</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. TOP PLATFORM POSITIONING & PRODUCT HEADER */}
      <div className="card" style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #E6F4F4 0%, #FFFFFF 100%)',
        border: '1px solid var(--border-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-primary-blue) 0%, var(--color-dark-blue) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(1, 129, 128, 0.25)'
          }}>
            <Ship size={28} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                AGRITRUST MARINE INTELLIGENCE & LOSS PREVENTION
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--accent-amber)'
              }}>
                DEMO / SIMULATED DATA
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Multimodal Cold-Chain Decision Support: <b>🚚 Road + ⚓ Port + 🚢 Marine + 📦 Reefer Container + ⚖️ Digital Evidence</b>
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => handleAdvanceSimulation(35.0)}
            disabled={isSimulatingStep}
            style={{
              background: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
              fontWeight: '700'
            }}
          >
            <Zap size={15} className={isSimulatingStep ? 'animate-spin' : ''} />
            <span>{isSimulatingStep ? 'Simulating Movement...' : '⚡ Advance Vessel (+35 nmi)'}</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => handleOpenInvestigation(containerDetail?.shipment?.shipment_id)}
            style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              fontWeight: '700'
            }}
          >
            <Search size={15} />
            <span>🔎 Investigate Loss</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setShowWhatIfModal(true);
              handleRunSimulation();
            }}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
              fontWeight: '700'
            }}
          >
            <Sparkles size={15} />
            <span>🧪 AI What-If Simulator</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              loadMasterData();
              if (selectedContainerId) loadContainerDetail(selectedContainerId);
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh AIS</span>
          </button>
        </div>
      </div>

      {/* Step Simulation Success Notification Banner */}
      {stepSuccessMsg && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          color: 'var(--accent-cyan)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span><b>AIS Telemetry Progression:</b> {stepSuccessMsg}</span>
        </div>
      )}

      {/* 2. 8 ENTERPRISE KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Active Marine Shipments</span>
            <Ship size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '6px' }}>
            {kpis?.active_marine_shipments || 5}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
            Multimodal corridors active
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Containers at Sea</span>
            <Compass size={16} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#38BDF8', marginTop: '6px' }}>
            {kpis?.containers_at_sea || 3}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Ocean AIS tracked
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Containers at Port</span>
            <Anchor size={16} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-emerald)', marginTop: '6px' }}>
            {kpis?.containers_at_port || 2}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Terminal & Customs yard
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Delayed Containers</span>
            <Clock size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#FBBF24', marginTop: '6px' }}>
            {kpis?.delayed_containers || 2}
          </div>
          <div style={{ fontSize: '11px', color: '#FBBF24', marginTop: '2px' }}>
            Dwell & storm deviation
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>High-Risk Containers</span>
            <AlertTriangle size={16} color="#F97316" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#F97316', marginTop: '6px' }}>
            {kpis?.high_risk_containers || 2}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Risk score &gt; 60/100
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Reefer Alerts</span>
            <Thermometer size={16} color="#EF4444" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#EF4444', marginTop: '6px' }}>
            {kpis?.reefer_alerts_count || 4}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Excursions & genset power
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Shelf-Life Risk</span>
            <TrendingDown size={16} color="#EC4899" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#EC4899', marginTop: '6px' }}>
            {kpis?.shelf_life_risk_count || 2}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            ETA vs freshness pressure
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#FB7185', fontWeight: '700' }}>Potential Loss Exposure</span>
            <DollarSign size={16} color="#FB7185" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#FB7185', marginTop: '6px' }}>
            ₹{(kpis?.total_potential_loss_inr || 84000).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Calculated AI estimate
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: MAP & CONTAINER SELECTOR (LEFT 60%) + LIVE CONTAINER DOSSIER (RIGHT 40%) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
        gap: '20px',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: INTERACTIVE MARITIME CORRIDOR MAP & CONTAINER CAROUSEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* A. INTERACTIVE NAUTICAL ROUTE MAP */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Live Multimodal Maritime Map & AIS Corridor
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span> Origin
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4' }}></span> Vessel/At-Sea
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span> Incident/Alert
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A855F7' }}></span> Destination
                </span>
              </div>
            </div>

            {/* SVG Nautical Map Simulation */}
            <div style={{
              width: '100%',
              height: '320px',
              borderRadius: 'var(--radius-md)',
              background: 'radial-gradient(circle at 50% 50%, #0A192F 0%, #030B17 100%)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Map Grid Lines */}
              <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                  <pattern id="marineGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                  </pattern>
                  <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#marineGrid)" />
                
                {/* Simulated Nautical Corridors */}
                {/* Route 1: JNPT -> Bab-el-Mandeb -> Suez -> Rotterdam */}
                <path d="M 720 180 Q 550 200 440 210 T 360 140 T 220 90 T 140 70" fill="none" stroke="url(#corridorGrad)" strokeWidth="2.5" strokeDasharray="4,4" />
                
                {/* Route 2: Mundra -> Jebel Ali */}
                <path d="M 710 160 Q 640 140 580 145" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3,3" />

                {/* Route 3: Chennai -> Singapore */}
                <path d="M 760 210 Q 820 240 880 260" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="3,3" />

                {/* Major Port Markers */}
                {/* JNPT */}
                <circle cx="720" cy="180" r="6" fill="#10B981" />
                <text x="730" y="185" fill="#E2E8F0" fontSize="10" fontWeight="700">JNPT (India)</text>

                {/* Jebel Ali */}
                <circle cx="580" cy="145" r="5" fill="#38BDF8" />
                <text x="590" y="140" fill="#94A3B8" fontSize="9">Jebel Ali</text>

                {/* Salalah */}
                <circle cx="520" cy="200" r="5" fill="#F59E0B" />
                <text x="530" y="205" fill="#94A3B8" fontSize="9">Port Salalah</text>

                {/* Suez */}
                <circle cx="360" cy="140" r="5" fill="#38BDF8" />
                <text x="365" y="135" fill="#94A3B8" fontSize="9">Suez</text>

                {/* Rotterdam */}
                <circle cx="140" cy="70" r="6" fill="#A855F7" />
                <text x="80" y="65" fill="#E2E8F0" fontSize="10" fontWeight="700">Rotterdam</text>

                {/* Singapore */}
                <circle cx="880" cy="260" r="6" fill="#10B981" />
                <text x="890" y="265" fill="#E2E8F0" fontSize="10" fontWeight="700">Singapore</text>

                {/* Live Vessel Markers */}
                {/* MSKU1234567 in Red Sea */}
                <g transform="translate(390, 160)">
                  <circle cx="0" cy="0" r="10" fill="rgba(6, 182, 212, 0.2)" className="animate-ping" />
                  <circle cx="0" cy="0" r="6" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="10" y="4" fill="#67E8F9" fontSize="10" fontWeight="700">MSKU1234567 (4.2°C)</text>
                </g>

                {/* CMAU8492019 in Gulf of Aden (Incident) */}
                <g transform="translate(480, 205)">
                  <circle cx="0" cy="0" r="12" fill="rgba(239, 68, 68, 0.3)" className="animate-ping" />
                  <circle cx="0" cy="0" r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="10" y="-4" fill="#FCA5A5" fontSize="10" fontWeight="700">⚠️ CMAU8492019 (8.7°C EXCURSION)</text>
                </g>

                {/* MEDU7719203 in Strait of Sicily (Flagship) */}
                <g transform="translate(240, 105)">
                  <circle cx="0" cy="0" r="14" fill="rgba(239, 68, 68, 0.4)" className="animate-ping" />
                  <circle cx="0" cy="0" r="7" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="12" y="14" fill="#F87171" fontSize="11" fontWeight="800">🚨 MEDU7719203 (SEAL MISMATCH + 40kg LOSS)</text>
                </g>

                {/* ONEU9284102 in Malacca */}
                <g transform="translate(840, 245)">
                  <circle cx="0" cy="0" r="10" fill="rgba(245, 158, 11, 0.3)" className="animate-ping" />
                  <circle cx="0" cy="0" r="6" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="-140" y="16" fill="#FDE68A" fontSize="10" fontWeight="700">⚡ ONEU9284102 (STORM DELAY)</text>
                </g>
              </svg>

              {/* Watermark Tag */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '12px',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.4)',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)'
              }}>
                Interactive AIS Nautical Trail · 5 Live Vessels
              </div>
            </div>
          </div>

          {/* B. CONTAINER SELECTION LIST (5 CURATED DEMO SCENARIOS) */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Select Marine Shipment & Container Scenario
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                5 Verified Scenarios
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {containers.map(c => {
                const isSelected = c.container_id === selectedContainerId;
                const isCritical = c.reefer_health_score < 65 || c.current_temperature > 8.0 || c.seal_id === 'SEAL-MSC-9948';
                const isWarning = c.actual_dwell_hours > 15 || c.weather_risk_level === 'HIGH';

                return (
                  <div
                    key={c.container_id}
                    onClick={() => setSelectedContainerId(c.container_id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected 
                        ? 'rgba(6, 182, 212, 0.12)' 
                        : 'var(--bg-panel)',
                      border: isSelected 
                        ? '1px solid var(--accent-cyan)' 
                        : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: isCritical ? 'rgba(239, 68, 68, 0.2)' : (isWarning ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Ship size={18} color={isCritical ? '#EF4444' : (isWarning ? '#F59E0B' : '#10B981')} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
                            {c.container_id}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ({c.current_vessel_name})
                          </span>
                          {c.container_id === 'MEDU7719203' && (
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '10px', background: '#EF4444', color: '#FFF' }}>
                              FLAGSHIP INVESTIGATION
                            </span>
                          )}
                          {c.container_id === 'ONEU9284102' && (
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '10px', background: '#F59E0B', color: '#000' }}>
                              SHELF-LIFE CRISIS
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {c.origin_port} → {c.destination_port}
                        </div>
                      </div>
                    </div>

                    {/* Telemetry Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '800',
                          color: c.current_temperature > c.target_temp_max ? '#EF4444' : 'var(--accent-emerald-light)'
                        }}>
                          {c.current_temperature.toFixed(1)}°C
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Reefer: {c.reefer_health_score}/100
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: isCritical ? 'rgba(239, 68, 68, 0.2)' : (isWarning ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.15)'),
                          color: isCritical ? '#EF4444' : (isWarning ? '#FBBF24' : '#10B981'),
                          border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : (isWarning ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)')}`
                        }}>
                          {isCritical ? 'CRITICAL RISK' : (isWarning ? 'MODERATE RISK' : 'LOW RISK')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SELECTED CONTAINER LIVE INTELLIGENCE DOSSIER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px' }}>
            
            {/* Dossier Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#F8FAFC', margin: 0 }}>
                    {containerDetail?.container?.container_id || selectedContainerId}
                  </h2>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(6, 182, 212, 0.3)'
                  }}>
                    {containerDetail?.container?.current_vessel_name || 'Vessel Active'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Carrier: <b>{containerDetail?.container?.carrier_name || 'Maersk'}</b> · Voyage: <b>{containerDetail?.container?.voyage_number || 'VOY-2026'}</b>
                </div>
              </div>

              {/* Action: Add Black Box Event */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddEventModal(true)}
                style={{ fontSize: '11px' }}
              >
                <PlusCircle size={13} color="var(--accent-cyan)" />
                <span>Log Event</span>
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div className="panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Marine Route Risk</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: containerDetail?.route_risk?.color || '#EF4444' }}>
                    {containerDetail?.route_risk?.risk_score || 78}/100
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: containerDetail?.route_risk?.color || '#EF4444'
                  }}>
                    {containerDetail?.route_risk?.status || 'HIGH'}
                  </span>
                </div>
              </div>

              <div className="panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reefer Health Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: containerDetail?.reefer_health?.status_color || '#10B981' }}>
                    {containerDetail?.reefer_health?.reefer_health_score || 82}/100
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: containerDetail?.reefer_health?.status_color || '#10B981'
                  }}>
                    {containerDetail?.reefer_health?.status || 'GOOD'}
                  </span>
                </div>
              </div>

              <div className="panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Live Temperature</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: (containerDetail?.container?.current_temperature > containerDetail?.container?.target_temp_max) ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                  {containerDetail?.container?.current_temperature?.toFixed(1) || '4.2'}°C
                  <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    (Set: {containerDetail?.container?.set_temperature?.toFixed(1) || '4.0'}°C)
                  </span>
                </div>
              </div>

              <div className="panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shelf-Life Margin</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: containerDetail?.shelf_life_intelligence?.color || '#FBBF24', marginTop: '6px' }}>
                  {containerDetail?.shelf_life_intelligence?.display_badge || '🟡 LOW SAFETY MARGIN'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ETA: {containerDetail?.shelf_life_intelligence?.eta_destination_hours}h | Left: {containerDetail?.shelf_life_intelligence?.remaining_shelf_life_hours}h
                </div>
              </div>
            </div>

            {/* Potential Loss Banner */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#FB7185', fontWeight: '600' }}>POTENTIAL FINANCIAL LOSS</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#EF4444' }}>
                  ₹{(containerDetail?.spoilage_cost?.potential_loss_inr || 20000).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontWeight: '600' }}>POTENTIAL PREVENTED</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                  ₹{(containerDetail?.spoilage_cost?.potential_loss_prevented_inr || 15000).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* DETAIL TABS NAVIGATION */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              scrollbarWidth: 'thin'
            }}>
              {[
                { id: 'overview', label: 'Route Risk', icon: Activity },
                { id: 'location', label: 'Live Location & Speed', icon: Compass },
                { id: 'reefer', label: 'Reefer Monitoring', icon: Thermometer },
                { id: 'shelflife', label: 'Shelf-Life Predictor', icon: TrendingDown },
                { id: 'sellspoilage', label: 'Sell Before Spoilage', icon: Sparkles },
                { id: 'port', label: 'Port Handover', icon: Anchor },
                { id: 'blackbox', label: 'Black Box & Events', icon: FileText },
                { id: 'seals', label: 'Digital Evidence & Seals', icon: Lock },
                { id: 'investigation', label: 'Loss Investigation', icon: Search },
                { id: 'weather', label: 'Weather Risk', icon: Wind }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 11px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: isActive ? '700' : '500',
                      color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                      background: isActive ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                      border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={12} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT AREAS */}

            {/* 1. OVERVIEW & ROUTE RISK */}
            {detailTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Top Contributing Risk Factors
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(containerDetail?.route_risk?.top_risk_factors || []).map((rf, idx) => (
                    <div key={idx} className="panel" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {rf.factor}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {rf.detail}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        color: rf.severity === 'CRITICAL' ? '#EF4444' : (rf.severity === 'HIGH' ? '#F97316' : 'var(--accent-cyan)'),
                        whiteSpace: 'nowrap'
                      }}>
                        +{rf.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. LIVE LOCATION & NAUTICAL CORRIDOR TRACKER */}
            {detailTab === 'location' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                    Vessel Navigation & Nautical Corridor Position
                  </h4>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#FBBF24',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    DATA SOURCE: DEMO SIMULATION
                  </span>
                </div>

                <div className="panel" style={{ padding: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Vessel Name:</span>
                      <div style={{ fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                        🚢 {containerDetail?.container?.current_vessel_name || 'MV AGRI STAR'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Current Sea Region:</span>
                      <div style={{ fontWeight: '700', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                        📍 {containerDetail?.container?.current_sea_region || 'Arabian Sea'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>GPS Coordinates:</span>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {containerDetail?.container?.current_latitude?.toFixed(4)}°N, {containerDetail?.container?.current_longitude?.toFixed(4)}°E
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Speed & Heading:</span>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                        🧭 {containerDetail?.container?.speed_knots?.toFixed(1)} knots @ {containerDetail?.container?.heading_degrees?.toFixed(0)}°
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Distance Travelled:</span>
                      <div style={{ fontWeight: '700', color: '#10B981', marginTop: '2px' }}>
                        {containerDetail?.container?.distance_travelled_nmi?.toLocaleString()} nmi ({containerDetail?.container?.route_progress_pct?.toFixed(1)}%)
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Distance Remaining:</span>
                      <div style={{ fontWeight: '700', color: '#38BDF8', marginTop: '2px' }}>
                        {containerDetail?.container?.distance_remaining_nmi?.toLocaleString()} nmi
                      </div>
                    </div>
                  </div>

                  {/* Route Progress Visual Bar */}
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>🟢 Origin: <b>{containerDetail?.container?.origin_port}</b></span>
                      <span>🔴 Dest: <b>{containerDetail?.container?.destination_port}</b></span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, containerDetail?.container?.route_progress_pct || 35)}%`,
                        background: 'linear-gradient(90deg, #10B981 0%, #06B6D4 50%, #3B82F6 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>

                  {/* Live Simulation Trigger Button */}
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ⏱️ Last Telemetry: {containerDetail?.container?.last_telemetry_at ? new Date(containerDetail.container.last_telemetry_at).toLocaleTimeString() : 'Just now'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleAdvanceSimulation(35.0)}
                      disabled={isSimulatingStep}
                      style={{
                        background: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '5px 12px'
                      }}
                    >
                      <Zap size={12} className={isSimulatingStep ? 'animate-spin' : ''} />
                      <span>{isSimulatingStep ? 'Stepping...' : '⚡ Step Simulator (+35 nmi)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. REEFER TELEMETRY & COMPRESSOR MONITORING */}
            {detailTab === 'reefer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                  Smart Reefer Temperature & Compressor Telematics
                </h4>

                {/* Thermal Excursion Banner if temperature is out of bounds */}
                {containerDetail?.container?.current_temperature > containerDetail?.container?.target_temp_max && (
                  <div className="panel" style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#EF4444' }}>
                        🚨 HIGH TEMPERATURE EXCURSION DETECTED
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#EF4444' }}>
                        Severity: HIGH
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Set: <b>{containerDetail.container.set_temperature}°C</b> · Actual: <b style={{ color: '#EF4444' }}>{containerDetail.container.current_temperature}°C</b> · Deviation: <b style={{ color: '#EF4444' }}>+{(containerDetail.container.current_temperature - containerDetail.container.set_temperature).toFixed(1)}°C</b> · Duration: <b>47 minutes</b>
                    </div>
                  </div>
                )}

                {containerDetail?.reefer_health?.predictive_alert && (
                  <div className="panel" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#EF4444' }}>
                      {containerDetail.reefer_health.predictive_alert.headline}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {containerDetail.reefer_health.predictive_alert.prediction}
                    </div>
                  </div>
                )}

                {/* Grid of Telemetric Readings */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div className="panel" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reefer Power Status</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: containerDetail?.container?.reefer_power_status === 'ON' ? '#10B981' : '#EF4444', marginTop: '3px' }}>
                      ⚡ {containerDetail?.container?.reefer_power_status || 'ON'}
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compressor Status</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '3px' }}>
                      ❄️ {containerDetail?.container?.compressor_status || 'ACTIVE_COOLING'}
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Container Door Status</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: containerDetail?.container?.door_status === 'CLOSED' ? '#10B981' : '#EF4444', marginTop: '3px' }}>
                      🚪 {containerDetail?.container?.door_status || 'CLOSED'}
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Relative Humidity</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#38BDF8', marginTop: '3px' }}>
                      💧 {containerDetail?.container?.current_humidity?.toFixed(1) || '78.0'}% (Target: {containerDetail?.container?.target_humidity || '85'}%)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(containerDetail?.reefer_health?.contributing_factors || []).map((cf, i) => (
                    <div key={i} className="panel" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                          {cf.factor}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {cf.detail}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#EF4444' }}>
                        -{cf.penalty} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SHELF-LIFE & SPOILAGE COST */}
            {detailTab === 'shelflife' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Shelf-Life Kinetic Consumption Engine
                </h4>
                <div className="panel" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Original Shelf Life:</span>
                    <b style={{ color: 'var(--text-primary)' }}>{containerDetail?.shelf_life_intelligence?.original_shelf_life_hours} hours</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Time Elapsed:</span>
                    <b style={{ color: 'var(--text-primary)' }}>{containerDetail?.shelf_life_intelligence?.time_elapsed_hours} hours</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Thermal Excursion Penalty:</span>
                    <b style={{ color: '#EF4444' }}>+{containerDetail?.shelf_life_intelligence?.thermal_penalty_hours} hours accelerated</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Remaining Shelf Life:</span>
                    <b style={{ color: 'var(--accent-emerald-light)' }}>{containerDetail?.shelf_life_intelligence?.remaining_shelf_life_hours} hours</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Voyage ETA:</span>
                    <b style={{ color: '#38BDF8' }}>{containerDetail?.shelf_life_intelligence?.eta_destination_hours} hours</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>Arrival Safety Margin:</span>
                    <b style={{ color: containerDetail?.shelf_life_intelligence?.color }}>
                      {containerDetail?.shelf_life_intelligence?.safety_margin_hours} hours
                    </b>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SELL BEFORE SPOILAGE & DYNAMIC DESTINATION */}
            {detailTab === 'sellspoilage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                    Sell Before Spoilage Recommendations
                  </h4>
                  <span style={{ fontSize: '10px', color: 'var(--accent-amber)', fontWeight: '600' }}>Recommendation Only</span>
                </div>

                <div className="panel" style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#FBBF24' }}>
                    {containerDetail?.sell_before_spoilage?.action_recommendation}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {containerDetail?.sell_before_spoilage?.recommendation_reason}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(containerDetail?.sell_before_spoilage?.allocated_destinations || []).map((b, i) => (
                    <div key={i} className="panel" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                          {b.buyer_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          📍 {b.location} ({b.distance_km} km) · ETA: <b>{b.transit_eta_hours}h</b>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                          {b.allocated_quantity_kg} kg @ ₹{b.offered_price_per_kg_inr}/kg
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Saves ₹{b.prevented_loss_inr.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. PORT HANDOVER & DWELL */}
            {detailTab === 'port' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                  Port Dwell-Time & Handover Tracking
                </h4>

                <div className="panel" style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#FBBF24' }}>
                    {containerDetail?.port_dwell_intelligence?.warning_banner}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Expected Dwell: {containerDetail?.port_dwell_intelligence?.expected_dwell_hours}h · Actual Dwell: {containerDetail?.port_dwell_intelligence?.actual_dwell_hours}h · Delay: {containerDetail?.port_dwell_intelligence?.dwell_delay_hours}h
                  </div>
                </div>

                <div className="panel" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                    Transshipment Risk: {containerDetail?.transshipment_risk?.risk_level}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {containerDetail?.transshipment_risk?.transshipment_count} vessel transfer(s), {containerDetail?.transshipment_risk?.handling_events_count} handling crane moves.
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                    💡 {containerDetail?.transshipment_risk?.recommendation}
                  </div>
                </div>
              </div>
            )}

            {/* 7. CONTAINER BLACK BOX CHRONOLOGICAL TRAIL */}
            {detailTab === 'blackbox' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                    Chronological Container Evidence Trail ({filteredBlackBoxEvents.length} events)
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {['ALL', 'ALERTS', 'TEMP', 'SEAL', 'PORT'].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBlackBoxFilter(f)}
                        style={{
                          fontSize: '10px',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: blackBoxFilter === f ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.06)',
                          color: blackBoxFilter === f ? '#000' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                  {filteredBlackBoxEvents.map(ev => {
                    const isCrit = ev.severity === 'CRITICAL';
                    const isWarn = ev.severity === 'WARNING';
                    return (
                      <div
                        key={ev.event_id}
                        className="panel"
                        style={{
                          padding: '10px 12px',
                          borderLeft: `3px solid ${isCrit ? '#EF4444' : (isWarn ? '#F59E0B' : '#10B981')}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                            {ev.event_type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {ev.event_timestamp ? new Date(ev.event_timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          📍 <b>{ev.location_name}</b> · {ev.notes}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                          {ev.temperature !== null && <span>🌡 {ev.temperature}°C</span>}
                          {ev.humidity !== null && <span>💧 {ev.humidity}%</span>}
                          {ev.door_status && <span>🚪 {ev.door_status}</span>}
                          {ev.evidence_ref && <span style={{ color: 'var(--accent-cyan)' }}>📎 {ev.evidence_ref}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. DIGITAL CONTAINER SEAL & SENSOR TRUST */}
            {detailTab === 'seals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                  Digital Container Seal & Sensor Trust
                </h4>

                {containerDetail?.digital_seal?.seal_status === 'SEAL_MISMATCH' && (
                  <div className="panel" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#EF4444' }}>
                      🚨 DIGITAL SEAL MISMATCH DETECTED
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Origin Applied Seal #{containerDetail.digital_seal.origin_seal_number} does not match verified terminal seal #{containerDetail.digital_seal.destination_verified_seal_number}. Investigation event logged.
                    </div>
                  </div>
                )}

                <div className="panel" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>Sensor Data Trust Score</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                      {containerDetail?.sensor_trust?.sensor_trust_score || 98}/100
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Zero communication dropouts or impossible GPS movement detected. High evidentiary trust.
                  </div>
                </div>
              </div>
            )}

            {/* 9. LOSS PREVENTION & INVESTIGATION ENGINE */}
            {detailTab === 'investigation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                    Loss Prevention & Neutral Investigation Dossier
                  </h4>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleOpenInvestigation(containerDetail?.shipment?.shipment_id)}
                    style={{
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                      color: '#FFF',
                      fontSize: '11px',
                      padding: '4px 10px'
                    }}
                  >
                    🔎 Open Modal Dossier
                  </button>
                </div>

                <div className="panel" style={{ padding: '14px', background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    AI INCIDENT SUMMARY ("WHAT HAPPENED?")
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#F1F5F9', margin: 0 }}>
                    "Shipment recorded under verified chain-of-custody tokens. The system cross-references farmer dispatch weights against origin port gate-in and destination discharge. Any quantity or thermal discrepancies are highlighted chronologically for neutral party verification without unilateral fault assignment."
                  </p>
                </div>

                {/* Multimodal Milestone Comparison List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { stage: '1. Farmer Harvest & Packhouse', qty: '1,000 kg', temp: '11.5°C', party: 'Farmer (Nashik)', status: 'OK' },
                    { stage: '2. Farm Gate Truck Pickup', qty: '1,000 kg', temp: '11.8°C', party: 'Reefer Truck Operator', status: 'OK' },
                    { stage: '3. Origin Port Gate-In (JNPT)', qty: '998 kg', temp: '12.0°C', party: 'Port Terminal Authority', status: 'OK' },
                    { stage: '4. Container Stuffing & Sealing', qty: '998 kg', temp: '4.0°C', party: 'Customs & Ocean Carrier', status: 'OK' },
                    { stage: '5. Marine Vessel Voyage', qty: '998 kg', temp: '8.7°C (Excursion)', party: 'Ocean Carrier Vessel', status: 'FLAGGED' },
                    { stage: '6. Destination Port Discharge', qty: '995 kg', temp: '5.1°C', party: 'Destination Terminal', status: 'OK' },
                    { stage: '7. Final Buyer Receiving Inspection', qty: '960 kg', temp: '6.2°C', party: 'Buyer Inspection Inspector', status: 'FLAGGED' }
                  ].map((s, idx) => (
                    <div key={idx} className="panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                          {s.stage}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Custody: {s.party} · Temp: {s.temp}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: s.status === 'FLAGGED' ? '#EF4444' : 'var(--accent-emerald)' }}>
                          {s.qty}
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', background: s.status === 'FLAGGED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: s.status === 'FLAGGED' ? '#EF4444' : '#10B981' }}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. WEATHER RISK */}
            {detailTab === 'weather' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                  Maritime Weather & Wave Conditions
                </h4>
                {(containerDetail?.weather_events || []).map(we => (
                  <div key={we.weather_event_id} className="panel" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                        {we.weather_condition.replace(/_/g, ' ')} ({we.sea_region})
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: we.severity_level === 'HIGH' ? '#EF4444' : '#10B981' }}>
                        {we.severity_level}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Wind: {we.wind_speed_knots} knots · Waves: {we.wave_height_meters}m · Transit Delay Impact: <b>+{we.expected_delay_hours}h</b>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: "WHERE DID THE LOSS HAPPEN?" DEEP LOSS INVESTIGATION */}
      {/* ========================================================================= */}
      {showInvestigationModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            background: 'var(--bg-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={22} color="#EF4444" />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', margin: 0 }}>
                    🔎 "Where Did The Loss Happen?" Multimodal Investigation Dossier
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Shipment {investigationData?.shipment?.shipment_id || 'AGRI-SHP-9905'} ({investigationData?.shipment?.produce_name || 'Table Tomatoes'})
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInvestigationModal(false)}
              >
                Close
              </button>
            </div>

            {isInvLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <RefreshCw size={24} className="animate-spin" color="var(--accent-cyan)" />
                <div style={{ marginTop: '10px', fontSize: '13px' }}>Reconstructing 7-to-9 Journey Milestone Evidence Trail...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* First Detected Anomaly Highlight */}
                {investigationData?.investigation_result?.first_detected_anomaly && (
                  <div className="panel" style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                    <div style={{ fontSize: '11px', color: '#FB7185', fontWeight: '800', letterSpacing: '0.5px' }}>
                      FIRST DETECTED ANOMALY
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', marginTop: '3px' }}>
                      {investigationData.investigation_result.first_detected_anomaly.stage_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📍 Location: <b>{investigationData.investigation_result.first_detected_anomaly.location}</b> · Evidence: <b>{investigationData.investigation_result.first_detected_anomaly.evidence}</b>
                    </div>
                  </div>
                )}

                {/* Neutral AI Investigation Summary */}
                <div className="panel" style={{ padding: '16px 18px', background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    NEUTRAL AI INVESTIGATION SUMMARY
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#F1F5F9', margin: 0 }}>
                    "{investigationData?.investigation_result?.neutral_investigation_summary}"
                  </p>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    {investigationData?.investigation_result?.standard_disclaimer}
                  </div>
                </div>

                {/* Complete 7-to-9 Milestone Visual Evidence Chain */}
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', margin: '8px 0 0 0' }}>
                  Complete Digital Evidence Chain
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(investigationData?.journey_stages || []).map(st => {
                    const isFlagged = st.incident_flag || st.discrepancy_kg > 0 || st.temp_excursion_min > 0;
                    return (
                      <div
                        key={st.stage_id}
                        className="panel"
                        style={{
                          padding: '12px 14px',
                          borderLeft: `4px solid ${isFlagged ? '#EF4444' : '#10B981'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>
                            {st.stage_name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {st.timestamp_recorded ? new Date(st.timestamp_recorded).toLocaleString() : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          📍 <b>{st.stage_location}</b> · Custody: <b>{st.responsible_party}</b>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                          Evidence: {st.evidence_available}
                        </div>
                        {st.incident_summary && (
                          <div style={{ fontSize: '11px', color: isFlagged ? '#EF4444' : 'var(--text-secondary)', marginTop: '4px', fontWeight: isFlagged ? '600' : 'normal' }}>
                            {st.incident_summary}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: AI WHAT-IF COUNTERFACTUAL SIMULATOR */}
      {/* ========================================================================= */}
      {showWhatIfModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{
            maxWidth: '800px',
            width: '100%',
            padding: '24px',
            background: 'var(--bg-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#A855F7" />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', margin: 0 }}>
                    AI What-If Counterfactual Simulator
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Simulate alternative decisions without changing the actual live shipment
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowWhatIfModal(false)}
              >
                Close
              </button>
            </div>

            {/* Simulation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setWhatIfType('ALTERNATIVE_PORT'); handleRunSimulation(); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: whatIfType === 'ALTERNATIVE_PORT' ? '#8B5CF6' : 'var(--bg-panel)',
                  color: whatIfType === 'ALTERNATIVE_PORT' ? '#FFF' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ⚓ Alternative Port Call
              </button>

              <button
                type="button"
                onClick={() => { setWhatIfType('ALTERNATIVE_BUYER'); handleRunSimulation(); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: whatIfType === 'ALTERNATIVE_BUYER' ? '#8B5CF6' : 'var(--bg-panel)',
                  color: whatIfType === 'ALTERNATIVE_BUYER' ? '#FFF' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🔄 Sell Before Spoilage (Buyer)
              </button>

              <button
                type="button"
                onClick={() => { setWhatIfType('REEFER_RESET'); handleRunSimulation(); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: whatIfType === 'REEFER_RESET' ? '#8B5CF6' : 'var(--bg-panel)',
                  color: whatIfType === 'REEFER_RESET' ? '#FFF' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🧊 Emergency Reefer Reset
              </button>
            </div>

            {/* Side by Side Comparison Grid */}
            {whatIfResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px'
                }}>
                  {/* Current Plan */}
                  <div className="panel" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#EF4444' }}>CURRENT PLAN</div>
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>ETA:</span>
                        <b>{whatIfResult.current_plan.eta_hours} hours</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Risk Score:</span>
                        <b style={{ color: '#EF4444' }}>{whatIfResult.current_plan.risk_score}/100</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Shelf Life at Arrival:</span>
                        <b>{whatIfResult.current_plan.expected_shelf_life_at_arrival} hours</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: '#FB7185', fontWeight: '700' }}>Potential Loss:</span>
                        <b style={{ color: '#EF4444' }}>₹{whatIfResult.current_plan.potential_loss_inr.toLocaleString('en-IN')}</b>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Plan */}
                  <div className="panel" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-emerald)' }}>SIMULATED PLAN</div>
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Simulated ETA:</span>
                        <b style={{ color: 'var(--accent-emerald)' }}>{whatIfResult.simulated_plan.eta_hours} hours</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>New Risk Score:</span>
                        <b style={{ color: 'var(--accent-emerald)' }}>{whatIfResult.simulated_plan.risk_score}/100 (LOW)</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Shelf Life at Arrival:</span>
                        <b>{whatIfResult.simulated_plan.expected_shelf_life_at_arrival} hours</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: '700' }}>Reduced Loss:</span>
                        <b style={{ color: 'var(--accent-emerald)' }}>₹{whatIfResult.simulated_plan.potential_loss_inr.toLocaleString('en-IN')}</b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Improvement Callout */}
                <div className="panel" style={{ padding: '14px', background: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#C084FC', fontWeight: '800' }}>POTENTIAL FINANCIAL IMPROVEMENT</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', marginTop: '2px' }}>
                      ₹{whatIfResult.potential_improvement_inr.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Shelf-Life Gain: <b style={{ color: 'var(--accent-emerald-light)' }}>+{whatIfResult.shelf_life_gain_hours} hours</b>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {whatIfResult.disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: LOG BLACK BOX EVENT */}
      {/* ========================================================================= */}
      {showAddEventModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <form onSubmit={handleCreateBlackBoxEvent} className="card" style={{
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            background: 'var(--bg-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Append Container Black Box Event
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddEventModal(false)}
              >
                Cancel
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Event Type</label>
                <select
                  className="input"
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-panel)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                >
                  <option value="TEMP_EXCURSION">TEMP_EXCURSION (Thermal deviation)</option>
                  <option value="DOOR_EVENT">DOOR_EVENT (Door ajar)</option>
                  <option value="TEMP_RECOVERY">TEMP_RECOVERY (Thermostat normalized)</option>
                  <option value="PORT_GATE_IN">PORT_GATE_IN (Terminal arrival)</option>
                  <option value="CONTAINER_LOADED">CONTAINER_LOADED (Gantry crane stow)</option>
                  <option value="VESSEL_DELAY">VESSEL_DELAY (Weather delay)</option>
                  <option value="TRANSSHIPMENT_TRANSFER">TRANSSHIPMENT_TRANSFER (Vessel switch)</option>
                  <option value="SEAL_VERIFICATION">SEAL_VERIFICATION (Tamper check)</option>
                  <option value="FINAL_DISCHARGE">FINAL_DISCHARGE (Port outturn)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Location Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-panel)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                  value={newEvent.location_name}
                  onChange={(e) => setNewEvent({ ...newEvent, location_name: e.target.value })}
                  placeholder="e.g. Red Sea Central Channel or Port Quay 4"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    style={{ width: '100%', padding: '8px', background: 'var(--bg-panel)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                    value={newEvent.temperature}
                    onChange={(e) => setNewEvent({ ...newEvent, temperature: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Severity</label>
                  <select
                    className="input"
                    style={{ width: '100%', padding: '8px', background: 'var(--bg-panel)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                    value={newEvent.severity}
                    onChange={(e) => setNewEvent({ ...newEvent, severity: e.target.value })}
                  >
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Notes & Technical Observations</label>
                <textarea
                  rows="2"
                  className="input"
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-panel)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEventModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvent}
                  className="btn btn-primary"
                  style={{ background: 'var(--accent-cyan)', color: '#000', fontWeight: '700' }}
                >
                  {isSubmittingEvent ? 'Recording...' : 'Commit to Black Box'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
