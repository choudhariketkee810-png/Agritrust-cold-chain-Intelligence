import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Truck, 
  Warehouse, 
  ShoppingBag, 
  AlertTriangle, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Sliders, 
  Eye, 
  UserPlus, 
  Lock, 
  Clock, 
  Layers, 
  Cpu, 
  Check, 
  ChevronRight, 
  TrendingUp, 
  BarChart3, 
  ExternalLink,
  ClipboardCheck,
  Scale,
  FileCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  fetchAdminStats, 
  fetchAdminUsers, 
  updateAdminUserStatus, 
  fetchAdminDisputes, 
  resolveAdminDispute, 
  fetchAdminAuditLogs, 
  fetchAdminAnalytics, 
  provisionAdmin,
  fetchRecentAlerts,
  fetchConsignments,
  fetchVerificationOfficers,
  assignVerificationOfficer,
  fetchVerificationStats,
  adminExceptionApproval,
  fetchConsignmentDetail
} from '../api';
import SpoilageControlCenter from './SpoilageControlCenter';

export default function AdminDashboard({
  activeTab: externalTab,
  onNavigateToView,
  shipments = [],
  fleetMonitoring = [],
  alertsList = [],
  incidentsList = []
}) {
  const [internalTab, setInternalTab] = useState('governance');

  // Sync external tab from Admin sidebar
  useEffect(() => {
    if (!externalTab || externalTab === 'control-tower' || externalTab === 'dashboard') {
      setInternalTab('governance');
    } else if (['farmer-mgmt', 'logistics-mgmt', 'cold-storage-mgmt', 'buyer-mgmt', 'user-mgmt', 'user-management'].includes(externalTab)) {
      setInternalTab('users');
    } else if (externalTab === 'disputes') {
      setInternalTab('disputes');
    } else if (['audit-logs', 'audit'].includes(externalTab)) {
      setInternalTab('audit');
    } else if (['system-analytics', 'logistics-analytics', 'loss-analytics', 'temperature-compliance', 'analytics'].includes(externalTab)) {
      setInternalTab('analytics');
    } else if (externalTab === 'spoilage') {
      setInternalTab('spoilage-control');
    } else if (['admin-governance', 'verification-approvals', 'verification-governance', 'verification-oversight'].includes(externalTab)) {
      setInternalTab('verification-governance');
    } else if (['cold-storage-oversight'].includes(externalTab)) {
      setInternalTab('cold-storage-oversight');
    } else if (['system-settings'].includes(externalTab)) {
      setInternalTab('system-settings');
    } else {
      setInternalTab(externalTab);
    }
  }, [externalTab]);

  const activeTab = internalTab;
  const setActiveTab = (tabId) => {
    setInternalTab(tabId);
    if (onNavigateToView) onNavigateToView(tabId);
  };


  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [consignments, setConsignments] = useState([]);
  const [verificationOfficers, setVerificationOfficers] = useState([]);
  const [verificationStats, setVerificationStats] = useState(null);

  // Search & Filters
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedDisputeForResolve, setSelectedDisputeForResolve] = useState(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Verification Officer Assignment & Exception Modals
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [selectedConsignmentForAssign, setSelectedConsignmentForAssign] = useState(null);
  const [officerAssignForm, setOfficerAssignForm] = useState({
    officer_id: '',
    scheduled_inspection_time: '',
    assignment_notes: 'Priority dispatch to farm gate.'
  });

  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedConsignmentForException, setSelectedConsignmentForException] = useState(null);
  const [exceptionForm, setExceptionForm] = useState({
    override_reason: 'APEDA certified pre-cooling batch with secondary lab report verification.',
    approved_verified_quantity: 0,
    compliance_justification: 'Physical packaging conforms with export standard ISO 22000. Verified via accredited packhouse supervisor.',
    supporting_document_reference: 'APEDA-LAB-EXP-2026-991'
  });

  const [showConsignmentDetailModal, setShowConsignmentDetailModal] = useState(false);
  const [selectedConsignmentDetail, setSelectedConsignmentDetail] = useState(null);

  // Forms
  const [resolveForm, setResolveForm] = useState({
    status: 'RESOLVED',
    admin_resolution: 'Carrier telemetry verified thermal excursion above 16.0°C during Igatpuri transit. 50% loss claim awarded to Buyer from carrier escrow reserve.',
    settlement_amount: 12500.0,
    settlement_party: 'LOGISTICS'
  });

  const [provisionForm, setProvisionForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '+91 98200 '
  });

  // Load Admin data
  const loadAdminData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [statsRes, usrRes, dispRes, audRes, analRes, consRes, offRes, verifStatRes] = await Promise.allSettled([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminDisputes(),
        fetchAdminAuditLogs(100),
        fetchAdminAnalytics(),
        fetchConsignments(),
        fetchVerificationOfficers(),
        fetchVerificationStats()
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.stats || null);
      if (usrRes.status === 'fulfilled') setUsers(usrRes.value?.data || []);
      if (dispRes.status === 'fulfilled') setDisputes(dispRes.value?.data || []);
      if (audRes.status === 'fulfilled') setAuditLogs(audRes.value?.data || []);
      if (analRes.status === 'fulfilled') setAnalytics(analRes.value || null);
      if (consRes.status === 'fulfilled') setConsignments(consRes.value?.data || []);
      if (offRes.status === 'fulfilled') setVerificationOfficers(offRes.value?.data || []);
      if (verifStatRes.status === 'fulfilled') setVerificationStats(verifStatRes.value || null);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
    const timer = setInterval(() => loadAdminData(false), 5000);
    return () => clearInterval(timer);
  }, [loadAdminData]);;

  // Toggle User Active Status
  const handleToggleUserStatus = async (userId, currentActive) => {
    setFeedback(null);
    try {
      await updateAdminUserStatus(userId, { is_active: !currentActive });
      setFeedback({ type: 'success', message: `User account status updated successfully!` });
      loadAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Resolve Dispute
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDisputeForResolve) return;
    setFeedback(null);
    try {
      const payload = {
        status: resolveForm.status,
        admin_resolution: resolveForm.admin_resolution,
        settlement_amount: parseFloat(resolveForm.settlement_amount),
        settlement_party: resolveForm.settlement_party
      };
      await resolveAdminDispute(selectedDisputeForResolve.dispute_id, payload);
      setFeedback({ type: 'success', message: `Dispute #${selectedDisputeForResolve.dispute_id} successfully resolved and recorded in audit ledger!` });
      setShowResolveModal(false);
      loadAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Provision Admin
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await provisionAdmin(provisionForm);
      setFeedback({ type: 'success', message: `New Administrator account '${provisionForm.email}' provisioned!` });
      setShowProvisionModal(false);
      setProvisionForm({ email: '', password: '', full_name: '', phone: '+91 98200 ' });
      loadAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Assign Verification Officer to Consignment
  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!selectedConsignmentForAssign) return;
    setFeedback(null);
    try {
      const payload = {
        officer_id: officerAssignForm.officer_id,
        scheduled_inspection_time: officerAssignForm.scheduled_inspection_time ? new Date(officerAssignForm.scheduled_inspection_time).toISOString() : undefined,
        assignment_notes: officerAssignForm.assignment_notes
      };
      await assignVerificationOfficer(selectedConsignmentForAssign.consignment_id, payload);
      setFeedback({
        type: 'success',
        message: `Officer ${officerAssignForm.officer_id} assigned to Consignment #${selectedConsignmentForAssign.consignment_id}. Inspection scheduled!`
      });
      setShowAssignOfficerModal(false);
      setSelectedConsignmentForAssign(null);
      loadAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Documented Policy Exception Override
  const handleExceptionApproval = async (e) => {
    e.preventDefault();
    if (!selectedConsignmentForException) return;
    setFeedback(null);
    try {
      const payload = {
        override_reason: exceptionForm.override_reason,
        approved_verified_quantity: parseFloat(exceptionForm.approved_verified_quantity || selectedConsignmentForException.declared_quantity_kg),
        compliance_justification: exceptionForm.compliance_justification,
        supporting_document_reference: exceptionForm.supporting_document_reference
      };
      await adminExceptionApproval(selectedConsignmentForException.consignment_id, payload);
      setFeedback({
        type: 'success',
        message: `Documented Exception Approved for #${selectedConsignmentForException.consignment_id}! VRF generated and recorded into Immutable Audit Ledger.`
      });
      setShowExceptionModal(false);
      setSelectedConsignmentForException(null);
      loadAdminData(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const filteredUsers = users.filter(u => userRoleFilter === 'ALL' || u.role === userRoleFilter);
  const filteredDisputes = disputes.filter(d => disputeStatusFilter === 'ALL' || d.status === disputeStatusFilter);
  const filteredAuditLogs = auditLogs.filter(a => {
    return auditSearch === '' || 
      a.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.entity_id?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.user_role?.toLowerCase().includes(auditSearch.toLowerCase());
  });

  return (
    <div>
      {/* 1. TOP HEADER & QUICK STATS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={26} color="#A855F7" />
            AGRITRUST Platform Governance & Control Tower
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Central enterprise oversight, participant authentication, dispute adjudication & immutable audit records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowProvisionModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <UserPlus size={14} />
            <span>Provision Admin</span>
          </button>

          <button
            type="button"
            onClick={() => loadAdminData(true)}
            disabled={refreshing}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Control Tower</span>
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

      {/* 2. ENTERPRISE KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Registered Users</span>
            <Users size={16} color="#A855F7" />
          </div>
          <div className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {stats?.total_users || users.length || 5}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Across 5 platform roles
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Shipments</span>
            <Truck size={16} color="var(--accent-blue)" />
          </div>
          <div className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-blue)' }}>
            {stats?.active_shipments || 5}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {stats?.total_shipments || shipments.length || 9} total tracked
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Disputes in Review</span>
            <AlertTriangle size={16} color="var(--accent-rose)" />
          </div>
          <div className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-rose-light)' }}>
            {disputes.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            AI Evidence analyzed
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Excursion Alerts</span>
            <Activity size={16} color="var(--accent-amber)" />
          </div>
          <div className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-amber-light)' }}>
            {alertsList.filter(a => a.status === 'OPEN').length || 4}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            5s Telemetry Ingestion
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Audit Trail Events</span>
            <FileText size={16} color="var(--accent-emerald)" />
          </div>
          <div className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
            {auditLogs.length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Immutable event records
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
          { id: 'spoilage-control', label: 'Spoilage Prevention Control Center', icon: AlertTriangle, isSpecial: true },
          { id: 'verification-governance', label: 'Physical Verification Governance', count: consignments.length, icon: ClipboardCheck },
          { id: 'governance', label: 'Overview & Quick Views', icon: Sliders },
          { id: 'users', label: 'User & Facility Directory', count: users.length, icon: Users },
          { id: 'disputes', label: 'AI Dispute Adjudication', count: disputes.length, icon: AlertTriangle },
          { id: 'audit', label: 'Tamper-Evident Audit Trail', count: auditLogs.length, icon: FileText },
          { id: 'analytics', label: 'Operational Intelligence', icon: BarChart3 }
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
                borderBottom: `2px solid ${isActive ? (isSpecial ? 'var(--accent-amber)' : '#A855F7') : 'transparent'}`,
                color: isActive ? (isSpecial ? 'var(--accent-amber)' : '#C084FC') : (isSpecial ? 'var(--accent-amber)' : 'var(--text-secondary)'),
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
                  background: isActive ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#C084FC' : 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 0: SPOILAGE PREVENTION CONTROL CENTER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'spoilage-control' && (
        <SpoilageControlCenter />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 0.5: MANDATORY PHYSICAL VERIFICATION GOVERNANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'verification-governance' && (
        <div>
          {/* Top Verification KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div className="card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Total Consignments</div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                {verificationStats?.total_consignments || consignments.length}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Multi-Modal Pipeline</div>
            </div>

            <div className="card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-amber-light)' }}>Pending / Scheduled</div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-amber)', marginTop: '4px' }}>
                {(verificationStats?.pending_verification || 0) + (verificationStats?.inspections_scheduled || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Awaiting physical check</div>
            </div>

            <div className="card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-emerald-light)' }}>VRF Certified & Approved</div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-emerald-light)', marginTop: '4px' }}>
                {verificationStats?.approved || consignments.filter(c => c.status === 'APPROVED' || c.status === 'AWAITING_BOOKING' || c.status === 'BOOKING_CONFIRMED' || c.status === 'LOGISTICS_ACCEPTED' || c.status === 'READY_FOR_DISPATCH' || c.status === 'DISPATCHED').length}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Eligible for dispatch</div>
            </div>

            <div className="card" style={{ padding: '14px 16px', borderLeft: '4px solid var(--accent-rose)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-rose-light)' }}>Rejected / Corrections</div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-rose-light)', marginTop: '4px' }}>
                {(verificationStats?.rejected || 0) + (verificationStats?.requires_correction || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Discrepancies identified</div>
            </div>

            <div className="card" style={{ padding: '14px 16px', borderLeft: '4px solid #A855F7' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#C084FC' }}>Avg Inspection Turnaround</div>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: '#A855F7', marginTop: '4px' }}>
                {verificationStats?.average_turnaround_hours ? `${verificationStats.average_turnaround_hours}h` : '2.4h'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>On-site dispatch velocity</div>
            </div>
          </div>

          {/* Officers Workload Grid */}
          <div className="card" style={{ padding: '18px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="var(--accent-blue)" />
                  Field Verification Officers & Deployment Roster ({verificationOfficers.length})
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Authorized inspection agents conducting mandatory physical weight, quality, and cold-chain compliance checks.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {verificationOfficers.map((off) => (
                <div key={off.officer_id} style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="font-mono" style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)' }}>{off.officer_id}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{off.full_name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Zone: <b>{off.assigned_zone}</b> · Badge: <code>{off.badge_number}</code>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📞 {off.phone} · ✉️ {off.email}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: off.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: off.is_active ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)'
                    }}>
                      {off.is_active ? 'Active On-Duty' : 'Off-Duty'}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '11px'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned: </span>
                      <b style={{ color: 'var(--accent-blue)' }}>{off.active_inspections_count || 0} active</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Completed: </span>
                      <b style={{ color: 'var(--accent-emerald-light)' }}>{off.completed_inspections_count || 0} verified</b>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consignments Oversight Table */}
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck size={18} color="var(--accent-emerald)" />
                  Consignment Physical Verification Oversight Matrix
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Mandatory gatekeeper audit: Unverified consignments cannot be dispatched. Admins can assign officers or approve documented exceptions.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 12px' }}>Request ID</th>
                    <th style={{ padding: '10px 12px' }}>Commodity & Quantity</th>
                    <th style={{ padding: '10px 12px' }}>Transport Mode</th>
                    <th style={{ padding: '10px 12px' }}>Origin & Destination</th>
                    <th style={{ padding: '10px 12px' }}>Verification Status</th>
                    <th style={{ padding: '10px 12px' }}>Assigned Officer</th>
                    <th style={{ padding: '10px 12px' }}>VRF Certificate</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consignments.map((c) => {
                    const isApproved = ['APPROVED', 'AWAITING_BOOKING', 'BOOKING_CONFIRMED', 'LOGISTICS_ACCEPTED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(c.status);
                    const isRejected = c.status === 'REJECTED';
                    const isPending = ['REQUEST_CREATED', 'PENDING_VERIFICATION', 'INSPECTION_SCHEDULED', 'UNDER_INSPECTION'].includes(c.status);
                    const isCorrection = c.status === 'REQUIRES_CORRECTION';

                    return (
                      <tr key={c.consignment_id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                        <td className="font-mono" style={{ padding: '10px 12px', color: 'var(--accent-blue)', fontWeight: '700' }}>
                          {c.consignment_id}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <b>{c.product_name}</b> ({c.product_category})
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Declared: <b>{c.declared_quantity_kg?.toLocaleString()} kg</b>
                            {c.verified_quantity_kg && <span style={{ color: 'var(--accent-emerald-light)' }}> | Verified: <b>{c.verified_quantity_kg?.toLocaleString()} kg</b></span>}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: c.transport_mode === 'AIR' ? 'rgba(56, 189, 248, 0.15)' : c.transport_mode === 'MARINE' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: c.transport_mode === 'AIR' ? 'var(--accent-blue)' : c.transport_mode === 'MARINE' ? 'var(--accent-cyan)' : 'var(--accent-emerald-light)'
                          }}>
                            {c.transport_mode === 'AIR' ? '✈️ Air Cargo' : c.transport_mode === 'MARINE' ? '🚢 Marine Reefer' : '🚛 Cold-Chain Road'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div>From: <b>{c.pickup_location}</b></div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>To: {c.destination}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isApproved ? 'rgba(16, 185, 129, 0.15)' : isRejected ? 'rgba(244, 63, 94, 0.15)' : isCorrection ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: isApproved ? 'var(--accent-emerald-light)' : isRejected ? 'var(--accent-rose-light)' : isCorrection ? 'var(--accent-amber-light)' : 'var(--accent-blue)'
                          }}>
                            {isApproved ? '✅ ' : isRejected ? '❌ ' : isCorrection ? '⚠️ ' : '⏳ '}{c.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {c.assigned_officer_id ? (
                            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                              👮 {c.assigned_officer_name || c.assigned_officer_id}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent-amber-light)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td className="font-mono" style={{ padding: '10px 12px' }}>
                          {c.verification_reference_number ? (
                            <span style={{ color: 'var(--accent-emerald-light)', fontWeight: '700' }}>
                              📜 {c.verification_reference_number}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Pending VRF</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const detail = await fetchConsignmentDetail(c.consignment_id);
                                  setSelectedConsignmentDetail(detail);
                                  setShowConsignmentDetailModal(true);
                                } catch (err) {
                                  setSelectedConsignmentDetail(c);
                                  setShowConsignmentDetailModal(true);
                                }
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 7px', fontSize: '10px' }}
                            >
                              <Eye size={12} />
                              <span>Audit Dossier</span>
                            </button>

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedConsignmentForAssign(c);
                                  setOfficerAssignForm({
                                    officer_id: verificationOfficers[0]?.officer_id || 'OFF-101',
                                    scheduled_inspection_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
                                    assignment_notes: `Urgent physical inspection required for ${c.product_name} (${c.declared_quantity_kg}kg).`
                                  });
                                  setShowAssignOfficerModal(true);
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '3px 7px', fontSize: '10px', background: 'var(--accent-blue)' }}
                              >
                                <UserPlus size={12} />
                                <span>Assign Officer</span>
                              </button>
                            )}

                            {(isRejected || isCorrection) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedConsignmentForException(c);
                                  setExceptionForm({
                                    override_reason: 'APEDA certified pre-cooling batch with secondary accredited lab report verification.',
                                    approved_verified_quantity: c.declared_quantity_kg,
                                    compliance_justification: 'Physical packaging conforms with export standard ISO 22000. Verified via accredited packhouse supervisor.',
                                    supporting_document_reference: 'APEDA-LAB-EXP-2026-991'
                                  });
                                  setShowExceptionModal(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 7px', fontSize: '10px', color: '#C084FC', borderColor: 'rgba(168, 85, 247, 0.4)' }}
                              >
                                <ShieldCheck size={12} />
                                <span>Policy Exception</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB A: GOVERNANCE & INTEGRATED VIEWS LAUNCHER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'governance' && (

        <div>
          {/* Quick Access to Specialized Views */}
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#A855F7" />
            Integrated Control Tower Specialized Views
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { id: 'control-tower', label: 'Control Tower Fleet Map', desc: 'Real-time multi-truck GPS telemetry and interactive map view.', icon: Activity, color: '#06B6D4' },
              { id: 'shipments', label: 'Shipment Lifecycle Matrix', desc: 'Full registry of all shipments with stage transitions and proof files.', icon: Truck, color: '#38BDF8' },
              { id: 'monitoring', label: 'Real-Time Sensor Ingestion', desc: 'Live temperature, humidity, and door interlock charts (5s loop).', icon: Activity, color: '#10B981' },
              { id: 'incidents', label: 'Discrepancy Investigation Dossiers', desc: 'Deep-dive AI forensic timeline of temperature excursions.', icon: AlertTriangle, color: '#F43F5E' },
              { id: 'verification', label: 'QR Provenance Verification Pass', desc: 'Cryptographic hash inspection and tamper checks.', icon: ShieldCheck, color: '#A855F7' }
            ].map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.id}
                  className="card"
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => onNavigateToView && onNavigateToView(v.id)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Icon size={18} color={v.color} />
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{v.label}</h4>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{v.desc}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: v.color, marginTop: '12px' }}>
                    <span>Launch View</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB B: USERS & PARTICIPANT DIRECTORY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Registered Platform Participants ({filteredUsers.length})
            </h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'FARMER', 'LOGISTICS', 'COLD_STORAGE', 'BUYER', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setUserRoleFilter(r)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: userRoleFilter === r ? 'var(--accent-blue)' : 'var(--bg-input)',
                    color: userRoleFilter === r ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 14px' }}>User ID</th>
                  <th style={{ padding: '12px 14px' }}>Name & Company</th>
                  <th style={{ padding: '12px 14px' }}>Role</th>
                  <th style={{ padding: '12px 14px' }}>Email & Phone</th>
                  <th style={{ padding: '12px 14px' }}>Verification</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <td className="font-mono" style={{ padding: '12px 14px', color: 'var(--accent-blue)', fontWeight: '700' }}>
                      {u.user_id}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <b>{u.full_name}</b>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.company_name || 'Individual'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: u.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.15)' : u.role === 'FARMER' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: u.role === 'ADMIN' ? '#C084FC' : u.role === 'FARMER' ? 'var(--accent-emerald-light)' : 'var(--accent-blue)'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div>{u.email}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.phone || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: 'var(--accent-emerald-light)', fontWeight: '600' }}>
                        ✅ Verified
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: u.is_active ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)', fontWeight: '700' }}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {u.role !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u.user_id, u.is_active)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '3px 8px',
                            color: u.is_active ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                            borderColor: u.is_active ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB C: AI DISPUTE RESOLUTION WORKFLOW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'disputes' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--accent-rose)" />
                Dispute Claims & AI Evidence Analysis
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                * AI assists by summarizing temperature deviations and telemetry discrepancies; final liability decision is recorded exclusively by the Admin.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'OPEN', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDisputeStatusFilter(st)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: disputeStatusFilter === st ? 'var(--accent-rose)' : 'var(--bg-input)',
                    color: disputeStatusFilter === st ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredDisputes.map((d) => (
              <div key={d.dispute_id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                        {d.dispute_id}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        on Shipment #{d.shipment_id}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: d.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: d.status === 'RESOLVED' ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)'
                      }}>
                        {d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Category: <b>{d.dispute_category}</b> · Raised by <b>{d.raised_by_role}</b> against <b>{d.against_role}</b>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Claim Amount:</span>
                    <div className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-rose-light)' }}>
                      ₹{d.claim_amount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <b>Description:</b> "{d.description}"
                </div>

                {/* AI Evidence Assessment Box */}
                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#C084FC', marginBottom: '4px' }}>
                    <Cpu size={14} />
                    <span>AI Forensic Telemetry Assessment (Risk Score: {d.ai_risk_score || 85}/100)</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {d.ai_evidence_summary || 'Sensor telemetry logs show persistent temperature excursion above 15.5°C between Igatpuri and Thane (duration: 35 minutes). Reefer status logged as OFF during high heat period.'}
                  </p>
                </div>

                {/* Resolution Summary (If already resolved) */}
                {d.admin_resolution && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-emerald-light)', marginBottom: '2px' }}>
                      ✅ Admin Resolution & Settlement
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      {d.admin_resolution}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Awarded: <b>₹{d.settlement_amount?.toLocaleString('en-IN')}</b> against <b>{d.settlement_party}</b>
                    </div>
                  </div>
                )}

                {d.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDisputeForResolve(d);
                      setResolveForm(prev => ({
                        ...prev,
                        settlement_amount: d.claim_amount ? d.claim_amount / 2 : 12500.0,
                        settlement_party: d.against_role || 'LOGISTICS'
                      }));
                      setShowResolveModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}
                  >
                    <ShieldCheck size={14} />
                    <span>Adjudicate & Record Settlement</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB D: TAMPER-EVIDENT AUDIT TRAIL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent-emerald)" />
              Tamper-Evident System Audit Ledger ({auditLogs.length} events)
            </h3>

            <input
              type="text"
              placeholder="Search action or entity..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 12px' }}>Event ID</th>
                  <th style={{ padding: '10px 12px' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px' }}>Actor Role</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                  <th style={{ padding: '10px 12px' }}>Entity</th>
                  <th style={{ padding: '10px 12px' }}>Details Payload</th>
                  <th style={{ padding: '10px 12px' }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.map((log) => (
                  <tr key={log.log_id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <td className="font-mono" style={{ padding: '10px 12px', color: 'var(--accent-blue)' }}>
                      #{log.log_id}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent-emerald-light)' }}>
                        {log.user_role || 'SYSTEM'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: '700' }}>
                      {log.action}
                    </td>
                    <td className="font-mono" style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {log.entity_type} · {log.entity_id}
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: '300px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {JSON.stringify(log.details)}
                      </div>
                    </td>
                    <td className="font-mono" style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB E: ANALYTICS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="var(--accent-cyan)" />
            Network Compliance & Cold Chain Reliability
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overall Thermal Compliance</span>
              <div className="font-display" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-emerald-light)', marginTop: '4px' }}>
                94.8%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Shipments strictly inside target temp bounds
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average Transit Time</span>
              <div className="font-display" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-blue)', marginTop: '4px' }}>
                6.2 <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Hours</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Nashik to Mumbai & Pune corridors
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Escrow Settlement Rate</span>
              <div className="font-display" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                98.2%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Zero dispute friction on verified deliveries
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB F: COLD STORAGE OVERSIGHT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'cold-storage-oversight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #FFFFFF 0%, #E6F4F4 100%)', border: '1px solid #CFE8E7' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#018180', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Warehouse size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                    Regional Cold Storage Infrastructure & Facility Oversight
                  </h3>
                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                    Monitor certified pre-cooling chambers, active CA storage capacity, facility audit status & emergency harvest allocations.
                  </p>
                </div>
              </div>
              <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: '700' }}>
                5 FACILITIES AUDITED & CERTIFIED
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {[
              { id: 'CS-FAC-001', name: 'Sahyadri Integrated Agro Cold Chain Hub', location: 'Dindori Road, Nashik', totalCap: '500 MT', occupied: '320 MT', chambers: 6, status: 'VERIFIED & ACTIVE', tempCompliance: '99.4%' },
              { id: 'CS-FAC-002', name: 'APEDA Accredited Pre-Cooling Terminal', location: 'Pimpalgaon Baswant, Nashik', totalCap: '250 MT', occupied: '140 MT', chambers: 4, status: 'VERIFIED & ACTIVE', tempCompliance: '98.8%' },
              { id: 'CS-FAC-003', name: 'Navi Mumbai Vashi APMC Terminal CA Store', location: 'Sector 19, Vashi, Navi Mumbai', totalCap: '800 MT', occupied: '650 MT', chambers: 8, status: 'VERIFIED & ACTIVE', tempCompliance: '97.6%' }
            ].map(fac => (
              <div key={fac.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{fac.name}</h4>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>📍 {fac.location}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: '#DCFCE7', color: '#15803D' }}>
                    {fac.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#F8FAFC', borderRadius: 'var(--radius-md)', margin: '12px 0', textAlign: 'center', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Capacity</span>
                    <div style={{ fontWeight: '800', color: '#0F172A' }}>{fac.totalCap}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Occupied</span>
                    <div style={{ fontWeight: '800', color: '#018180' }}>{fac.occupied}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Compliance</span>
                    <div style={{ fontWeight: '800', color: '#16A34A' }}>{fac.tempCompliance}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#64748B' }}>Active Chambers: <b>{fac.chambers} units</b></span>
                  <span className="font-mono" style={{ fontSize: '11px', color: '#018180', fontWeight: '700' }}>{fac.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB G: SYSTEM SETTINGS & INTEGRATIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'system-settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #FFFFFF 0%, #E6F4F4 100%)', border: '1px solid #CFE8E7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#005E5D', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sliders size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                  Platform Configuration, IoT Sensor Loop & System Health
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                  Manage 5-second simulated IoT telemetry loop, PostgreSQL connection health, configurable thermal violation thresholds and rate card tariffs.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            
            {/* System Health Card */}
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#16A34A" />
                <span>Backend Services & Database Health</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: '#64748B' }}>PostgreSQL (Port 5432)</span>
                  <span style={{ fontWeight: '800', color: '#16A34A' }}>CONNECTED (ftl_cold_chain)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: '#64748B' }}>FastAPI REST Gateway</span>
                  <span style={{ fontWeight: '800', color: '#16A34A' }}>HEALTHY (HTTP 200 OK)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: '#64748B' }}>Simulated Telemetry Cycle</span>
                  <span style={{ fontWeight: '800', color: '#018180' }}>ACTIVE (5s Ingestion Loop)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: '#64748B' }}>Role-Based Access Control</span>
                  <span style={{ fontWeight: '800', color: '#16A34A' }}>STRICT RBAC ENFORCED</span>
                </div>
              </div>
            </div>

            {/* Threshold Settings Card */}
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="#D97706" />
                <span>Configurable Alarm Thresholds</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Max Permissible Temperature Excursion:</span>
                  <b style={{ color: '#B45309' }}>+1.5°C above setpoint</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Max Permissible Route Delay:</span>
                  <b style={{ color: '#B45309' }}>60 Minutes</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Smart Escrow Auto-Release Window:</span>
                  <b>24 Hours Post-Intake</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Supported Transport Modes:</span>
                  <b style={{ color: '#018180' }}>Road, Air, Marine (Sea)</b>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADJUDICATE DISPUTE */}
      {/* ------------------------------------------------------------- */}
      {showResolveModal && selectedDisputeForResolve && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Adjudicate Dispute #{selectedDisputeForResolve.dispute_id}
            </h3>

            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Resolution Verdict *</label>
                <select
                  value={resolveForm.status}
                  onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="RESOLVED">RESOLVED — Claim Upheld with Settlement</option>
                  <option value="REJECTED">REJECTED — Claim Dismissed (No Excursion Found)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW — Additional Inspection Requested</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Settlement Amount (₹)</label>
                  <input
                    type="number"
                    value={resolveForm.settlement_amount}
                    onChange={(e) => setResolveForm({ ...resolveForm, settlement_amount: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Responsible Party</label>
                  <select
                    value={resolveForm.settlement_party}
                    onChange={(e) => setResolveForm({ ...resolveForm, settlement_party: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  >
                    <option value="LOGISTICS">LOGISTICS (Carrier Escrow Debit)</option>
                    <option value="FARMER">FARMER (Harvest Quality Deduction)</option>
                    <option value="COLD_STORAGE">COLD_STORAGE (Facility Excursion)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Admin Legal Ruling & Findings</label>
                <textarea
                  rows={3}
                  value={resolveForm.admin_resolution}
                  onChange={(e) => setResolveForm({ ...resolveForm, admin_resolution: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowResolveModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
                  Commit Binding Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PROVISION ADMIN */}
      {/* ------------------------------------------------------------- */}
      {showProvisionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Provision Authorized Administrator
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Admin accounts can only be provisioned by an active Platform Administrator.
            </p>

            <form onSubmit={handleProvisionSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  value={provisionForm.full_name}
                  onChange={(e) => setProvisionForm({ ...provisionForm, full_name: e.target.value })}
                  required
                  placeholder="e.g. Vikram Malhotra"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Admin Email *</label>
                <input
                  type="email"
                  value={provisionForm.email}
                  onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                  required
                  placeholder="admin.ops@agritrust.io"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Temporary Master Password (min 8 chars) *</label>
                <input
                  type="password"
                  value={provisionForm.password}
                  onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                  required
                  minLength={8}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowProvisionModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#A855F7' }}>
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ASSIGN VERIFICATION OFFICER */}
      {/* ------------------------------------------------------------- */}
      {showAssignOfficerModal && selectedConsignmentForAssign && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <UserPlus size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Assign Officer for Physical Inspection
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Consignment: <b>{selectedConsignmentForAssign.consignment_id}</b> ({selectedConsignmentForAssign.product_name}, {selectedConsignmentForAssign.declared_quantity_kg}kg) at <b>{selectedConsignmentForAssign.pickup_location}</b>.
            </p>

            <form onSubmit={handleAssignOfficer}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Field Verification Officer *</label>
                <select
                  value={officerAssignForm.officer_id}
                  onChange={(e) => setOfficerAssignForm({ ...officerAssignForm, officer_id: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  {verificationOfficers.map(off => (
                    <option key={off.officer_id} value={off.officer_id}>
                      {off.officer_id} - {off.full_name} ({off.assigned_zone}) [{off.active_inspections_count || 0} active]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Scheduled Physical Inspection Window</label>
                <input
                  type="datetime-local"
                  value={officerAssignForm.scheduled_inspection_time}
                  onChange={(e) => setOfficerAssignForm({ ...officerAssignForm, scheduled_inspection_time: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Officer Dispatch Instructions</label>
                <textarea
                  rows={2}
                  value={officerAssignForm.assignment_notes}
                  onChange={(e) => setOfficerAssignForm({ ...officerAssignForm, assignment_notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAssignOfficerModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--accent-blue)' }}>
                  Dispatch Officer & Schedule Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DOCUMENTED POLICY EXCEPTION OVERRIDE */}
      {/* ------------------------------------------------------------- */}
      {showExceptionModal && selectedConsignmentForException && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={20} color="#A855F7" />
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Documented Policy Exception Approval
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Consignment: <b>{selectedConsignmentForException.consignment_id}</b> (Current Status: <span style={{ color: 'var(--accent-rose-light)' }}>{selectedConsignmentForException.status}</span>).
              Exception approvals are recorded into the tamper-evident audit ledger.
            </p>

            <form onSubmit={handleExceptionApproval}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Exception Category & Override Reason *</label>
                <select
                  value={exceptionForm.override_reason}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, override_reason: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="APEDA certified pre-cooling batch with secondary lab report verification.">APEDA accredited packhouse pre-cooling with lab clearance</option>
                  <option value="Secondary physical verification conducted by Regional Quality Director.">Secondary on-site verification by Regional Quality Director</option>
                  <option value="Packaging rectified on-site under authorized APEDA supervisor supervision.">Packaging rectified on-site under authorized APEDA supervision</option>
                  <option value="Documented moisture variance within tolerable export threshold (+-1.5%).">Tolerable moisture variance with buyer concurrence</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Approved Verified Weight (kg) *</label>
                  <input
                    type="number"
                    value={exceptionForm.approved_verified_quantity}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, approved_verified_quantity: e.target.value })}
                    required
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Supporting Doc Reference *</label>
                  <input
                    type="text"
                    value={exceptionForm.supporting_document_reference}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, supporting_document_reference: e.target.value })}
                    required
                    placeholder="e.g. APEDA-LAB-EXP-2026-991"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Compliance & Risk Mitigation Justification *</label>
                <textarea
                  rows={3}
                  value={exceptionForm.compliance_justification}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, compliance_justification: e.target.value })}
                  required
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                ℹ️ Committing this exception will generate a cryptographic <b>VRF Certificate</b>, unlock logistics booking, and record your Administrator signature into the audit trail.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowExceptionModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#A855F7' }}>
                  Authorize Exception & Grant VRF Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONSIGNMENT AUDIT DOSSIER DETAIL */}
      {/* ------------------------------------------------------------- */}
      {showConsignmentDetailModal && selectedConsignmentDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                    {selectedConsignmentDetail.consignment_id}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: 'var(--accent-blue)'
                  }}>
                    {selectedConsignmentDetail.status}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedConsignmentDetail.product_name} ({selectedConsignmentDetail.product_category}) · Requested Mode: <b>{selectedConsignmentDetail.transport_mode}</b>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConsignmentDetailModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
              >
                ✕ Close
              </button>
            </div>

            {/* VRF Certificate Banner if exists */}
            {selectedConsignmentDetail.verification_reference_number && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-emerald-light)' }}>
                    OFFICIAL PHYSICAL VERIFICATION CERTIFICATE (VRF)
                  </div>
                  <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                    {selectedConsignmentDetail.verification_reference_number}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Verified Weight: <b style={{ color: 'var(--accent-emerald-light)' }}>{selectedConsignmentDetail.verified_quantity_kg?.toLocaleString()} kg</b>
                </div>
              </div>
            )}

            {/* Consignment Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Origin Pickup Point:</span>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{selectedConsignmentDetail.pickup_location}</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Destination:</span>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{selectedConsignmentDetail.destination}</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Declared Quantity:</span>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{selectedConsignmentDetail.declared_quantity_kg?.toLocaleString()} kg</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required Temp Range:</span>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {selectedConsignmentDetail.required_temp_min_c !== null ? `${selectedConsignmentDetail.required_temp_min_c}°C to ${selectedConsignmentDetail.required_temp_max_c}°C` : 'Ambient (18-25°C)'}
                </div>
              </div>
            </div>

            {/* Inspection Records List */}
            {selectedConsignmentDetail.inspections && selectedConsignmentDetail.inspections.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClipboardCheck size={16} color="var(--accent-emerald)" />
                  Physical Inspection Results & Checklist
                </h4>

                {selectedConsignmentDetail.inspections.map((insp, idx) => (
                  <div key={insp.inspection_id || idx} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Inspection #{insp.inspection_id} by {insp.officer_name || insp.officer_id}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: insp.decision === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: insp.decision === 'APPROVED' ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)'
                      }}>
                        {insp.decision}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                      <div>Verified Wt: <b>{insp.verified_weight_kg} kg</b></div>
                      <div>Pulp Temp: <b>{insp.pulp_temperature_c !== null ? `${insp.pulp_temperature_c}°C` : 'N/A'}</b></div>
                      <div>Brix: <b>{insp.brix_level !== null ? `${insp.brix_level}°` : 'N/A'}</b></div>
                    </div>

                    {insp.officer_notes && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                        <b>Notes:</b> {insp.officer_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Close action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
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
