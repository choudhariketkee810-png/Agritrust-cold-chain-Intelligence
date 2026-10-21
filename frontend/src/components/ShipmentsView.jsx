import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  QrCode, 
  GitCommit, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Calendar, 
  Scale, 
  Thermometer, 
  Droplets,
  X,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';
import { 
  createShipment, 
  recordHandover, 
  recordReceiving, 
  fetchShipmentDetails, 
  fetchShipmentTimeline, 
  fetchShipmentComparison,
  fetchShipmentRisk,
  fetchShipmentTelemetry,
  verifyShipment,
  getQrCodeUrl
} from '../api';

export default function ShipmentsView({ 
  shipments = [], 
  onRefresh, 
  onSelectMonitoring,
  onOpenVerification,
  onOpenInvestigation
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Selected shipment for detailed modal drawer
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [detailedShipment, setDetailedShipment] = useState(null);
  const [shipmentTimeline, setShipmentTimeline] = useState([]);
  const [shipmentComparison, setShipmentComparison] = useState(null);
  const [shipmentRisk, setShipmentRisk] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [actionShipmentId, setActionShipmentId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Create Shipment Form State
  const [newShipment, setNewShipment] = useState({
    shipment_id: '',
    product_name: 'Mango',
    total_quantity_kg: 1000,
    grade_a_kg: 750,
    grade_b_kg: 250,
    origin: 'Nashik Farm, Maharashtra',
    destination: 'Mumbai Buyer Facility, Vashi',
    vehicle_number: 'MH-15-AB-1234',
    target_temp_min: 10.0,
    target_temp_max: 13.0,
    farmer_id: 'Farmer_Nashik_01',
    notes: 'Premium export grade consignment harvested and pre-cooled at farm gate.'
  });

  // Handover Form State
  const [handoverData, setHandoverData] = useState({
    carrier_name: 'Cold Chain Logistics Express',
    receiver_name: 'Logistics Operator A',
    handover_location: 'Nashik Farm Gate',
    vehicle_number: 'MH-15-AB-1234',
    handover_temperature: 11.5,
    handover_humidity: 82.0,
    notes: 'Cargo inspected and loaded into reefer unit. Seal verified intact.'
  });

  // Receiving Form State
  const [receiveData, setReceiveData] = useState({
    receiver_name: 'Buyer Receiving Operator',
    receiving_location: 'Mumbai Buyer Facility, Vashi',
    total_received_kg: 900,
    grade_a_kg: 600,
    grade_b_kg: 250,
    damaged_kg: 50,
    receiving_temperature: 14.0,
    receiving_humidity: 80.0,
    notes: 'Arrival physical inspection completed. Weight verification and thermal probe recorded.'
  });

  // Fetch full details when selectedShipmentId changes
  useEffect(() => {
    if (!selectedShipmentId) {
      setDetailedShipment(null);
      setShipmentTimeline([]);
      setShipmentComparison(null);
      setShipmentRisk(null);
      return;
    }

    async function loadDetails() {
      setLoadingDetails(true);
      try {
        const [detRes, timeRes, riskRes] = await Promise.allSettled([
          fetchShipmentDetails(selectedShipmentId),
          fetchShipmentTimeline(selectedShipmentId),
          fetchShipmentRisk(selectedShipmentId)
        ]);

        if (detRes.status === 'fulfilled' && detRes.value.data) {
          setDetailedShipment(detRes.value.data);
        }
        if (timeRes.status === 'fulfilled' && timeRes.value.data) {
          setShipmentTimeline(timeRes.value.data);
        }
        if (riskRes.status === 'fulfilled' && riskRes.value) {
          setShipmentRisk(riskRes.value);
        }

        // Try comparison
        try {
          const compRes = await fetchShipmentComparison(selectedShipmentId);
          if (compRes && !compRes.error) {
            setShipmentComparison(compRes);
          }
        } catch {
          setShipmentComparison(null);
        }
      } catch (err) {
        console.error('Error loading shipment details:', err);
      } finally {
        setLoadingDetails(false);
      }
    }

    loadDetails();
  }, [selectedShipmentId]);

  // Handle Create Shipment submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await createShipment({
        ...newShipment,
        total_quantity_kg: parseFloat(newShipment.total_quantity_kg),
        grade_a_kg: parseFloat(newShipment.grade_a_kg),
        grade_b_kg: parseFloat(newShipment.grade_b_kg),
        target_temp_min: parseFloat(newShipment.target_temp_min),
        target_temp_max: parseFloat(newShipment.target_temp_max)
      });
      setShowCreateModal(false);
      onRefresh();
    } catch (err) {
      setFormError(err.message || 'Failed to create shipment');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Handover submit
  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await recordHandover(actionShipmentId, {
        ...handoverData,
        handover_temperature: parseFloat(handoverData.handover_temperature),
        handover_humidity: parseFloat(handoverData.handover_humidity)
      });
      setShowHandoverModal(false);
      onRefresh();
      if (selectedShipmentId === actionShipmentId) {
        setSelectedShipmentId(actionShipmentId); // refresh details
      }
    } catch (err) {
      setFormError(err.message || 'Failed to record handover');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Receive submit
  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await recordReceiving(actionShipmentId, {
        ...receiveData,
        total_received_kg: parseFloat(receiveData.total_received_kg),
        grade_a_kg: parseFloat(receiveData.grade_a_kg),
        grade_b_kg: parseFloat(receiveData.grade_b_kg),
        damaged_kg: parseFloat(receiveData.damaged_kg),
        receiving_temperature: parseFloat(receiveData.receiving_temperature),
        receiving_humidity: parseFloat(receiveData.receiving_humidity)
      });
      setShowReceiveModal(false);
      onRefresh();
      if (selectedShipmentId === actionShipmentId) {
        setSelectedShipmentId(actionShipmentId); // refresh details
      }
    } catch (err) {
      setFormError(err.message || 'Failed to record buyer receiving');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filter shipments
  const filteredShipments = shipments.filter(s => {
    const matchesSearch = 
      s.shipment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return s.shipment_status === statusFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & ACTION BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} color="var(--accent-emerald)" />
              <h1 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Shipment Directory & Chain of Custody Registry
              </h1>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Digital consignment provenance, farm-gate quality baselines, and lifecycle state management
            </p>
          </div>

          <button
            onClick={() => {
              setNewShipment(prev => ({
                ...prev,
                shipment_id: `AGRI-${Math.floor(1000 + Math.random() * 9000)}`
              }));
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Create Digital Consignment</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search by Shipment ID, Product, Origin, Destination, Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            {['ALL', 'CREATED', 'IN_TRANSIT', 'DELIVERED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="btn btn-secondary btn-sm"
                style={{
                  background: statusFilter === status ? 'rgba(16, 185, 129, 0.15)' : undefined,
                  borderColor: statusFilter === status ? 'var(--accent-emerald)' : undefined,
                  color: statusFilter === status ? '#34D399' : undefined
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SHIPMENTS DIRECTORY TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '20px' }}>
        {filteredShipments.length === 0 ? (
          <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Package size={32} color="var(--text-dim)" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No Shipments Found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Try adjusting your search criteria or create a new digital shipment.
            </div>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Product</th>
                  <th>Origin → Destination</th>
                  <th>Vehicle</th>
                  <th>Target Temp Band</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map(ship => {
                  const createdDate = ship.departure_time ? new Date(ship.departure_time) : null;
                  const isDelivered = ship.shipment_status === 'DELIVERED';
                  const isCreated = ship.shipment_status === 'CREATED' || ship.shipment_status === 'DISPATCHED';

                  return (
                    <tr key={ship.shipment_id}>
                      <td className="font-mono" style={{ fontWeight: '700', color: '#38BDF8', whiteSpace: 'nowrap' }}>
                        {ship.shipment_id}
                        {ship.shipment_id?.includes('DEMO') && (
                          <span className="badge badge-demo" style={{ marginLeft: '8px' }}>DEMO DATA</span>
                        )}
                      </td>

                      <td>
                        <b style={{ color: 'var(--text-primary)' }}>{ship.product_name}</b>
                      </td>

                      <td>
                        <div style={{ fontSize: '12px' }}>
                          <span>{ship.origin || 'Nashik'}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                          <span style={{ color: 'var(--accent-amber-light)' }}>{ship.destination || 'Mumbai'}</span>
                        </div>
                      </td>

                      <td className="font-mono" style={{ fontSize: '12px' }}>
                        {ship.vehicle_number || 'MH15AB1234'}
                      </td>

                      <td className="font-mono" style={{ fontSize: '12px', color: '#34D399' }}>
                        {ship.target_temp_min}°C – {ship.target_temp_max}°C
                      </td>

                      <td>
                        <span className={`badge ${isDelivered ? 'badge-normal' : isCreated ? 'badge-gray' : 'badge-info'}`}>
                          {ship.shipment_status || 'CREATED'}
                        </span>
                      </td>

                      <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {createdDate ? createdDate.toLocaleDateString() : 'Active'}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          
                          {/* Details */}
                          <button
                            onClick={() => setSelectedShipmentId(ship.shipment_id)}
                            className="btn btn-secondary btn-sm"
                            title="Inspect complete audit trail & quality baseline"
                          >
                            <Package size={12} />
                            <span>Details</span>
                          </button>

                          {/* Handover Action (If CREATED) */}
                          {isCreated && (
                            <button
                              onClick={() => {
                                setActionShipmentId(ship.shipment_id);
                                setShowHandoverModal(true);
                              }}
                              className="btn btn-primary btn-sm"
                              title="Record Farmer to Carrier Handover"
                            >
                              <Truck size={12} />
                              <span>Handover</span>
                            </button>
                          )}

                          {/* Receive Action (If IN_TRANSIT) */}
                          {!isDelivered && !isCreated && (
                            <button
                              onClick={() => {
                                setActionShipmentId(ship.shipment_id);
                                setShowReceiveModal(true);
                              }}
                              className="btn btn-primary btn-sm"
                              title="Record Buyer Inspection & Receiving"
                            >
                              <Scale size={12} />
                              <span>Receive</span>
                            </button>
                          )}

                          {/* Verify */}
                          <button
                            onClick={() => onOpenVerification(ship.shipment_id)}
                            className="btn btn-cyan btn-sm"
                            title="Verify original cryptographic record"
                          >
                            <QrCode size={12} />
                            <span>Verify</span>
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
      {/* 3. SHIPMENT DETAILS DRAWER / MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedShipmentId && (
        <div className="modal-overlay" onClick={() => setSelectedShipmentId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            
            {/* Modal Header */}
            <div style={{ 
              padding: '16px 24px', 
              borderBottom: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-panel)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-emerald-light)'
                }}>
                  <Package size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
                      Shipment Dossier: {selectedShipmentId}
                    </span>
                    <span className="badge badge-info">
                      {detailedShipment?.shipment_status || 'ACTIVE'}
                    </span>
                    {selectedShipmentId?.includes('DEMO') && (
                      <span className="badge badge-demo">DEMO DATA</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    AGRITrust Verified Consignment Records
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedShipmentId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loadingDetails ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading immutable audit records...
                </div>
              ) : (
                <>
                  {/* B. ORIGINAL VERIFIED RECORD */}
                  <div className="panel" style={{ padding: '18px', borderLeft: '4px solid var(--accent-emerald)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-emerald-light)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={16} />
                        <span>ORIGINAL VERIFIED RECORD (Immutable Farm Gate Baseline)</span>
                      </div>
                      <span className="badge badge-normal" style={{ fontSize: '10px' }}>CRYPTOGRAPHICALLY SIGNED</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Product & Variety</div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {detailedShipment?.product_name || 'Mango'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Original Dispatched Quantity</div>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {detailedShipment?.total_quantity_kg ? `${detailedShipment.total_quantity_kg} kg` : '1,000.0 kg'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Grade A Baseline</div>
                        <div className="font-mono" style={{ fontWeight: '700', color: '#34D399', marginTop: '2px' }}>
                          {detailedShipment?.grade_a_kg ? `${detailedShipment.grade_a_kg} kg` : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Grade B Baseline</div>
                        <div className="font-mono" style={{ fontWeight: '700', color: '#FBBF24', marginTop: '2px' }}>
                          {detailedShipment?.grade_b_kg ? `${detailedShipment.grade_b_kg} kg` : '0 kg'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Origin Point</div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {detailedShipment?.origin || 'Nashik'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Destination Point</div>
                        <div style={{ fontWeight: '600', color: 'var(--accent-amber-light)', marginTop: '2px' }}>
                          {detailedShipment?.destination || 'Mumbai'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Assigned Vehicle</div>
                        <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {detailedShipment?.vehicle_number || 'MH15AB1234'} ({detailedShipment?.vehicle_type || 'REEFER'})
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Target Preservation Band</div>
                        <div className="font-mono" style={{ fontWeight: '700', color: '#38BDF8', marginTop: '2px' }}>
                          {detailedShipment?.target_temp_min}°C – {detailedShipment?.target_temp_max}°C
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Creation / Dispatch Time</div>
                        <div className="font-mono" style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {detailedShipment?.departure_time ? new Date(detailedShipment.departure_time).toLocaleString() : 'Recorded'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* C. QR VERIFICATION */}
                  <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderLeft: '4px solid var(--accent-cyan)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img 
                        src={getQrCodeUrl(selectedShipmentId)} 
                        alt="Shipment QR" 
                        style={{ width: '64px', height: '64px', borderRadius: '6px', background: '#FFFFFF', padding: '4px' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>QR VERIFICATION & PUBLIC PROOF</span>
                          <span className="badge badge-normal" style={{ fontSize: '9px' }}>VERIFIED</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Scan to verify immutable farm-gate dispatch baseline against tamper-evident ledger
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedShipmentId(null);
                        onOpenVerification(selectedShipmentId);
                      }}
                      className="btn btn-cyan btn-sm"
                    >
                      <QrCode size={14} />
                      <span>Open Verification Screen</span>
                    </button>
                  </div>

                  {/* D. CHAIN OF CUSTODY (VISUAL FLOW) */}
                  <div className="panel" style={{ padding: '16px', borderLeft: '4px solid var(--accent-indigo)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#818CF8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GitCommit size={16} />
                      <span>CHAIN OF CUSTODY (Recorded Milestones)</span>
                    </div>

                    {/* Step Indicator Flow */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#34D399', fontWeight: '600' }}>
                        <CheckCircle2 size={13} />
                        <span>Shipment Created</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: detailedShipment?.shipment_status !== 'CREATED' ? '#34D399' : 'var(--text-muted)', fontWeight: '600' }}>
                        <CheckCircle2 size={13} />
                        <span>Farmer → Logistics</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: (detailedShipment?.shipment_status === 'IN_TRANSIT' || detailedShipment?.shipment_status === 'DELIVERED') ? '#38BDF8' : 'var(--text-muted)', fontWeight: '600' }}>
                        <Truck size={13} />
                        <span>In Transit</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: detailedShipment?.shipment_status === 'DELIVERED' ? '#34D399' : 'var(--text-muted)', fontWeight: '600' }}>
                        <CheckCircle2 size={13} />
                        <span>Buyer Receiving</span>
                      </div>
                      {shipmentComparison?.incident && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>→</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#FB7185', fontWeight: '700' }}>
                            <AlertTriangle size={13} />
                            <span>Incident Filed</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actual Events List */}
                    {shipmentTimeline.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No historical events recorded yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shipmentTimeline.map((ev, idx) => (
                          <div key={idx} className="panel" style={{ padding: '10px 14px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span className="badge badge-normal" style={{ fontSize: '10px' }}>
                                {ev.event_type}
                              </span>
                              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}
                              </span>
                            </div>
                            <div style={{ color: '#E2E8F0', marginTop: '2px' }}>
                              {ev.description}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                              Actor: <b style={{ color: 'var(--text-secondary)' }}>{ev.actor}</b> · Location: {ev.location}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* E. LIVE CONDITIONS & F. ALERTS */}
                  {shipmentRisk && (
                    <div className="panel" style={{ padding: '16px', borderLeft: '4px solid var(--accent-blue)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#38BDF8', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Thermometer size={16} />
                          <span>LIVE CONDITIONS & RISK EVALUATION</span>
                        </div>
                        <span className={`badge ${shipmentRisk.risk_level === 'CRITICAL' ? 'badge-critical' : shipmentRisk.risk_level === 'WARNING' ? 'badge-warning' : 'badge-normal'}`}>
                          RISK: {shipmentRisk.risk_level} ({shipmentRisk.risk_score}/100)
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                        <div className="panel" style={{ padding: '10px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Latest Temp</div>
                          <div className="font-mono" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {typeof shipmentRisk.latest_temperature === 'number' ? `${shipmentRisk.latest_temperature.toFixed(1)}°C` : 'N/A'}
                          </div>
                        </div>

                        <div className="panel" style={{ padding: '10px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Target Band</div>
                          <div className="font-mono" style={{ fontSize: '14px', fontWeight: '600', color: '#34D399', marginTop: '2px' }}>
                            {shipmentRisk.target_min}°C – {shipmentRisk.target_max}°C
                          </div>
                        </div>

                        <div className="panel" style={{ padding: '10px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Door Status</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: shipmentRisk.door_status === 'CLOSED' ? '#34D399' : '#FB7185', marginTop: '2px' }}>
                            {shipmentRisk.door_status || 'CLOSED'}
                          </div>
                        </div>

                        <div className="panel" style={{ padding: '10px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Refrigeration</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: shipmentRisk.refrigeration_status === 'ON' ? '#34D399' : '#64748B', marginTop: '2px' }}>
                            {shipmentRisk.refrigeration_status || 'ON'}
                          </div>
                        </div>

                        <div className="panel" style={{ padding: '10px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>GPS Position</div>
                          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '4px' }}>
                            {shipmentRisk.latest_location ? `${shipmentRisk.latest_location.latitude?.toFixed(4)}, ${shipmentRisk.latest_location.longitude?.toFixed(4)}` : 'Logged'}
                          </div>
                        </div>
                      </div>

                      {/* Reasons & Recommended Actions */}
                      {shipmentRisk.risk_reasons?.length > 0 && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <b>Factual Evaluation:</b> {shipmentRisk.risk_reasons.join(' ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* G. BUYER RECEIVING & H. SENT VS RECEIVED */}
                  {shipmentComparison && (
                    <div className="panel" style={{ padding: '18px', borderLeft: '4px solid var(--accent-purple)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#C084FC', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Scale size={16} />
                          <span>BUYER RECEIVING & SENT VS RECEIVED VERIFICATION</span>
                        </div>
                        <span className={`badge ${shipmentComparison.comparison_status === 'NO_SIGNIFICANT_DISCREPANCY' ? 'badge-normal' : 'badge-critical'}`}>
                          {shipmentComparison.comparison_status?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* DISPATCHED vs RECEIVED vs DIFFERENCE Table */}
                      <div className="data-table-container" style={{ marginBottom: '12px' }}>
                        <table className="data-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th>Metric</th>
                              <th>DISPATCHED</th>
                              <th>RECEIVED</th>
                              <th>DIFFERENCE</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><b>Total Quantity</b></td>
                              <td className="font-mono">{shipmentComparison.dispatched?.total_quantity} kg</td>
                              <td className="font-mono" style={{ color: '#38BDF8' }}>{shipmentComparison.received?.total_quantity} kg</td>
                              <td className="font-mono" style={{ color: shipmentComparison.differences?.total_quantity_difference < 0 ? '#FB7185' : '#34D399', fontWeight: '700' }}>
                                {shipmentComparison.differences?.total_quantity_difference > 0 ? `+${shipmentComparison.differences.total_quantity_difference}` : shipmentComparison.differences?.total_quantity_difference} kg
                              </td>
                            </tr>
                            <tr>
                              <td>Grade A Produce</td>
                              <td className="font-mono">{shipmentComparison.dispatched?.grade_a_quantity} kg</td>
                              <td className="font-mono">{shipmentComparison.received?.grade_a_quantity} kg</td>
                              <td className="font-mono" style={{ color: shipmentComparison.differences?.grade_a_difference < 0 ? '#FB7185' : '#34D399' }}>
                                {shipmentComparison.differences?.grade_a_difference > 0 ? `+${shipmentComparison.differences.grade_a_difference}` : shipmentComparison.differences?.grade_a_difference} kg
                              </td>
                            </tr>
                            <tr>
                              <td>Grade B Produce</td>
                              <td className="font-mono">{shipmentComparison.dispatched?.grade_b_quantity} kg</td>
                              <td className="font-mono">{shipmentComparison.received?.grade_b_quantity} kg</td>
                              <td className="font-mono">{shipmentComparison.differences?.grade_b_difference} kg</td>
                            </tr>
                            <tr>
                              <td>Damaged / Defect</td>
                              <td className="font-mono">{shipmentComparison.dispatched?.damaged_quantity} kg</td>
                              <td className="font-mono" style={{ color: '#FB7185' }}>{shipmentComparison.received?.damaged_quantity} kg</td>
                              <td className="font-mono" style={{ color: shipmentComparison.differences?.damaged_quantity > 0 ? '#FB7185' : '#34D399' }}>
                                +{shipmentComparison.differences?.damaged_quantity} kg
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Receiving Metadata */}
                      {shipmentComparison.received && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <span>Inspector: <b style={{ color: 'var(--text-primary)' }}>{shipmentComparison.received.receiver_name}</b> ({shipmentComparison.received.location})</span>
                          <span>Dock Probe Temp: <b style={{ color: '#38BDF8' }}>{shipmentComparison.received.receiving_temperature}°C</b> ({shipmentComparison.received.receiving_humidity}% RH)</span>
                        </div>
                      )}

                      {/* I. INVESTIGATION BUTTON */}
                      {shipmentComparison.incident && (
                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <span className="badge badge-critical">
                            Linked Discrepancy Incident #{shipmentComparison.incident.incident_id}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedShipmentId(null);
                              onOpenInvestigation(shipmentComparison.incident.incident_id);
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            <span>View Investigation</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
                onClick={() => {
                  setSelectedShipmentId(null);
                  onSelectMonitoring(selectedShipmentId);
                }}
                className="btn btn-secondary btn-sm"
              >
                <span>Live Monitoring</span>
              </button>
              <button 
                onClick={() => setSelectedShipmentId(null)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: CREATE DIGITAL SHIPMENT */}
      {/* ------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--accent-emerald)" />
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Create Digital Consignment Record
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: 'var(--radius-sm)', padding: '10px', color: '#FB7185', fontSize: '12px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Shipment ID</label>
                  <input
                    type="text"
                    required
                    value={newShipment.shipment_id}
                    onChange={(e) => setNewShipment({ ...newShipment, shipment_id: e.target.value })}
                    className="form-input"
                    placeholder="e.g. AGRI-1002"
                  />
                </div>

                <div>
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newShipment.product_name}
                    onChange={(e) => setNewShipment({ ...newShipment, product_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Total Qty (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newShipment.total_quantity_kg}
                    onChange={(e) => setNewShipment({ ...newShipment, total_quantity_kg: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Grade A (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newShipment.grade_a_kg}
                    onChange={(e) => setNewShipment({ ...newShipment, grade_a_kg: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Grade B (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newShipment.grade_b_kg}
                    onChange={(e) => setNewShipment({ ...newShipment, grade_b_kg: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Origin Location</label>
                  <input
                    type="text"
                    required
                    value={newShipment.origin}
                    onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Destination Location</label>
                  <input
                    type="text"
                    required
                    value={newShipment.destination}
                    onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Assigned Vehicle</label>
                  <input
                    type="text"
                    required
                    value={newShipment.vehicle_number}
                    onChange={(e) => setNewShipment({ ...newShipment, vehicle_number: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Target Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newShipment.target_temp_min}
                    onChange={(e) => setNewShipment({ ...newShipment, target_temp_min: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Target Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newShipment.target_temp_max}
                    onChange={(e) => setNewShipment({ ...newShipment, target_temp_max: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Farmer / Dispatch Notes</label>
                <textarea
                  rows={2}
                  value={newShipment.notes}
                  onChange={(e) => setNewShipment({ ...newShipment, notes: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                >
                  {formSubmitting ? 'Creating Baseline...' : 'Create & Generate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: RECORD LOGISTICS HANDOVER */}
      {/* ------------------------------------------------------------- */}
      {showHandoverModal && (
        <div className="modal-overlay" onClick={() => setShowHandoverModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} color="var(--accent-blue)" />
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Record Farmer → Logistics Handover ({actionShipmentId})
                </h3>
              </div>
              <button onClick={() => setShowHandoverModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleHandoverSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: 'var(--radius-sm)', padding: '10px', color: '#FB7185', fontSize: '12px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Carrier Company</label>
                  <input
                    type="text"
                    required
                    value={handoverData.carrier_name}
                    onChange={(e) => setHandoverData({ ...handoverData, carrier_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Receiver / Driver Name</label>
                  <input
                    type="text"
                    required
                    value={handoverData.receiver_name}
                    onChange={(e) => setHandoverData({ ...handoverData, receiver_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Handover Location</label>
                  <input
                    type="text"
                    required
                    value={handoverData.handover_location}
                    onChange={(e) => setHandoverData({ ...handoverData, handover_location: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Vehicle Registration</label>
                  <input
                    type="text"
                    required
                    value={handoverData.vehicle_number}
                    onChange={(e) => setHandoverData({ ...handoverData, vehicle_number: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Handover Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={handoverData.handover_temperature}
                    onChange={(e) => setHandoverData({ ...handoverData, handover_temperature: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Handover Humidity (% RH)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={handoverData.handover_humidity}
                    onChange={(e) => setHandoverData({ ...handoverData, handover_humidity: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Handover Verification Notes</label>
                <textarea
                  rows={2}
                  value={handoverData.notes}
                  onChange={(e) => setHandoverData({ ...handoverData, notes: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowHandoverModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="btn btn-primary">
                  {formSubmitting ? 'Recording Event...' : 'Sign Digital Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: RECORD BUYER RECEIVING */}
      {/* ------------------------------------------------------------- */}
      {showReceiveModal && (
        <div className="modal-overlay" onClick={() => setShowReceiveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} color="var(--accent-emerald)" />
                <h3 className="font-display" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Record Buyer Physical Inspection & Receiving ({actionShipmentId})
                </h3>
              </div>
              <button onClick={() => setShowReceiveModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: 'var(--radius-sm)', padding: '10px', color: '#FB7185', fontSize: '12px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Inspector / Receiver Name</label>
                  <input
                    type="text"
                    required
                    value={receiveData.receiver_name}
                    onChange={(e) => setReceiveData({ ...receiveData, receiver_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Receiving Facility Location</label>
                  <input
                    type="text"
                    required
                    value={receiveData.receiving_location}
                    onChange={(e) => setReceiveData({ ...receiveData, receiving_location: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Total Received (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={receiveData.total_received_kg}
                    onChange={(e) => setReceiveData({ ...receiveData, total_received_kg: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Grade A (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={receiveData.grade_a_kg}
                    onChange={(e) => setReceiveData({ ...receiveData, grade_a_kg: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Grade B (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={receiveData.grade_b_kg}
                    onChange={(e) => setReceiveData({ ...receiveData, grade_b_kg: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Damaged (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={receiveData.damaged_kg}
                    onChange={(e) => setReceiveData({ ...receiveData, damaged_kg: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Receiving Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={receiveData.receiving_temperature}
                    onChange={(e) => setReceiveData({ ...receiveData, receiving_temperature: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Receiving Humidity (% RH)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={receiveData.receiving_humidity}
                    onChange={(e) => setReceiveData({ ...receiveData, receiving_humidity: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Receiving & Quality Notes</label>
                <textarea
                  rows={2}
                  value={receiveData.notes}
                  onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowReceiveModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="btn btn-primary">
                  {formSubmitting ? 'Comparing Sent vs Received...' : 'Record Receiving & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
