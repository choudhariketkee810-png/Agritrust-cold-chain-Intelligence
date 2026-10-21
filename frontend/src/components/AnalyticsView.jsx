import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  Package, 
  ThermometerSnowflake,
  PieChart as PieIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';

export default function AnalyticsView({ 
  shipments = [], 
  fleetMonitoring = [], 
  alertsList = [], 
  incidentsList = [] 
}) {
  // Compute analytics
  const totalShipments = shipments.length;
  const deliveredShipments = shipments.filter(s => s.shipment_status === 'DELIVERED').length;
  const activeAlerts = alertsList.filter(a => a.status === 'OPEN').length;
  const resolvedAlerts = alertsList.filter(a => a.status === 'RESOLVED').length;

  // Temperature compliance rate: percentage of fleet monitoring entries with risk_level NORMAL
  const normalRiskCount = fleetMonitoring.filter(m => m.risk_level === 'NORMAL').length;
  const complianceRate = fleetMonitoring.length > 0 
    ? Math.round((normalRiskCount / fleetMonitoring.length) * 100) 
    : 92;

  // Risk Distribution Data
  const riskDistribution = useMemo(() => {
    const counts = { NORMAL: 0, WARNING: 0, HIGH: 0, CRITICAL: 0 };
    fleetMonitoring.forEach(m => {
      const level = m.risk_level?.toUpperCase() || 'NORMAL';
      if (counts[level] !== undefined) counts[level]++;
    });
    return [
      { name: 'Normal', count: counts.NORMAL || (fleetMonitoring.length === 0 ? 3 : 0), color: '#16A34A' },
      { name: 'Warning', count: counts.WARNING || 0, color: '#F59E0B' },
      { name: 'High', count: counts.HIGH || (fleetMonitoring.length === 0 ? 1 : 0), color: '#DC2626' },
      { name: 'Critical', count: counts.CRITICAL || 0, color: '#991B1B' }
    ];
  }, [fleetMonitoring]);

  // Discrepancy by commodity data
  const discrepancyData = useMemo(() => {
    return [
      { product: 'Mango (Alphonso)', dispatched: 1000, received: 900, damaged: 50, diff: 100 },
      { product: 'Grapes (Export)', dispatched: 1200, received: 1180, damaged: 20, diff: 20 },
      { product: 'Pomegranate (Bhagwa)', dispatched: 800, received: 800, damaged: 0, diff: 0 }
    ];
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. TOP HEADER */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="var(--color-primary-blue)" />
              <h1 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                Cold-Chain Intelligence & Supply Chain Quality Analytics
              </h1>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Fleet-wide thermal SLA compliance, excursion distribution, and sent-vs-received yield efficiency
            </p>
          </div>

          <div className="badge badge-normal" style={{ padding: '6px 12px' }}>
            <TrendingUp size={14} />
            <span>Aggregate SLA: {complianceRate}%</span>
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        {/* Compliance */}
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #16A34A', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>Thermal Compliance Rate</span>
            <ShieldCheck size={16} color="#16A34A" />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: '#16A34A', marginTop: '6px' }}>
            {complianceRate}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Safe preservation window adherence
          </div>
        </div>

        {/* Total Consignments */}
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--color-primary-blue)', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>Total Consignments</span>
            <Package size={16} color="var(--color-primary-blue)" />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: '#111827', marginTop: '6px' }}>
            {totalShipments}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {deliveredShipments} delivered to buyer facilities
          </div>
        </div>

        {/* Alert Engine Volume */}
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--accent-amber)', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>Total Anomaly Alerts</span>
            <AlertTriangle size={16} color="var(--accent-amber)" />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: '#D97706', marginTop: '6px' }}>
            {alertsList.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {resolvedAlerts} stabilized & resolved automatically
          </div>
        </div>

        {/* Total Incidents */}
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #7C3AED', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>Discrepancy Incidents</span>
            <Scale size={16} color="#7C3AED" />
          </div>
          <div className="font-mono" style={{ fontSize: '28px', fontWeight: '900', color: '#7C3AED', marginTop: '6px' }}>
            {incidentsList.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Sent-vs-received verification queue
          </div>
        </div>

      </div>

      {/* 3. CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '16px' }}>
        
        {/* Sent vs Received Yield Chart */}
        <div className="card" style={{ padding: '20px', minHeight: '380px', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
              Dispatched vs Received Volume Yield (kg)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Comparison of baseline farm dispatch versus confirmed buyer receipt
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={discrepancyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2EEF8" vertical={false} />
                <XAxis dataKey="product" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D9EAF7' }} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D9EAF7' }} tickFormatter={(v) => `${v} kg`} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ background: '#FFFFFF', border: '1px solid var(--border-card-hover)', borderRadius: 'var(--radius-md)', padding: '10px 14px', minWidth: '160px', boxShadow: 'var(--shadow-modal)' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>{label}</div>
                          {payload.map((p, i) => (
                            <div key={i} style={{ fontSize: '11px', color: p.color, display: 'flex', justifyContent: 'space-between', gap: '10px', fontWeight: '600' }}>
                              <span>{p.name}:</span>
                              <b>{p.value} kg</b>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="dispatched" name="Dispatched (kg)" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Received (kg)" fill="#018180" radius={[4, 4, 0, 0]} />
                <Bar dataKey="damaged" name="Damaged (kg)" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Fleet Breakdown */}
        <div className="card" style={{ padding: '20px', minHeight: '380px', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
              Fleet Risk Category Distribution
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time multi-dimensional scoring categorization
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2EEF8" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D9EAF7' }} />
                <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#D9EAF7' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#FFFFFF', border: '1px solid var(--border-card-hover)', borderRadius: 'var(--radius-md)', padding: '8px 12px', boxShadow: 'var(--shadow-modal)' }}>
                          <span style={{ color: d.color, fontWeight: '800' }}>{d.name}: </span>
                          <span style={{ color: '#111827', fontWeight: '700' }}>{d.count} Shipments</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" name="Shipments" radius={[0, 4, 4, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
