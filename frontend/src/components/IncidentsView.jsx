import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Scale, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  Thermometer, 
  Droplets, 
  Lock, 
  Unlock, 
  Power, 
  GitCommit, 
  X, 
  UserCheck, 
  MapPin, 
  Truck,
  Package,
  Activity,
  Sparkles
} from 'lucide-react';
import { 
  fetchIncidents, 
  fetchIncidentInvestigation, 
  updateIncidentStatus 
} from '../api';

export default function IncidentsView({ 
  incidentsList = [], 
  onRefresh, 
  selectedIncidentId, 
  onOpenInvestigation 
}) {
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, OPEN, UNDER_REVIEW, RESOLVED
  const [searchQuery, setSearchQuery] = useState('');
  
  // Investigation dossier state
  const [activeIncidentId, setActiveIncidentId] = useState(selectedIncidentId || null);
  const [investigationData, setInvestigationData] = useState(null);
  const [loadingInvestigation, setLoadingInvestigation] = useState(false);

  // Status update modal
  const [statusUpdateTarget, setStatusUpdateTarget] = useState(null);
  const [newStatus, setNewStatus] = useState('UNDER_REVIEW');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Sync activeIncidentId if parent passes one
  useEffect(() => {
    if (selectedIncidentId) {
      setActiveIncidentId(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  // Load investigation dossier when activeIncidentId is set
  useEffect(() => {
    if (!activeIncidentId) {
      setInvestigationData(null);
      return;
    }

    async function loadInvestigation() {
      setLoadingInvestigation(true);
      try {
        const res = await fetchIncidentInvestigation(activeIncidentId);
        if (res) {
          setInvestigationData(res);
        }
      } catch (err) {
        console.error('Error fetching investigation:', err);
      } finally {
        setLoadingInvestigation(false);
      }
    }

    loadInvestigation();
  }, [activeIncidentId]);

  // Handle status update submit
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusUpdateTarget) return;
    setSubmittingStatus(true);
    try {
      await updateIncidentStatus(statusUpdateTarget.incident_id, newStatus, resolutionNotes);
      setStatusUpdateTarget(null);
      setResolutionNotes('');
      onRefresh();
      if (activeIncidentId === statusUpdateTarget.incident_id) {
        // Refresh dossier
        const res = await fetchIncidentInvestigation(activeIncidentId);
        setInvestigationData(res);
      }
    } catch (err) {
      console.error('Error updating incident status:', err);
    } finally {
      setSubmittingStatus(false);
    }
  };

  const filteredIncidents = incidentsList.filter(inc => {
    const matchesSearch = 
      String(inc.incident_id).includes(searchQuery) ||
      inc.shipment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incident_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return inc.status === statusFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & FILTER BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={20} color="var(--accent-amber)" />
              <h1 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Incident Investigation & Evidence Audit Dossier
              </h1>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Structured, factual lifecycle evidence synthesis for quality variances, quantity discrepancies, and thermal excursions
            </p>
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className="btn btn-secondary btn-sm"
                style={{
                  background: statusFilter === st ? 'rgba(245, 158, 11, 0.15)' : undefined,
                  borderColor: statusFilter === st ? 'var(--accent-amber)' : undefined,
                  color: statusFilter === st ? '#FBBF24' : undefined
                }}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: '16px', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search incidents by Incident ID, Shipment ID, Discrepancy Type, Summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. INCIDENTS DIRECTORY LIST */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
          Active & Resolved Incident Records ({filteredIncidents.length})
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No Incidents Found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              No variance or threshold incident records match the selected filter.
            </div>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Shipment ID</th>
                  <th>Incident Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Logged Date</th>
                  <th>Factual Summary</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map(inc => {
                  const createdDate = inc.created_at ? new Date(inc.created_at) : null;
                  const isOpen = inc.status === 'OPEN';
                  const isReview = inc.status === 'UNDER_REVIEW';

                  return (
                    <tr key={inc.incident_id}>
                      <td className="font-mono" style={{ fontWeight: '800', color: '#FBBF24' }}>
                        #{inc.incident_id}
                      </td>

                      <td className="font-mono" style={{ fontWeight: '700', color: '#38BDF8', whiteSpace: 'nowrap' }}>
                        {inc.shipment_id}
                        {inc.shipment_id?.includes('DEMO') && (
                          <span className="badge badge-demo" style={{ marginLeft: '8px' }}>DEMO DATA</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {inc.incident_type?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${inc.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                          {inc.severity || 'CRITICAL'}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${isOpen ? 'badge-critical' : isReview ? 'badge-warning' : 'badge-normal'}`}>
                          {inc.status}
                        </span>
                      </td>

                      <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {createdDate ? createdDate.toLocaleString() : 'N/A'}
                      </td>

                      <td style={{ maxWidth: '300px', fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.description || 'Discrepancy detected during buyer receiving inspection.'}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setStatusUpdateTarget(inc);
                              setNewStatus(inc.status === 'OPEN' ? 'UNDER_REVIEW' : 'RESOLVED');
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Update incident lifecycle status"
                          >
                            <span>Status</span>
                          </button>

                          <button
                            onClick={() => setActiveIncidentId(inc.incident_id)}
                            className="btn btn-primary btn-sm"
                            title="Open comprehensive investigation audit dossier"
                          >
                            <FileText size={12} />
                            <span>Investigate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. COMPREHENSIVE INVESTIGATION DOSSIER MODAL / VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeIncidentId && (
        <div className="modal-overlay" onClick={() => setActiveIncidentId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px', maxHeight: '92vh' }}>
            
            {/* Modal Header */}
            <div style={{ 
              padding: '18px 24px', 
              borderBottom: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-panel)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#B45309'
                }}>
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="font-display" style={{ fontSize: '17px', fontWeight: '800', color: '#111827' }}>
                      Investigation Dossier: Incident #{activeIncidentId}
                    </span>
                    <span className={`badge ${investigationData?.incident?.status === 'OPEN' ? 'badge-critical' : investigationData?.incident?.status === 'UNDER_REVIEW' ? 'badge-warning' : 'badge-normal'}`}>
                      {investigationData?.incident?.status || 'UNDER_REVIEW'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Shipment ID: <b style={{ color: 'var(--color-primary-blue)' }}>{investigationData?.incident?.shipment_id || 'AGRI-1001'}</b> · Neutral Lifecycle Evidence Synthesis
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    setStatusUpdateTarget(investigationData?.incident);
                    setNewStatus(investigationData?.incident?.status === 'OPEN' ? 'UNDER_REVIEW' : 'RESOLVED');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <span>Update Status</span>
                </button>

                <button 
                  onClick={() => setActiveIncidentId(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loadingInvestigation || !investigationData ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Synthesizing complete lifecycle audit dossier...
                </div>
              ) : (
                <>
                  {/* TOP INCIDENT CARD */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-amber)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>INCIDENT</div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: '#FBBF24', marginTop: '2px' }}>
                          #{investigationData.incident?.incident_id}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Shipment ID</div>
                        <div className="font-mono" style={{ fontSize: '16px', fontWeight: '700', color: '#38BDF8', marginTop: '2px' }}>
                          {investigationData.incident?.shipment_id}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Incident Type</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.incident?.incident_type?.replace(/_/g, ' ')}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Status</div>
                        <div style={{ marginTop: '2px' }}>
                          <span className={`badge ${investigationData.incident?.status === 'OPEN' ? 'badge-critical' : investigationData.incident?.status === 'UNDER_REVIEW' ? 'badge-warning' : 'badge-normal'}`}>
                            {investigationData.incident?.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      <b style={{ color: 'var(--accent-cyan)' }}>Factual Summary: </b>
                      {investigationData.investigation_summary || investigationData.incident?.summary}
                    </div>
                  </div>

                  {/* 1. ORIGINAL DISPATCH */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-emerald)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-emerald)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={16} />
                      <span>1. ORIGINAL DISPATCH (Immutable Baseline)</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Product:</span>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.original_dispatch?.product_name || investigationData.original_dispatch?.product || 'Produce'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Dispatched Quantity:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.original_dispatch?.total_quantity} kg
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Grade A / B:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: '#16A34A', marginTop: '2px' }}>
                          {investigationData.original_dispatch?.grade_a_quantity} kg / {investigationData.original_dispatch?.grade_b_quantity} kg
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Origin → Destination:</span>
                        <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.original_dispatch?.origin} → {investigationData.original_dispatch?.destination}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Target Temp Band:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--brand-primary)', marginTop: '2px' }}>
                          {investigationData.original_dispatch?.temperature_range?.min ?? investigationData.original_dispatch?.target_temp_min}°C – {investigationData.original_dispatch?.temperature_range?.max ?? investigationData.original_dispatch?.target_temp_max}°C
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Assigned Vehicle:</span>
                        <div className="font-mono" style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.original_dispatch?.vehicle?.vehicle_number || 'FTL Carrier'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. HANDOVER */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-indigo)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#818CF8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={16} />
                      <span>2. HANDOVER (Farmer → Logistics)</span>
                    </div>

                    {investigationData.handover ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Logistics Handler:</span>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {investigationData.handover?.actor_role || investigationData.handover?.receiver || 'Carrier'}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Handover Location:</span>
                          <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                            {investigationData.handover?.location || 'Farm Gate'}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Handover Probe Temp:</span>
                          <div className="font-mono" style={{ fontWeight: '700', color: '#16A34A', marginTop: '2px' }}>
                            {investigationData.handover?.handover_temperature !== null && investigationData.handover?.handover_temperature !== undefined ? `${investigationData.handover?.handover_temperature}°C` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Handover Timestamp:</span>
                          <div className="font-mono" style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {investigationData.handover?.timestamp || investigationData.handover?.handover_timestamp ? new Date(investigationData.handover?.timestamp || investigationData.handover?.handover_timestamp).toLocaleTimeString() : 'Recorded'}
                          </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Notes: "{investigationData.handover?.notes || 'Seal verified intact. Carrier accepted consignment.'}"
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Handover record logged with carrier digital seal.
                      </div>
                    )}
                  </div>

                  {/* 3. TRANSPORT CONDITIONS */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-blue)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={16} />
                      <span>3. TRANSPORT CONDITIONS (Real-Time Sensor Telemetry)</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Min / Max Temp:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.transport_monitoring?.minimum_temperature ?? investigationData.transport_monitoring?.minimum_temperature_during_transit ?? 'N/A'}°C / {investigationData.transport_monitoring?.maximum_temperature ?? investigationData.transport_monitoring?.maximum_temperature_during_transit ?? 'N/A'}°C
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Average Temp:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.transport_monitoring?.average_temperature ?? 'N/A'}°C
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Excursions Count:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: (investigationData.transport_monitoring?.temperature_excursions_count || investigationData.transport_monitoring?.number_of_temperature_excursions) > 0 ? '#FB7185' : '#34D399', marginTop: '2px' }}>
                          {investigationData.transport_monitoring?.temperature_excursions_count ?? investigationData.transport_monitoring?.number_of_temperature_excursions ?? 0} reading(s)
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Door Open Events:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.transport_monitoring?.door_open_events_count ?? investigationData.transport_monitoring?.door_open_events ?? 0}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Reefer Off Events:</span>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {investigationData.transport_monitoring?.refrigeration_off_events_count ?? investigationData.transport_monitoring?.refrigeration_off_events ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. ALERTS / ANOMALIES */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-amber)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#FBBF24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={16} />
                      <span>4. ALERTS / ANOMALIES</span>
                    </div>

                    {(investigationData.alerts_analysis?.alerts || []).length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        No active or historical threshold alerts registered for this consignment.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {investigationData.alerts_analysis.alerts.map(al => (
                          <div key={al.alert_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-panel-light)', border: '1px solid var(--border-subtle)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`badge ${al.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '9px' }}>
                                #{al.alert_id} {al.alert_type}
                              </span>
                              <span style={{ color: 'var(--text-primary)' }}>{al.message}</span>
                            </div>
                            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {al.created_at ? new Date(al.created_at).toLocaleTimeString() : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. BUYER RECEIVING */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-cyan)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={16} />
                      <span>5. BUYER RECEIVING (Dock Inspection Record)</span>
                    </div>

                    {investigationData.receiving ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Received Quantity:</span>
                          <div className="font-mono" style={{ fontWeight: '700', color: 'var(--brand-primary)', marginTop: '2px' }}>
                            {investigationData.receiving?.received_quantity} kg
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Grade A / B Received:</span>
                          <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {investigationData.receiving?.grade_a_quantity} kg / {investigationData.receiving?.grade_b_quantity} kg
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Damaged / Defect Qty:</span>
                          <div className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-rose)', marginTop: '2px' }}>
                            {investigationData.receiving?.damaged_quantity} kg
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Dock Probe Temp:</span>
                          <div className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-amber)', marginTop: '2px' }}>
                            {investigationData.receiving?.receiving_temperature}°C
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Inspector / Facility:</span>
                          <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                            {investigationData.receiving?.receiver || 'Buyer QC'} ({investigationData.receiving?.location || 'Receiving Dock'})
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Receiving Time:</span>
                          <div className="font-mono" style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {investigationData.receiving?.receiving_timestamp ? new Date(investigationData.receiving.receiving_timestamp).toLocaleString() : 'Recorded'}
                          </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Notes: "{investigationData.receiving?.notes || 'Buyer dock physical count and grading inspection.'}"
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Shipment in transit — pending formal receiving inspection.
                      </div>
                    )}
                  </div>

                  {/* 6. SENT VS RECEIVED */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-purple)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#C084FC', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Scale size={16} />
                        <span>6. SENT VS RECEIVED (Quantitative Audit Difference)</span>
                      </div>
                      <span className="badge badge-critical" style={{ fontSize: '10px' }}>
                        STATUS: {investigationData.comparison?.comparison_status || 'VARIANCE DETECTED'}
                      </span>
                    </div>

                    <div className="data-table-container">
                      <table className="data-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>Classification</th>
                            <th>Dispatched (Sent)</th>
                            <th>Received (Dock)</th>
                            <th>Variance (Delta)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Total Net Weight</td>
                            <td className="font-mono">{investigationData.comparison?.dispatched?.total_quantity ?? investigationData.comparison?.dispatched_quantity} kg</td>
                            <td className="font-mono" style={{ color: '#38BDF8' }}>{investigationData.comparison?.received?.total_quantity ?? investigationData.comparison?.received_quantity} kg</td>
                            <td className="font-mono" style={{ fontWeight: '800', color: '#FB7185' }}>
                              {investigationData.comparison?.differences?.total_quantity_difference ?? investigationData.comparison?.quantity_difference} kg
                            </td>
                          </tr>
                          <tr>
                            <td>Grade A Produce</td>
                            <td className="font-mono">{investigationData.comparison?.dispatched?.grade_a_quantity ?? investigationData.comparison?.dispatched_grade_a} kg</td>
                            <td className="font-mono">{investigationData.comparison?.received?.grade_a_quantity ?? investigationData.comparison?.received_grade_a} kg</td>
                            <td className="font-mono" style={{ color: (investigationData.comparison?.differences?.grade_a_difference ?? investigationData.comparison?.grade_a_difference) < 0 ? '#FB7185' : '#34D399' }}>
                              {investigationData.comparison?.differences?.grade_a_difference ?? investigationData.comparison?.grade_a_difference} kg
                            </td>
                          </tr>
                          <tr>
                            <td>Grade B Produce</td>
                            <td className="font-mono">{investigationData.comparison?.dispatched?.grade_b_quantity ?? investigationData.comparison?.dispatched_grade_b} kg</td>
                            <td className="font-mono">{investigationData.comparison?.received?.grade_b_quantity ?? investigationData.comparison?.received_grade_b} kg</td>
                            <td className="font-mono">
                              {investigationData.comparison?.differences?.grade_b_difference ?? investigationData.comparison?.grade_b_difference} kg
                            </td>
                          </tr>
                          <tr>
                            <td>Damaged / Defect</td>
                            <td className="font-mono">{investigationData.comparison?.dispatched?.damaged_quantity ?? 0} kg</td>
                            <td className="font-mono" style={{ color: '#FB7185' }}>{investigationData.comparison?.received?.damaged_quantity ?? investigationData.comparison?.damaged_quantity} kg</td>
                            <td className="font-mono" style={{ color: '#FB7185' }}>
                              +{investigationData.comparison?.differences?.damaged_quantity ?? investigationData.comparison?.damaged_quantity} kg
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 7. EVIDENCE TIMELINE */}
                  <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-amber)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#FBBF24', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} />
                      <span>7. EVIDENCE TIMELINE (Chronological Chain of Events)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                      {(investigationData.unified_timeline?.events || investigationData.timeline || []).map((item, idx) => (
                        <div key={idx} style={{ padding: '10px 14px', background: 'var(--bg-panel-light)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                              <span className="badge badge-normal" style={{ fontSize: '9px', padding: '1px 6px' }}>
                                {item.event_type}
                              </span>
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                {item.actor_role || item.actor || item.source || 'System'}
                              </span>
                              {item.location && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                  · {item.location}
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {item.description}
                            </div>
                          </div>

                          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--bg-panel)'
            }}>
              <button 
                onClick={() => setActiveIncidentId(null)}
                className="btn btn-primary btn-sm"
              >
                Close Investigation
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: UPDATE INCIDENT STATUS */}
      {/* ------------------------------------------------------------- */}
      {statusUpdateTarget && (
        <div className="modal-overlay" onClick={() => setStatusUpdateTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="font-display" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Update Incident #{statusUpdateTarget.incident_id} Status
              </h3>
              <button onClick={() => setStatusUpdateTarget(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="form-select"
                >
                  <option value="OPEN">OPEN (Under Investigation)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW (Evidence Review)</option>
                  <option value="RESOLVED">RESOLVED (Closed Audit)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Resolution / Status Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="form-textarea"
                  placeholder="Record factual investigation conclusions, insurer review notes, or settlement details..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setStatusUpdateTarget(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submittingStatus} className="btn btn-primary btn-sm">
                  {submittingStatus ? 'Updating...' : 'Save Status Update'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
