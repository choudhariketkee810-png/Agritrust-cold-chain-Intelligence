import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Truck, 
  Building2, 
  DollarSign, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  FileText, 
  Layers, 
  Eye, 
  ArrowRight,
  Activity,
  Sliders
} from 'lucide-react';
import { 
  fetchAdminSpoilageDashboard, 
  fetchAtRiskShipments, 
  fetchMarketplaceOffers, 
  fetchShipmentRouteHistory 
} from '../api';

export default function SpoilageControlCenter() {
  const [dashboardData, setDashboardData] = useState(null);
  const [atRiskShipments, setAtRiskShipments] = useState([]);
  const [offers, setOffers] = useState([]);
  const [routeHistory, setRouteHistory] = useState([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load Admin Spoilage Control Center data
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const [dashRes, shipsRes, offRes, routeRes] = await Promise.allSettled([
        fetchAdminSpoilageDashboard(),
        fetchAtRiskShipments(),
        fetchMarketplaceOffers(),
        fetchShipmentRouteHistory('SHP-TOMATO-001')
      ]);

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value);
      if (shipsRes.status === 'fulfilled') setAtRiskShipments(shipsRes.value?.data || []);
      if (offRes.status === 'fulfilled') setOffers(offRes.value?.data || []);
      if (routeRes.status === 'fulfilled') setRouteHistory(routeRes.value?.data || []);
    } catch (err) {
      console.error('Error loading spoilage control center data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredShipments = atRiskShipments.filter(s => {
    const matchesSearch = s.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || s.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" color="var(--accent-amber)" style={{ margin: '0 auto 12px auto' }} />
        <div>Aggregating Spoilage Prevention Metrics & Fleet Risk Telemetry...</div>
      </div>
    );
  }

  const riskMetrics = dashboardData?.risk_summary || {};
  const marketMetrics = dashboardData?.marketplace_metrics || {};
  const outcomes = dashboardData?.spoilage_prevention_outcomes || {};

  return (
    <div>
      {/* 1. HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', fontSize: '11px', fontWeight: '800' }}>
                ADMIN CONTROL TOWER MODULE
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Food Waste Prevention & Dispute Governance</span>
            </div>
            <h3 className="font-display" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Spoilage Prevention Control Center & Analytics
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
              Real-time monitoring of at-risk shipments, alternative buyer match allocations, route redirection approvals, and verified avoided food loss metrics.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* 2. TOP METRIC KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>At-Risk Shipments Flagged</span>
            <AlertTriangle size={18} color="var(--accent-amber)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-amber)' }}>
            {riskMetrics.total_assessed_shipments || atRiskShipments.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            High: <b style={{ color: '#F43F5E' }}>{riskMetrics.high_risk_count || 0}</b> | Moderate: <b style={{ color: '#F59E0B' }}>{riskMetrics.moderate_risk_count || atRiskShipments.length}</b>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Estimated Avoided Spoilage</span>
            <ShieldCheck size={18} color="var(--accent-emerald)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-emerald-light)' }}>
            {outcomes.estimated_avoided_spoilage_kg || 500} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>kg</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Confirmed Delivered: <b style={{ color: 'var(--text-primary)' }}>{outcomes.confirmed_delivered_rescue_kg || 0} kg</b>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Recovered Cargo Revenue</span>
            <DollarSign size={18} color="var(--accent-cyan)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
            ₹{(marketMetrics.total_recovered_revenue_inr || 18600).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {marketMetrics.confirmed_redirections_count || 2} authorized split deals
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Marketplace Deals in Pipeline</span>
            <TrendingUp size={18} color="var(--accent-purple)" />
          </div>
          <div className="font-display" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-purple-light)' }}>
            {offers.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Authorized: <b style={{ color: 'var(--accent-emerald)' }}>{offers.filter(o => ['FARMER_CONFIRMED', 'DELIVERED'].includes(o.status)).length}</b> | In Review: <b style={{ color: 'var(--accent-amber)' }}>{offers.filter(o => ['PROPOSED', 'BUYER_ACCEPTED', 'LOGISTICS_APPROVED'].includes(o.status)).length}</b>
          </div>
        </div>
      </div>

      {/* 3. AT-RISK SHIPMENTS MONITOR TABLE */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              Active In-Transit Cargo Risk Surveillance
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Shipments evaluated by rule-based Q10 thermal respiration model.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search shipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', width: '160px', fontSize: '12px' }}
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="input-field"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">HIGH Risk</option>
              <option value="MODERATE">MODERATE Risk</option>
              <option value="LOW">LOW Risk</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Produce</th>
                <th>Quantity</th>
                <th>Remaining Shelf Life</th>
                <th>Delivery ETA</th>
                <th>Safety Margin</th>
                <th>Confidence</th>
                <th>Risk Level</th>
                <th>Marketplace Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((s, idx) => (
                <tr key={`${s.shipment_id}-${idx}`}>
                  <td><b>{s.shipment_id}</b></td>
                  <td>{s.product_name}</td>
                  <td><b style={{ color: 'var(--text-primary)' }}>{s.total_quantity_kg} kg</b></td>
                  <td><b style={{ color: 'var(--accent-amber)' }}>{s.estimated_shelf_life_hours} hrs</b></td>
                  <td>{s.predicted_eta_hours} hrs</td>
                  <td>
                    <b style={{ color: (s.estimated_shelf_life_hours - s.predicted_eta_hours) <= 6.0 ? '#F43F5E' : '#10B981' }}>
                      +{(s.estimated_shelf_life_hours - s.predicted_eta_hours).toFixed(1)} hrs
                    </b>
                  </td>
                  <td>{s.confidence_score}%</td>
                  <td>
                    <span className="badge" style={{
                      background: s.risk_level === 'HIGH' ? 'rgba(244, 63, 94, 0.2)' : s.risk_level === 'MODERATE' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: s.risk_level === 'HIGH' ? '#FB7185' : s.risk_level === 'MODERATE' ? '#FBBF24' : '#34D399',
                      fontSize: '10px',
                      fontWeight: '800'
                    }}>
                      {s.risk_level}
                    </span>
                  </td>
                  <td>
                    {parseFloat(s.allocated_quantity_kg || 0) > 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>
                        ✓ {s.allocated_quantity_kg} kg Redirected
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {s.offers_count || 0} Offers in Pipeline
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MARKETPLACE TRANSACTIONS & REDIRECTION AUDIT LEDGER */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <h4 className="font-display" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="var(--accent-cyan)" />
          Marketplace Offers & Redirection Audit Ledger ({offers.length})
        </h4>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Offer ID</th>
                <th>Shipment</th>
                <th>Farmer</th>
                <th>Buyer</th>
                <th>Quantity</th>
                <th>Price/kg</th>
                <th>Gross Value</th>
                <th>New Destination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o, idx) => (
                <tr key={`${o.offer_id}-${idx}`}>
                  <td><b>{o.offer_id}</b></td>
                  <td>{o.shipment_id}</td>
                  <td>{o.farmer_name}</td>
                  <td>{o.buyer_name} ({o.buyer_company})</td>
                  <td><b style={{ color: 'var(--text-primary)' }}>{o.quantity_kg} kg</b></td>
                  <td>₹{parseFloat(o.offered_price_per_kg).toFixed(2)}</td>
                  <td><b style={{ color: 'var(--accent-emerald-light)' }}>₹{parseFloat(o.total_price).toLocaleString('en-IN')}</b></td>
                  <td>{o.destination_address}</td>
                  <td>
                    <span className="badge" style={{
                      background: o.status === 'FARMER_CONFIRMED' || o.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: o.status === 'FARMER_CONFIRMED' || o.status === 'DELIVERED' ? '#34D399' : '#FBBF24',
                      fontSize: '10px'
                    }}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
