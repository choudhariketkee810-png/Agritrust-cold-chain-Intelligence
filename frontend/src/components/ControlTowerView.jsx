import React from 'react';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertOctagon, 
  Scale, 
  ThermometerSnowflake, 
  Lock, 
  Unlock, 
  Power, 
  ArrowRight,
  Eye,
  QrCode,
  Search,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export default function ControlTowerView({ 
  shipments = [], 
  fleetMonitoring = [], 
  alertsList = [], 
  incidentsList = [],
  onSelectShipment,
  onOpenInvestigation,
  onOpenVerification,
  onNavigateTab
}) {
  // -------------------------------------------------------------
  // CALCULATE REAL API KPIS
  // -------------------------------------------------------------
  const activeShipmentsCount = shipments.filter(s => s.shipment_status !== 'DELIVERED').length || shipments.length;
  const inTransitCount = shipments.filter(s => s.shipment_status === 'IN_TRANSIT').length;
  
  // At risk count: shipments with risk level HIGH or CRITICAL
  const atRiskCount = fleetMonitoring.filter(m => m.risk_level === 'HIGH' || m.risk_level === 'CRITICAL').length;
  
  // Active alerts count
  const activeAlertsCount = alertsList.filter(a => a.status === 'OPEN').length;
  
  // Pending Handover: CREATED / DISPATCHED
  const pendingHandoverCount = shipments.filter(s => s.shipment_status === 'CREATED' || s.shipment_status === 'DISPATCHED').length;
  
  // Pending Delivery: IN_TRANSIT
  const pendingDeliveryCount = shipments.filter(s => s.shipment_status === 'IN_TRANSIT' || s.shipment_status === 'HANDOVER_COMPLETED').length;
  
  // Quality discrepancies count from incidents
  const qualityDiscrepanciesCount = incidentsList.filter(i => 
    i.incident_type?.includes('DISCREPANCY') || i.incident_type?.includes('QUALITY') || i.incident_type?.includes('QUANTITY')
  ).length;
  
  // Open incidents count
  const openIncidentsCount = incidentsList.filter(i => i.status === 'OPEN' || i.status === 'UNDER_REVIEW').length;

  // -------------------------------------------------------------
  // IDENTIFY FACTUAL "NEEDS ATTENTION" CONDITIONS
  // -------------------------------------------------------------
  const attentionItems = [];

  // 1. Check fleet monitoring conditions
  fleetMonitoring.forEach(item => {
    if (item.risk_level === 'CRITICAL' || item.risk_level === 'HIGH') {
      attentionItems.push({
        id: `risk-${item.shipment_id}`,
        type: 'RISK',
        severity: item.risk_level,
        shipment_id: item.shipment_id,
        title: `High Cold-Chain Risk: ${item.shipment_id}`,
        description: item.risk_reasons?.join('; ') || `Deterministic risk score: ${item.risk_score}/100.`,
        actionLabel: 'View Monitoring',
        action: () => onSelectShipment(item.shipment_id)
      });
    }

    if (item.refrigeration_status === 'OFF') {
      attentionItems.push({
        id: `reefer-off-${item.shipment_id}`,
        type: 'EQUIPMENT',
        severity: 'HIGH',
        shipment_id: item.shipment_id,
        title: `Refrigeration Inactive: ${item.shipment_id}`,
        description: `Compressor status recorded as OFF for vehicle ${item.vehicle_number || ''}.`,
        actionLabel: 'Inspect Telemetry',
        action: () => onSelectShipment(item.shipment_id)
      });
    }

    if (item.door_status === 'OPEN') {
      attentionItems.push({
        id: `door-open-${item.shipment_id}`,
        type: 'SECURITY',
        severity: 'WARNING',
        shipment_id: item.shipment_id,
        title: `Cargo Door Unlocked: ${item.shipment_id}`,
        description: `Door interlock sensor indicates open state during transit.`,
        actionLabel: 'Check Status',
        action: () => onSelectShipment(item.shipment_id)
      });
    }
  });

  // 2. Check open incidents
  incidentsList.filter(i => i.status === 'OPEN').forEach(inc => {
    attentionItems.push({
      id: `incident-${inc.incident_id}`,
      type: 'INCIDENT',
      severity: inc.severity || 'CRITICAL',
      shipment_id: inc.shipment_id,
      title: `Open Discrepancy Incident #${inc.incident_id}`,
      description: inc.description || `Sent-vs-received variance detected on shipment ${inc.shipment_id}.`,
      actionLabel: 'Investigate Dossier',
      action: () => onOpenInvestigation(inc.incident_id)
    });
  });

  // 3. Check active alerts
  alertsList.filter(a => a.status === 'OPEN').forEach(alert => {
    // Avoid exact duplicate
    if (!attentionItems.some(item => item.id === `alert-${alert.alert_id}`)) {
      attentionItems.push({
        id: `alert-${alert.alert_id}`,
        type: 'ALERT',
        severity: alert.severity || 'CRITICAL',
        shipment_id: alert.shipment_id,
        title: `Active Alert #${alert.alert_id}: ${alert.alert_type}`,
        description: alert.message,
        actionLabel: 'View Alert',
        action: () => onNavigateTab('alerts')
      });
    }
  });

  // Helper for risk badge
  const renderRiskBadge = (riskLevel) => {
    switch (riskLevel?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="badge badge-critical"><AlertTriangle size={12} /> CRITICAL</span>;
      case 'HIGH':
        return <span className="badge badge-critical"><AlertTriangle size={12} /> HIGH</span>;
      case 'WARNING':
        return <span className="badge badge-warning"><Clock size={12} /> WARNING</span>;
      case 'NORMAL':
      default:
        return <span className="badge badge-normal"><CheckCircle2 size={12} /> NORMAL</span>;
    }
  };

  // Helper for shipment status badge
  const formatStatusBadge = (rawStatus) => {
    const status = rawStatus?.toUpperCase() || 'CREATED';
    switch (status) {
      case 'IN_TRANSIT':
        return <span className="badge badge-info"><Truck size={11} /> IN TRANSIT</span>;
      case 'HANDOVER_COMPLETED':
      case 'HANDED_OVER':
        return <span className="badge badge-purple"><Clock size={11} /> HANDED OVER</span>;
      case 'DELIVERED':
      case 'RECEIVED':
        return <span className="badge badge-normal"><CheckCircle2 size={11} /> DELIVERED</span>;
      case 'CREATED':
      case 'DISPATCHED':
      default:
        return <span className="badge badge-gray"><Package size={11} /> DISPATCHED</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP KPI STATS GRID (5 CORE KPIS WITH REAL API METRICS) */}
      {/* ------------------------------------------------------------- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '14px' 
      }}>
        {/* 1. Active Shipments */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-primary-blue)', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Shipments</span>
            <Package size={18} color="var(--color-primary-blue)" />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: '#111827', marginTop: '8px' }}>
            {activeShipmentsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '500' }}>
            Consignments in lifecycle
          </div>
        </div>

        {/* 2. At Risk */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${atRiskCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>At Risk</span>
            <AlertTriangle size={18} color={atRiskCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'} />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: atRiskCount > 0 ? '#DC2626' : '#16A34A', marginTop: '8px' }}>
            {atRiskCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '500' }}>
            Multi-factor scoring
          </div>
        </div>

        {/* 3. Temperature Alerts */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${activeAlertsCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temperature Alerts</span>
            <ShieldAlert size={18} color={activeAlertsCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'} />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: activeAlertsCount > 0 ? '#DC2626' : '#16A34A', marginTop: '8px' }}>
            {activeAlertsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '500' }}>
            Active excursions
          </div>
        </div>

        {/* 4. Quality Discrepancies */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${qualityDiscrepanciesCount > 0 ? '#7C3AED' : 'var(--accent-emerald)'}`, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quality Discrepancies</span>
            <Scale size={18} color="#7C3AED" />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: qualityDiscrepanciesCount > 0 ? '#7C3AED' : '#16A34A', marginTop: '8px' }}>
            {qualityDiscrepanciesCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '500' }}>
            Sent vs Received variance
          </div>
        </div>

        {/* 5. Open Incidents */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${openIncidentsCount > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'}`, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Incidents</span>
            <AlertOctagon size={18} color={openIncidentsCount > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'} />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: openIncidentsCount > 0 ? '#D97706' : '#16A34A', marginTop: '8px' }}>
            {openIncidentsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '500' }}>
            Investigation queue
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. "NEEDS ATTENTION" PRIORITY OPERATIONAL SECTION */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={18} color={attentionItems.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'} />
            <h2 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
              Needs Attention — Priority Operational Conditions
            </h2>
          </div>
          <span className={`badge ${attentionItems.length > 0 ? 'badge-critical' : 'badge-normal'}`}>
            {attentionItems.length} CONDITION{attentionItems.length !== 1 ? 'S' : ''} FLAGGED
          </span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-panel)' }}>
            <CheckCircle2 size={24} color="var(--accent-emerald)" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontWeight: '700', color: '#111827' }}>All Fleet Parameters Operating Normally</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              No critical temperature deviations, open incidents, or unauthorized door states detected.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {attentionItems.slice(0, 4).map(item => (
              <div 
                key={item.id} 
                className="panel" 
                style={{ 
                  padding: '14px 16px', 
                  background: 'var(--bg-panel)',
                  borderColor: 'var(--border-card)',
                  borderLeft: `4px solid ${item.severity === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-amber)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                      {item.title}
                    </span>
                    <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                      {item.severity}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button 
                    onClick={item.action}
                    className="btn btn-secondary btn-sm"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. LIVE FLEET SHIPMENT TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="var(--color-primary-blue)" />
              <h2 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
                Active Consignments & Live Telematics
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time multi-dimensional sensor metrics and risk evaluation
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => onNavigateTab('shipments')}
              className="btn btn-secondary btn-sm"
            >
              <span>View All Shipments</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {fleetMonitoring.length === 0 ? (
          <div className="panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-panel)' }}>
            No active shipments currently logging telemetry.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Product</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Vehicle</th>
                  <th>Temperature</th>
                  <th>Target Range</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fleetMonitoring.map(ship => {
                  const isDoorClosed = ship.door_status?.toUpperCase() === 'CLOSED';
                  const isRefrigOn = ship.refrigeration_status?.toUpperCase() === 'ON';
                  const temp = typeof ship.current_temperature === 'number' ? ship.current_temperature : null;
                  const isTempNormal = temp !== null && temp >= (ship.target_temp_min ?? 0) && temp <= (ship.target_temp_max ?? 100);
                  const lastRecorded = ship.recorded_at ? new Date(ship.recorded_at) : null;

                  return (
                    <tr key={ship.shipment_id} style={{ cursor: 'pointer' }} onClick={() => onSelectShipment(ship.shipment_id)}>
                      {/* Shipment ID */}
                      <td className="font-mono" style={{ fontWeight: '800', color: '#018180', whiteSpace: 'nowrap' }}>
                        {ship.shipment_id}
                        {ship.shipment_id?.includes('DEMO') && (
                          <span className="badge badge-demo" style={{ marginLeft: '8px' }}>DEMO DATA</span>
                        )}
                      </td>

                      {/* Product */}
                      <td>
                        <b style={{ color: '#111827' }}>{ship.product_name}</b>
                      </td>

                      {/* Origin */}
                      <td style={{ fontSize: '12px', color: '#4B5563' }}>
                        {ship.origin || 'Nashik'}
                      </td>

                      {/* Destination */}
                      <td style={{ fontSize: '12px', color: '#111827', fontWeight: '600' }}>
                        {ship.destination || 'Mumbai'}
                      </td>

                      {/* Vehicle */}
                      <td className="font-mono" style={{ fontSize: '12px' }}>
                        {ship.vehicle_number || 'MH15AB1234'}
                      </td>

                      {/* Temperature */}
                      <td>
                        <span className="font-mono" style={{ 
                          fontWeight: '800', 
                          color: isTempNormal ? '#16A34A' : '#DC2626',
                          fontSize: '13px'
                        }}>
                          {temp !== null ? `${temp.toFixed(1)} °C` : 'N/A'}
                        </span>
                      </td>

                      {/* Target Range */}
                      <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {ship.target_temp_min}°C – {ship.target_temp_max}°C
                      </td>

                      {/* Risk */}
                      <td>
                        {renderRiskBadge(ship.risk_level)}
                      </td>

                      {/* Status */}
                      <td>
                        {formatStatusBadge(ship.shipment_status)}
                      </td>

                      {/* Last Updated */}
                      <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {lastRecorded ? lastRecorded.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => onSelectShipment(ship.shipment_id)}
                            className="btn btn-secondary btn-sm"
                            title="Open detailed view & live monitoring"
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>
                          
                          <button
                            onClick={() => onOpenVerification(ship.shipment_id)}
                            className="btn btn-cyan btn-sm"
                            title="Verify original immutable record"
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

    </div>
  );
}
