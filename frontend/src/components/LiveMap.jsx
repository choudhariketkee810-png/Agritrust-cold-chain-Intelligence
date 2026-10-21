import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Gauge, ShieldCheck, Truck, Layers } from 'lucide-react';

// Highway route coordinates from Nashik to Mumbai (NH160 / Mumbai-Agra Highway)
const NASHIK_MUMBAI_CORRIDOR = [
  [19.9975, 73.7898], // Nashik Hub
  [19.9542, 73.7431], // Vilholi
  [19.8821, 73.6654], // Ghoti
  [19.7042, 73.5621], // Igatpuri
  [19.6389, 73.4912], // Kasara
  [19.4678, 73.3421], // Asangaon
  [19.3512, 73.2045], // Kalyan Phata
  [19.2183, 72.9781], // Thane
  [19.0760, 72.8777], // Mumbai Port Terminal
];

// Helper component to auto-pan map when vehicle coordinates change
function MapAutoPan({ position, autoCenter }) {
  const map = useMap();
  useEffect(() => {
    if (autoCenter && position && position[0] && position[1]) {
      map.panTo(position, { animate: true, duration: 1.2 });
    }
  }, [position, autoCenter, map]);
  return null;
}

export default function LiveMap({ telemetryList, latestTelemetry, shipmentData }) {
  const [autoCenter, setAutoCenter] = React.useState(true);

  // Determine current position
  const currentPos = useMemo(() => {
    if (latestTelemetry && latestTelemetry.latitude && latestTelemetry.longitude) {
      return [latestTelemetry.latitude, latestTelemetry.longitude];
    }
    return [20.0059, 73.8244]; // Default Nashik region
  }, [latestTelemetry]);

  // Extract breadcrumbs from telemetry history
  const breadcrumbs = useMemo(() => {
    if (!telemetryList || telemetryList.length === 0) return [];
    return telemetryList
      .filter(t => t.latitude && t.longitude)
      .map(t => [t.latitude, t.longitude]);
  }, [telemetryList]);

  // Custom pulsed Truck icon
  const customTruckIcon = useMemo(() => {
    const isNormal = latestTelemetry ? (latestTelemetry.temperature >= (shipmentData?.target_temp_min ?? 10) && latestTelemetry.temperature <= (shipmentData?.target_temp_max ?? 13)) : true;
    const markerColor = isNormal ? '#018180' : '#DC2626';
    
    return L.divIcon({
      className: 'custom-radar-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div class="radar-ping" style="background: ${markerColor}33;"></div>
          <div class="radar-center" style="background: linear-gradient(135deg, #018180, #005E5D); border-color: #FFFFFF; box-shadow: 0 4px 14px rgba(1, 129, 128, 0.4);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -24]
    });
  }, [latestTelemetry, shipmentData]);

  // Waypoint icons
  const createWaypointIcon = (label, color) => {
    return L.divIcon({
      className: 'waypoint-icon',
      html: `
        <div style="
          background: #FFFFFF; 
          border: 2px solid ${color}; 
          color: #111827; 
          padding: 3px 8px; 
          border-radius: 12px; 
          font-size: 10px; 
          font-weight: 800; 
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(47, 128, 237, 0.15);
          display: flex;
          align-items: center;
          gap: 5px;
        ">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
          ${label}
        </div>
      `,
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    });
  };

  return (
    <div className="card" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      
      {/* Map Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="var(--color-primary-blue)" />
            <h2 className="font-display" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
              Live Telematics & GPS Transit Corridor
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Nashik Agro Hub → Mumbai Port Terminal (NH160 Freight Route)
          </p>
        </div>

        {/* Map Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setAutoCenter(!autoCenter)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '700',
              color: autoCenter ? 'var(--color-primary-blue)' : 'var(--text-muted)',
              border: autoCenter ? '1px solid var(--color-primary-blue)' : '1px solid var(--border-card)',
              background: autoCenter ? 'var(--bg-panel-light)' : '#FFFFFF'
            }}
          >
            <MapPin size={12} />
            <span>{autoCenter ? 'Auto-Tracking Active' : 'Free Pan Mode'}</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, minHeight: '380px', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-card)' }}>
        <MapContainer
          center={currentPos}
          zoom={10}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapAutoPan position={currentPos} autoCenter={autoCenter} />

          {/* Planned Corridor Route */}
          <Polyline
            positions={NASHIK_MUMBAI_CORRIDOR}
            pathOptions={{
              color: '#56B4F8',
              weight: 4,
              opacity: 0.6,
              dashArray: '8, 8'
            }}
          />

          {/* Breadcrumbs Trail (Live Trajectory) */}
          {breadcrumbs.length > 1 && (
            <Polyline
              positions={breadcrumbs}
              pathOptions={{
                color: '#018180',
                weight: 5,
                opacity: 0.9,
                lineCap: 'round'
              }}
            />
          )}

          {/* Origin Marker: Nashik */}
          <Marker position={[19.9975, 73.7898]} icon={createWaypointIcon('ORIGIN: NASHIK', '#16A34A')}>
            <Popup>
              <div style={{ padding: '6px', fontSize: '12px' }}>
                <b style={{ color: '#15803D' }}>Origin Cold Hub</b><br />
                Nashik APMC Logistics Terminal<br />
                Departed: {shipmentData?.departure_time ? new Date(shipmentData.departure_time).toLocaleTimeString() : '12:12 IST'}
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker: Mumbai */}
          <Marker position={[19.0760, 72.8777]} icon={createWaypointIcon('DEST: MUMBAI', '#F59E0B')}>
            <Popup>
              <div style={{ padding: '6px', fontSize: '12px' }}>
                <b style={{ color: '#B45309' }}>Destination Port</b><br />
                Mumbai JNPT Export Terminal<br />
                ETA: {shipmentData?.expected_delivery_time ? new Date(shipmentData.expected_delivery_time).toLocaleTimeString() : '20:12 IST'}
              </div>
            </Popup>
          </Marker>

          {/* Current Live Vehicle Marker */}
          <Marker position={currentPos} icon={customTruckIcon}>
            <Popup>
              <div style={{ minWidth: '190px', padding: '4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Truck size={16} color="var(--color-primary-blue)" />
                  <b style={{ color: '#111827', fontSize: '13px' }}>{shipmentData?.vehicle_number || 'MH15AB1234'}</b>
                </div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Cargo: <b style={{ color: '#111827' }}>{shipmentData?.product_name || 'Mango'} (SHP-0001)</b><br />
                  Temp: <b style={{ color: '#018180' }}>{latestTelemetry?.temperature?.toFixed(2)} °C</b><br />
                  Humidity: <b style={{ color: '#111827' }}>{latestTelemetry?.humidity?.toFixed(1)} %</b><br />
                  Reefer: <b style={{ color: '#16A34A' }}>{latestTelemetry?.refrigeration_status}</b><br />
                  GPS: <span className="font-mono">{currentPos[0]?.toFixed(5)}, {currentPos[1]?.toFixed(5)}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Telematics Overlay Badge */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          display: 'flex',
          gap: '16px',
          fontSize: '12px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>Current GPS</div>
            <div className="font-mono" style={{ color: '#111827', fontWeight: '800', marginTop: '2px' }}>
              {currentPos[0]?.toFixed(4)}°N, {currentPos[1]?.toFixed(4)}°E
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '12px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>Sim Speed</div>
            <div className="font-mono" style={{ color: 'var(--color-primary-blue)', fontWeight: '800', marginTop: '2px' }}>
              58.4 km/h
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-card)', paddingLeft: '12px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>Trail History</div>
            <div className="font-mono" style={{ color: '#16A34A', fontWeight: '800', marginTop: '2px' }}>
              {breadcrumbs.length} Pings
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
