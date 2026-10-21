import React from 'react';
import { 
  Package, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  ThermometerSnowflake,
  Scale
} from 'lucide-react';

export default function ShipmentCard({ shipmentData, latestTelemetry }) {
  if (!shipmentData) {
    return null;
  }

  const departure = shipmentData.departure_time ? new Date(shipmentData.departure_time) : null;
  const delivery = shipmentData.expected_delivery_time ? new Date(shipmentData.expected_delivery_time) : null;

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '20px', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--bg-panel-light)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#018180'
          }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-display" style={{ fontSize: '17px', fontWeight: '800', color: '#111827' }}>
                Shipment {shipmentData.shipment_id}
              </span>
              <span className="badge badge-info" style={{ fontSize: '10px' }}>
                {shipmentData.shipment_status || 'IN TRANSIT'}
              </span>
              {shipmentData.shipment_id?.includes('DEMO') && (
                <span className="badge badge-demo">DEMO DATA</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Perishable Cargo: <b style={{ color: '#111827' }}>{shipmentData.product_name}</b>
            </div>
          </div>
        </div>

        {/* Route Pills */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          background: 'var(--bg-panel-light)', 
          padding: '8px 16px', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--border-card)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>{shipmentData.origin || 'Nashik'}</span>
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>{shipmentData.destination || 'Mumbai'}</span>
          </div>
        </div>
      </div>

      {/* Grid of details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
        
        {/* Assigned Vehicle */}
        <div className="panel" style={{ padding: '12px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            <Truck size={14} color="var(--accent-blue)" />
            <span>Assigned Vehicle</span>
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: '#111827', marginTop: '6px' }}>
            {shipmentData.vehicle_number || 'MH15AB1234'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {shipmentData.vehicle_type || 'REEFER'} · {shipmentData.capacity_kg || 5000} KG
          </div>
        </div>

        {/* Temperature Bounds */}
        <div className="panel" style={{ padding: '12px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            <ThermometerSnowflake size={14} color="var(--accent-emerald)" />
            <span>Critical Target Bounds</span>
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: '#15803D', marginTop: '6px' }}>
            {shipmentData.target_temp_min}°C – {shipmentData.target_temp_max}°C
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Cold-Chain SLA Protection
          </div>
        </div>

        {/* Departure Time */}
        <div className="panel" style={{ padding: '12px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            <Clock size={14} color="var(--accent-blue)" />
            <span>Departure Time</span>
          </div>
          <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginTop: '6px' }}>
            {departure ? departure.toLocaleDateString() + ' ' + departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:12 IST'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Terminal Gate Out
          </div>
        </div>

        {/* Expected ETA */}
        <div className="panel" style={{ padding: '12px', background: 'var(--bg-panel)', borderColor: 'var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            <Calendar size={14} color="var(--accent-amber)" />
            <span>Estimated Delivery (ETA)</span>
          </div>
          <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: '#B45309', marginTop: '6px' }}>
            {delivery ? delivery.toLocaleDateString() + ' ' + delivery.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '20:12 IST'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            JNPT Freight Wharf
          </div>
        </div>

      </div>
    </div>
  );
}
