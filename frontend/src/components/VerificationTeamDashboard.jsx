import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCheck, 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Scale, 
  Thermometer, 
  Droplets, 
  Camera, 
  ShieldCheck, 
  UserCheck, 
  RefreshCw, 
  ChevronRight, 
  FileText, 
  Truck, 
  Plane, 
  Ship, 
  Layers, 
  MapPin, 
  Calendar, 
  Check, 
  Sparkles, 
  ExternalLink,
  HelpCircle,
  Eye,
  BadgeCheck,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { 
  fetchConsignments, 
  fetchConsignmentDetail, 
  startPhysicalInspection, 
  submitInspectionDecision, 
  fetchVerificationOfficers, 
  fetchVerificationStats,
  getQrCodeUrl
} from '../api';
import { useAuth } from '../context/AuthContext';
import AiConsignmentInspector from './AiConsignmentInspector';

export default function VerificationTeamDashboard({ activeTab: externalTab, onNavigateTab }) {
  const { user } = useAuth();
  const [internalTab, setInternalTab] = useState('queue'); // 'queue' | 'conduct' | 'history' | 'analytics'

  useEffect(() => {
    if (!externalTab || externalTab === 'verification-queue' || externalTab === 'dashboard') {
      setInternalTab('queue');
    } else if (externalTab === 'conduct-inspection') {
      setInternalTab('queue'); // or open inspection modal
    } else if (externalTab === 'inspection-history') {
      setInternalTab('history');
    } else if (externalTab === 'verification-analytics') {
      setInternalTab('analytics');
    } else {
      setInternalTab(externalTab);
    }
  }, [externalTab]);

  const activeTab = internalTab;
  const setActiveTab = (tab) => {
    setInternalTab(tab);
    if (onNavigateTab) onNavigateTab(tab);
  };

  // Data states
  const [consignments, setConsignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection Modal & Selection
  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionDetail, setInspectionDetail] = useState(null);
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // Inspection Form State (8-Point Checklist + Quantitative Inputs)
  const [inspectionForm, setInspectionForm] = useState({
    inspection_location: 'Sahyadri Farm Packhouse Dock #1, Dindori Road, Nashik',
    inspection_facility_type: 'Certified Packhouse Dock',
    
    // 8-Point Checklist
    actual_material_condition_verified: true,
    actual_weight_verified: true,
    visible_damage_detected: false,
    contamination_spoilage_detected: false,
    packaging_labelling_compliant: true,
    temp_within_required_range: true,
    supporting_docs_verified: true,
    transport_mode_suitability_confirmed: true,

    // Quantitative inputs
    verified_quantity_kg: 0.0,
    measured_temperature: 11.2,
    measured_humidity: 84.0,
    measured_brix_level: 16.5,
    verified_quality_grade: 'Grade A (Export Certified GI)',
    verified_packaging_condition: '5-ply ventilated CFB export cartons with tamper-evident security holographic tape',
    
    evaluated_mode: 'ROAD',
    mode_suitability_result: 'SUITABLE_AS_REQUESTED',
    mode_suitability_notes: 'Pulp temperature complies with reefer transport parameters. Cartons are stackable up to 8 high.',
    
    discrepancies: [],
    corrective_actions_required: '',
    officer_evidence_photos: [
      'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800',
      'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800'
    ],
    
    inspection_result: 'APPROVED', // 'APPROVED' | 'REQUIRES_CORRECTION' | 'REJECTED'
    officer_remarks: 'All 8 physical checklist items verified on site. Digital scale calibrated. Net weight and temperature meet export specifications.'
  });

  // Discrepancy sub-form
  const [newDiscrepancy, setNewDiscrepancy] = useState({
    item: 'Net Weight',
    declared: '',
    verified: '',
    variance: '',
    status: 'WITHIN_TOLERANCE',
    notes: ''
  });

  // Report Modal
  const [viewingReportConsignment, setViewingReportConsignment] = useState(null);

  // Load all verification data
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [consRes, statsRes, offRes] = await Promise.allSettled([
        fetchConsignments({ limit: 100 }),
        fetchVerificationStats(),
        fetchVerificationOfficers()
      ]);

      if (consRes.status === 'fulfilled' && consRes.value?.data) {
        setConsignments(consRes.value.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }
      if (offRes.status === 'fulfilled' && offRes.value?.data) {
        setOfficers(offRes.value.data);
      }
    } catch (err) {
      console.error('Error loading verification dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Inspection Flow
  const handleOpenInspection = async (consignment) => {
    setSelectedConsignment(consignment);
    setLoading(true);
    try {
      const detailRes = await fetchConsignmentDetail(consignment.consignment_id);
      setInspectionDetail(detailRes.data);

      // Pre-fill form from consignment baseline
      const c = detailRes.data.consignment;
      setInspectionForm(prev => ({
        ...prev,
        inspection_location: `${c.pickup_location}, ${c.pickup_city}`,
        verified_quantity_kg: parseFloat(c.declared_quantity_kg) || 1000.0,
        measured_temperature: parseFloat(c.target_temp_min) + 1.2 || 11.2,
        evaluated_mode: c.preferred_transport_mode || 'ROAD',
        verified_quality_grade: c.variety ? `Grade A (${c.variety})` : 'Grade A (Export Ready)',
        verified_packaging_condition: `${c.packaging_type} with tamper-evident seal`,
        mode_suitability_notes: `Pre-cooled at farm gate. Suitable for ${c.preferred_transport_mode} transport.`,
        officer_remarks: `Batch physically inspected at ${c.pickup_city} facility. 8-point physical checklist verified.`
      }));

      setShowInspectionModal(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch consignment details.' });
    } finally {
      setLoading(false);
    }
  };

  // Start Inspection action (UNDER_INSPECTION)
  const handleStartInspection = async (consignmentId) => {
    try {
      await startPhysicalInspection(consignmentId);
      setFeedback({ type: 'success', message: `Physical inspection started for Consignment #${consignmentId}. Status is now UNDER_INSPECTION.` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to start physical inspection.' });
    }
  };

  // Add Discrepancy
  const handleAddDiscrepancy = () => {
    if (!newDiscrepancy.item) return;
    setInspectionForm(prev => ({
      ...prev,
      discrepancies: [...prev.discrepancies, { ...newDiscrepancy }]
    }));
    setNewDiscrepancy({
      item: 'Pulp Temperature',
      declared: '',
      verified: '',
      variance: '',
      status: 'NON_COMPLIANT',
      notes: ''
    });
  };

  const handleRemoveDiscrepancy = (idx) => {
    setInspectionForm(prev => ({
      ...prev,
      discrepancies: prev.discrepancies.filter((_, i) => i !== idx)
    }));
  };

  // Submit Decision Action
  const handleSubmitDecision = async (decision) => {
    if (!selectedConsignment) return;
    setSubmittingInspection(true);
    setFeedback(null);
    try {
      const payload = {
        inspection_location: inspectionForm.inspection_location,
        inspection_facility_type: inspectionForm.inspection_facility_type,
        actual_material_condition_verified: inspectionForm.actual_material_condition_verified,
        actual_weight_verified: inspectionForm.actual_weight_verified,
        visible_damage_detected: inspectionForm.visible_damage_detected,
        contamination_spoilage_detected: inspectionForm.contamination_spoilage_detected,
        packaging_labelling_compliant: inspectionForm.packaging_labelling_compliant,
        temp_within_required_range: inspectionForm.temp_within_required_range,
        supporting_docs_verified: inspectionForm.supporting_docs_verified,
        transport_mode_suitability_confirmed: inspectionForm.transport_mode_suitability_confirmed,
        verified_quantity_kg: parseFloat(inspectionForm.verified_quantity_kg),
        measured_temperature: parseFloat(inspectionForm.measured_temperature),
        measured_humidity: parseFloat(inspectionForm.measured_humidity),
        measured_brix_level: parseFloat(inspectionForm.measured_brix_level),
        verified_quality_grade: inspectionForm.verified_quality_grade,
        verified_packaging_condition: inspectionForm.verified_packaging_condition,
        evaluated_mode: inspectionForm.evaluated_mode,
        mode_suitability_result: inspectionForm.mode_suitability_result,
        mode_suitability_notes: inspectionForm.mode_suitability_notes,
        discrepancies_found: inspectionForm.discrepancies,
        corrective_actions_required: decision === 'REQUIRES_CORRECTION' ? inspectionForm.corrective_actions_required : null,
        officer_evidence_photos: inspectionForm.officer_evidence_photos,
        inspection_result: decision,
        officer_remarks: inspectionForm.officer_remarks
      };

      const res = await submitInspectionDecision(selectedConsignment.consignment_id, payload);
      setFeedback({
        type: 'success',
        message: `Physical inspection submitted successfully! Result: ${decision}. ${res.data?.consignment?.verification_reference_no ? `Generated VRF #${res.data.consignment.verification_reference_no}. Booking unlocked.` : ''}`
      });
      setShowInspectionModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit physical inspection decision.' });
    } finally {
      setSubmittingInspection(false);
    }
  };

  // Filtered consignments
  const filteredConsignments = consignments.filter(c => {
    if (statusFilter !== 'ALL' && c.verification_status !== statusFilter) return false;
    if (modeFilter !== 'ALL' && c.preferred_transport_mode !== modeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (
        c.consignment_id?.toLowerCase().includes(q) ||
        c.consignment_reference?.toLowerCase().includes(q) ||
        c.product_name?.toLowerCase().includes(q) ||
        c.customer_name?.toLowerCase().includes(q) ||
        c.pickup_city?.toLowerCase().includes(q) ||
        c.verification_reference_no?.toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    return true;
  });

  const pendingCount = consignments.filter(c => c.verification_status === 'PENDING_VERIFICATION').length;
  const scheduledCount = consignments.filter(c => c.verification_status === 'INSPECTION_SCHEDULED').length;
  const underInspCount = consignments.filter(c => c.verification_status === 'UNDER_INSPECTION').length;
  const approvedCount = consignments.filter(c => ['APPROVED', 'BOOKING_CONFIRMED', 'READY_FOR_DISPATCH', 'IN_TRANSIT', 'DELIVERED'].includes(c.verification_status)).length;
  const correctionCount = consignments.filter(c => c.verification_status === 'REQUIRES_CORRECTION').length;
  const rejectedCount = consignments.filter(c => c.verification_status === 'REJECTED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. TOP HEADER & OFFICER IDENTITY BANNER */}
      <div className="card" style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)',
        border: '1px solid #BAE6FD',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#0284C7',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
            }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 className="font-display" style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
                  AGRITRUST Physical Consignment Verification Unit
                </h1>
                <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: '700', fontSize: '11px' }}>
                  <BadgeCheck size={13} />
                  <span>AUTHORITY ACTIVE</span>
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                Mandatory farm-gate & dock physical inspection, weight calibration, cold-chain compliance & transport eligibility sign-off
              </p>
            </div>
          </div>

          {/* Officer identity chip */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            background: '#FFFFFF', 
            padding: '10px 16px', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid #E2E8F0',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px'
            }}>
              SS
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                {user?.full_name || 'Sunil Shinde'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Badge: <b style={{ color: '#0284C7' }}>AGRI-INSP-0441</b> · Senior Cold-Chain Inspector
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => loadData(true)} 
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: '8px', padding: '6px 10px' }}
              title="Refresh Work Queue"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div style={{
            marginTop: '16px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'error' ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${feedback.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
            color: feedback.type === 'error' ? '#991B1B' : '#166534',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {feedback.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              <span>{feedback.message}</span>
            </div>
            <button 
              type="button"
              onClick={() => setFeedback(null)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: '700' }}
            >
              ×
            </button>
          </div>
        )}

        {/* 2. KPI METRICS RIBBON */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '14px', 
          marginTop: '20px' 
        }}>
          
          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
              Pending Inspection
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706', marginTop: '4px' }}>
              {pendingCount + scheduledCount}
            </div>
            <div style={{ fontSize: '11px', color: '#D97706', marginTop: '2px' }}>
              {pendingCount} new · {scheduledCount} scheduled
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
              Under Inspection
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284C7', marginTop: '4px' }}>
              {underInspCount}
            </div>
            <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '2px' }}>
              Active on-dock physical checks
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
              Approved (VRF Issued)
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#16A34A', marginTop: '4px' }}>
              {approvedCount}
            </div>
            <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>
              Eligible for 3-mode booking
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
              Corrections Mandated
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#EA580C', marginTop: '4px' }}>
              {correctionCount}
            </div>
            <div style={{ fontSize: '11px', color: '#EA580C', marginTop: '2px' }}>
              Awaiting farm rectification
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
              Avg Turnaround Time
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
              {stats?.inspection_metrics?.avg_duration_hours || 2.2}h
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Inspection gate efficiency
            </div>
          </div>

        </div>

      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: '700' }}
        >
          <ClipboardCheck size={16} />
          <span>Active Work Queue ({consignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai-inspector')}
          className={`btn ${activeTab === 'ai-inspector' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: '700', background: activeTab === 'ai-inspector' ? '#0284C7' : '#FFFFFF', color: activeTab === 'ai-inspector' ? '#FFFFFF' : '#0284C7', border: '1px solid #7DD3FC' }}
        >
          <Sparkles size={16} />
          <span>AI Quality Inspector & Vision Defect Scan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: '700' }}
        >
          <FileText size={16} />
          <span>Verified Reports & Reinspections</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: '700' }}
        >
          <BarChart3 size={16} />
          <span>Verification Turnaround Analytics</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* VIEW 1: ACTIVE WORK QUEUE & INSPECTION ASSIGNMENTS            */}
      {/* ============================================================= */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* SEARCH & FILTERS BAR */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder="Search Consignment ID, VRF reference, Farmer, Product, City..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-input"
                  style={{ height: '38px', fontSize: '12px', padding: '0 10px', fontWeight: '600' }}
                >
                  <option value="ALL">All Statuses ({consignments.length})</option>
                  <option value="PENDING_VERIFICATION">Pending Verification ({pendingCount})</option>
                  <option value="INSPECTION_SCHEDULED">Inspection Scheduled ({scheduledCount})</option>
                  <option value="UNDER_INSPECTION">Under Inspection ({underInspCount})</option>
                  <option value="APPROVED">Approved ({approvedCount})</option>
                  <option value="REQUIRES_CORRECTION">Requires Correction ({correctionCount})</option>
                  <option value="REJECTED">Rejected ({rejectedCount})</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Mode:</span>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="form-input"
                  style={{ height: '38px', fontSize: '12px', padding: '0 10px' }}
                >
                  <option value="ALL">All Modes</option>
                  <option value="ROAD">Road Logistics</option>
                  <option value="AIR">Air Cargo</option>
                  <option value="MARINE">Marine Freight</option>
                </select>
              </div>
            </div>

          </div>

          {/* CONSIGNMENT WORK QUEUE TABLE */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                Consignment Physical Verification Queue
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Showing {filteredConsignments.length} consignments
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#475569', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px' }}>Consignment & Ref</th>
                    <th style={{ padding: '12px 16px' }}>Producer / Farm</th>
                    <th style={{ padding: '12px 16px' }}>Produce & Declared Qty</th>
                    <th style={{ padding: '12px 16px' }}>Pickup → Destination</th>
                    <th style={{ padding: '12px 16px' }}>Mode Req</th>
                    <th style={{ padding: '12px 16px' }}>Verification Status</th>
                    <th style={{ padding: '12px 16px' }}>VRF Certificate</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsignments.map((c) => {
                    const statusBg = {
                      'PENDING_VERIFICATION': '#FEF3C7',
                      'INSPECTION_SCHEDULED': '#E0F2FE',
                      'UNDER_INSPECTION': '#DBEAFE',
                      'APPROVED': '#DCFCE7',
                      'REQUIRES_CORRECTION': '#FFEDD5',
                      'REJECTED': '#FEE2E2',
                      'BOOKING_CONFIRMED': '#DCFCE7',
                      'READY_FOR_DISPATCH': '#DCFCE7',
                      'IN_TRANSIT': '#E0E7FF',
                      'DELIVERED': '#F0FDF4'
                    }[c.verification_status] || '#F1F5F9';

                    const statusColor = {
                      'PENDING_VERIFICATION': '#B45309',
                      'INSPECTION_SCHEDULED': '#0369A1',
                      'UNDER_INSPECTION': '#1D4ED8',
                      'APPROVED': '#15803D',
                      'REQUIRES_CORRECTION': '#C2410C',
                      'REJECTED': '#B91C1C',
                      'BOOKING_CONFIRMED': '#15803D',
                      'READY_FOR_DISPATCH': '#15803D',
                      'IN_TRANSIT': '#4338CA',
                      'DELIVERED': '#166534'
                    }[c.verification_status] || '#475569';

                    return (
                      <tr key={c.consignment_id} style={{ borderBottom: '1px solid #E2E8F0', color: '#0F172A' }}>
                        
                        <td style={{ padding: '14px 16px' }}>
                          <div className="font-mono" style={{ fontWeight: '800', color: '#0284C7' }}>
                            {c.consignment_id}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {c.consignment_reference}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#0F172A' }}>{c.customer_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{c.customer_phone}</div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#0F172A' }}>{c.product_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Declared: <b style={{ color: '#0F172A' }}>{c.declared_quantity_kg} kg</b>
                            {c.verified_quantity_kg && (
                              <span style={{ color: '#16A34A', marginLeft: '6px' }}>
                                (Verified: {c.verified_quantity_kg} kg)
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                          <div style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            🟢 <b>{c.pickup_city}</b> ({c.pickup_pincode})
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            🏁 {c.destination_city} ({c.destination_pincode})
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            color: '#334155'
                          }}>
                            {c.preferred_transport_mode === 'ROAD' && <Truck size={12} color="#0284C7" />}
                            {c.preferred_transport_mode === 'AIR' && <Plane size={12} color="#9333EA" />}
                            {c.preferred_transport_mode === 'MARINE' && <Ship size={12} color="#0D9488" />}
                            <span>{c.preferred_transport_mode}</span>
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            background: statusBg,
                            color: statusColor,
                            letterSpacing: '0.02em',
                            display: 'inline-block'
                          }}>
                            {c.verification_status.replace(/_/g, ' ')}
                          </span>
                          {c.assigned_officer_name && (
                            <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                              👮 {c.assigned_officer_name.split(' ')[0]}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {c.verification_reference_no ? (
                            <div className="font-mono" style={{ fontSize: '11px', fontWeight: '800', color: '#15803D', background: '#DCFCE7', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid #86EFAC' }}>
                              ✓ {c.verification_reference_no}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Unverified</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            
                            {c.verification_status === 'PENDING_VERIFICATION' && (
                              <button
                                type="button"
                                onClick={() => handleStartInspection(c.consignment_id)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11px', padding: '4px 8px', color: '#0284C7', borderColor: '#BAE6FD' }}
                              >
                                Start Inspect
                              </button>
                            )}

                            {['INSPECTION_SCHEDULED', 'UNDER_INSPECTION', 'REQUIRES_CORRECTION'].includes(c.verification_status) && (
                              <button
                                type="button"
                                onClick={() => handleOpenInspection(c)}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#059669', borderColor: '#059669' }}
                              >
                                <ClipboardCheck size={12} />
                                <span>Conduct Checklist</span>
                              </button>
                            )}

                            {c.verification_reference_no && (
                              <button
                                type="button"
                                onClick={() => setViewingReportConsignment(c)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11px', padding: '4px 8px', color: '#15803D', borderColor: '#BBF7D0' }}
                              >
                                <FileText size={12} />
                                <span>Report</span>
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                  {filteredConsignments.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                        No consignments matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================= */}
      {/* VIEW 2: VERIFIED REPORTS & AUDIT ARCHIVE                      */}
      {/* ============================================================= */}
      {activeTab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {consignments.filter(c => c.latest_inspection).map(c => {
            const insp = c.latest_inspection;
            const isApproved = insp?.inspection_result === 'APPROVED';
            return (
              <div key={c.consignment_id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${isApproved ? '#16A34A' : '#DC2626'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className="badge" style={{ 
                      background: isApproved ? '#DCFCE7' : '#FEE2E2', 
                      color: isApproved ? '#15803D' : '#991B1B', 
                      fontWeight: '800',
                      fontSize: '11px' 
                    }}>
                      {insp.inspection_result}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
                      {c.product_name}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Consignment #{c.consignment_id} · {c.customer_name}
                    </div>
                  </div>
                  
                  {insp.verification_reference_no && (
                    <div className="font-mono" style={{ fontSize: '11px', fontWeight: '800', color: '#15803D', background: '#F0FDF4', padding: '4px 8px', borderRadius: '4px', border: '1px solid #BBF7D0' }}>
                      {insp.verification_reference_no}
                    </div>
                  )}
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Verified Quantity:</span>
                    <b style={{ color: '#0F172A' }}>{insp.verified_quantity_kg} kg</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Pulp Temperature:</span>
                    <b style={{ color: '#0284C7' }}>{insp.measured_temperature}°C</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Inspected By:</span>
                    <span style={{ color: '#0F172A' }}>{insp.officer_name} ({insp.officer_badge})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Date Verified:</span>
                    <span style={{ color: '#64748B' }}>{new Date(insp.inspection_completed_at).toLocaleString()}</span>
                  </div>
                </div>

                {insp.officer_remarks && (
                  <div style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', background: '#FFFFFF', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
                    "{insp.officer_remarks}"
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setViewingReportConsignment(c)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Eye size={13} />
                  <span>View Full Verification Dossier</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================= */}
      {/* VIEW 3: VERIFICATION PERFORMANCE ANALYTICS                   */}
      {/* ============================================================= */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '14px' }}>
              Physical Inspection Quality Gate Efficiency
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>First-Time Approval Rate:</span>
                  <b style={{ color: '#16A34A' }}>91.8%</b>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '91.8%', height: '100%', background: '#16A34A' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Requiring Correction / Re-packaging:</span>
                  <b style={{ color: '#EA580C' }}>5.4%</b>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '5.4%', height: '100%', background: '#EA580C' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Strict Quality Rejections:</span>
                  <b style={{ color: '#DC2626' }}>2.8%</b>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '2.8%', height: '100%', background: '#DC2626' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '14px' }}>
              Top Quality Gate Discrepancy Factors
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ padding: '10px 12px', background: '#FEF2F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA', color: '#991B1B' }}>
                <b>Pulp Core Temperature Excursion</b> · 44% of non-compliant batches lacked proper pre-cooling at harvest.
              </div>
              <div style={{ padding: '10px 12px', background: '#FFFBEB', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A', color: '#92400E' }}>
                <b>Carton Tamper Seal Absence</b> · 32% of correction mandates were due to missing holographic security bands.
              </div>
              <div style={{ padding: '10px 12px', background: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                <b>Weight Declared vs Calibrated Variance</b> · 24% exhibited moisture evaporation variance exceeding 2.0%.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================= */}
      {/* VIEW 4: AI QUALITY INSPECTOR & DEFECT SCAN                   */}
      {/* ============================================================= */}
      {activeTab === 'ai-inspector' && (
        <AiConsignmentInspector onNavigateConsignment={(cId) => {
          setSelectedConsignmentId(cId);
        }} />
      )}

      {/* ============================================================= */}
      {/* MODAL: INTERACTIVE 8-POINT PHYSICAL INSPECTION CHECKLIST       */}
      {/* ============================================================= */}
      {showInspectionModal && selectedConsignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '92vh',
            overflowY: 'auto',
            border: '1px solid #BAE6FD',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ClipboardCheck size={22} color="#0284C7" />
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                    Conduct Physical Inspection Checklist
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Consignment #{selectedConsignment.consignment_id} · Producer: <b style={{ color: '#0F172A' }}>{selectedConsignment.customer_name}</b>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="btn btn-secondary btn-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* DECLARED BASELINE BANNER */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Declared Harvest Baseline
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div>Produce: <b style={{ color: '#0F172A' }}>{selectedConsignment.product_name}</b> ({selectedConsignment.variety})</div>
                  <div>Declared Weight: <b style={{ color: '#0F172A' }}>{selectedConsignment.declared_quantity_kg} kg</b></div>
                  <div>Target Temp Bracket: <b style={{ color: '#0284C7' }}>{selectedConsignment.target_temp_min}°C – {selectedConsignment.target_temp_max}°C</b></div>
                  <div>Requested Mode: <b style={{ color: '#0F172A' }}>{selectedConsignment.preferred_transport_mode}</b></div>
                  <div>Pickup Dock: <span style={{ color: '#475569' }}>{selectedConsignment.pickup_location}</span></div>
                  <div>Destination: <span style={{ color: '#475569' }}>{selectedConsignment.destination_location}</span></div>
                </div>
              </div>

              {/* SECTION A: 8-POINT MANDATORY PHYSICAL CHECKLIST */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck2 size={18} color="#059669" />
                  <span>8-Point Mandatory Physical Checklist</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '10px' }}>
                  
                  {[
                    { key: 'actual_material_condition_verified', label: '1. Actual Material / Product Condition Verified', desc: 'Soundness, firmness, export color blush and maturity confirmed.' },
                    { key: 'actual_weight_verified', label: '2. Actual Net Weight Digitally Verified', desc: 'Weighed on certified calibrated digital platform scale.' },
                    { key: 'visible_damage_detected', label: '3. Visible Damage / Mechanical Bruising Found', desc: 'Toggle ON if carton impact or crushing damage is observed.', isNegative: true },
                    { key: 'contamination_spoilage_detected', label: '4. Fungal Rot / Spoilage / Pests Found', desc: 'Toggle ON if fungal rot, lesions or pest infestation is present.', isNegative: true },
                    { key: 'packaging_labelling_compliant', label: '5. Packaging, Venting & Security Labels Compliant', desc: '5-ply CFB cartons, SO2 pads, tamper-evident seals verified.' },
                    { key: 'temp_within_required_range', label: '6. Core Pulp Temperature in Target Bracket', desc: 'Calibrated digital probe confirms core temp meets pre-cooling spec.' },
                    { key: 'supporting_docs_verified', label: '7. Regulatory & Phytosanitary Docs in Order', desc: 'APMC declaration, lab pesticide residue & origin certificates valid.' },
                    { key: 'transport_mode_suitability_confirmed', label: '8. Suitability for Requested Transport Mode', desc: 'Produce condition, stackability and shelf-life match requested mode.' }
                  ].map((chk) => (
                    <label 
                      key={chk.key} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '12px', 
                        padding: '12px 14px', 
                        borderRadius: 'var(--radius-md)', 
                        background: '#FFFFFF', 
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={inspectionForm[chk.key]}
                        onChange={(e) => setInspectionForm(prev => ({ ...prev, [chk.key]: e.target.checked }))}
                        style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: chk.isNegative ? '#DC2626' : '#059669' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                          {chk.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {chk.desc}
                        </div>
                      </div>
                    </label>
                  ))}

                </div>
              </div>

              {/* SECTION B: QUANTITATIVE MEASUREMENTS */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} color="#0284C7" />
                  <span>Quantitative Physical Measurements</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Verified Net Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={inspectionForm.verified_quantity_kg}
                      onChange={(e) => setInspectionForm(prev => ({ ...prev, verified_quantity_kg: e.target.value }))}
                      className="form-input"
                    />
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Declared: {selectedConsignment.declared_quantity_kg} kg ({parseFloat(inspectionForm.verified_quantity_kg) - parseFloat(selectedConsignment.declared_quantity_kg)} kg variance)
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Core Pulp Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={inspectionForm.measured_temperature}
                      onChange={(e) => setInspectionForm(prev => ({ ...prev, measured_temperature: e.target.value }))}
                      className="form-input"
                    />
                    <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '2px' }}>
                      Target: {selectedConsignment.target_temp_min}°C to {selectedConsignment.target_temp_max}°C
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Relative Humidity (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={inspectionForm.measured_humidity}
                      onChange={(e) => setInspectionForm(prev => ({ ...prev, measured_humidity: e.target.value }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Brix Sweetness (°Bx)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={inspectionForm.measured_brix_level}
                      onChange={(e) => setInspectionForm(prev => ({ ...prev, measured_brix_level: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: DISCREPANCIES & CORRECTIVE ACTIONS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} color="#D97706" />
                    <span>Discrepancies & Variances</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddDiscrepancy}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px' }}
                  >
                    + Add Discrepancy Item
                  </button>
                </div>

                {inspectionForm.discrepancies.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {inspectionForm.discrepancies.map((d, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: '#FFFBEB', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <div>
                          <b>{d.item}</b>: Declared {d.declared || 'N/A'} vs Verified {d.verified || 'N/A'} ({d.variance}) · <span style={{ color: '#D97706' }}>{d.status}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveDiscrepancy(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: '700' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Mandatory Corrective Actions (if Requires Correction)</label>
                  <textarea
                    rows={2}
                    placeholder="Specify exact corrective steps required before reinspection (e.g. re-cool pulp to <= 3°C, apply tamper holographic bands)..."
                    value={inspectionForm.corrective_actions_required}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, corrective_actions_required: e.target.value }))}
                    className="form-input"
                    style={{ fontSize: '12px', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* SECTION D: OFFICER EVIDENCE PHOTOS */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={18} color="#0284C7" />
                  <span>Officer Physical Evidence Photos (Camera Capture)</span>
                </h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {inspectionForm.officer_evidence_photos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Evidence"
                      style={{ width: '90px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}
                    />
                  ))}
                  <div style={{
                    width: '90px',
                    height: '70px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px dashed #BAE6FD',
                    background: '#F0F9FF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284C7',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}>
                    <Camera size={16} />
                    <span>Attach Photo</span>
                  </div>
                </div>
              </div>

              {/* SECTION E: REMARKS */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Formal Inspecting Officer Remarks</label>
                <textarea
                  rows={2}
                  value={inspectionForm.officer_remarks}
                  onChange={(e) => setInspectionForm(prev => ({ ...prev, officer_remarks: e.target.value }))}
                  className="form-input"
                  style={{ fontSize: '13px' }}
                />
              </div>

            </div>

            {/* Modal Footer & Decision Actions */}
            <div style={{
              padding: '18px 24px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Signed by Officer: <b style={{ color: '#0F172A' }}>{user?.full_name || 'Sunil Shinde'}</b> (AGRI-INSP-0441)
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  disabled={submittingInspection}
                  onClick={() => handleSubmitDecision('REJECTED')}
                  className="btn btn-secondary"
                  style={{ color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
                >
                  <XCircle size={15} />
                  <span>Reject Consignment</span>
                </button>

                <button
                  type="button"
                  disabled={submittingInspection}
                  onClick={() => handleSubmitDecision('REQUIRES_CORRECTION')}
                  className="btn btn-secondary"
                  style={{ color: '#EA580C', borderColor: '#FED7AA', background: '#FFF7ED' }}
                >
                  <AlertTriangle size={15} />
                  <span>Requires Correction</span>
                </button>

                <button
                  type="button"
                  disabled={submittingInspection}
                  onClick={() => handleSubmitDecision('APPROVED')}
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', padding: '10px 24px', fontWeight: '800' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{submittingInspection ? 'Submitting...' : '✓ Approve & Issue VRF Certificate'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: FULL VERIFICATION REPORT & CERTIFICATE DOSSIER          */}
      {/* ============================================================= */}
      {viewingReportConsignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid #BAE6FD',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={26} color="#059669" />
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
                    AGRITRUST Official Physical Verification Certificate
                  </h2>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Certificate Hash: <span className="font-mono">AGRI-CERT-2026-{viewingReportConsignment.consignment_id}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: '#15803D', background: '#DCFCE7', padding: '4px 12px', borderRadius: '6px', border: '1px solid #86EFAC' }}>
                  ✓ {viewingReportConsignment.verification_reference_no || 'VRF-VERIFIED'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Status: <b style={{ color: '#15803D' }}>{viewingReportConsignment.verification_status}</b>
                </div>
              </div>
            </div>

            {/* Certificate Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                <div>Producer / Farmer: <b style={{ color: '#0F172A' }}>{viewingReportConsignment.customer_name}</b></div>
                <div>Produce: <b style={{ color: '#0F172A' }}>{viewingReportConsignment.product_name}</b></div>
                <div>Verified Net Weight: <b style={{ color: '#15803D' }}>{viewingReportConsignment.verified_quantity_kg || viewingReportConsignment.declared_quantity_kg} kg</b></div>
                <div>Quality Grade: <b style={{ color: '#0F172A' }}>{viewingReportConsignment.verified_quality_grade || 'Grade A'}</b></div>
                <div>Pulp Temperature: <b style={{ color: '#0284C7' }}>{viewingReportConsignment.verified_temperature || 11.2}°C</b></div>
                <div>Inspecting Officer: <b style={{ color: '#0F172A' }}>{viewingReportConsignment.assigned_officer_name || 'Sunil Shinde'}</b></div>
              </div>

              {viewingReportConsignment.inspection_decision_notes && (
                <div style={{ padding: '14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803D', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Officer Physical Verification Assessment
                  </div>
                  <div style={{ color: '#14532D', fontSize: '13px' }}>
                    {viewingReportConsignment.inspection_decision_notes}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Verified under AGRITRUST Protocol 2026. This certificate permits transport booking across Road, Air, and Marine modes.
                </div>
                <button
                  type="button"
                  onClick={() => setViewingReportConsignment(null)}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '6px 16px' }}
                >
                  Close Dossier
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
