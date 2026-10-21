import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  FileCheck2,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  UserCheck,
  Lock,
  Layers,
  Filter,
  Eye,
  Search,
  ExternalLink,
  Download,
  AlertCircle
} from 'lucide-react';
import SmartImage from './SmartImage';
import { ASSETS } from '../assets/images';
import { fetchShipments, fetchConsignments } from '../api';

export default function DigitalChainOfCustody({ shipments = [], selectedShipmentId, onSelectShipment }) {
  const [activeShipmentId, setActiveShipmentId] = useState(selectedShipmentId || 'SHP-TOMATO-001');
  const [galleryFilter, setGalleryFilter] = useState('ALL'); // 'ALL', 'INSPECTION', 'SEALS', 'HANDOVERS', 'DELIVERY'

  useEffect(() => {
    if (selectedShipmentId) {
      setActiveShipmentId(selectedShipmentId);
    } else if (shipments.length > 0 && !activeShipmentId) {
      setActiveShipmentId(shipments[0].shipment_id);
    }
  }, [selectedShipmentId, shipments]);

  const timelineSteps = [
    {
      step: 1,
      title: 'Consignment Registration & Harvest Baseline',
      timestamp: '2026-10-09 07:15 IST',
      location: 'Patil Orchards Gate #2, Dindori Road, Nashik',
      actor: 'Farmer Ramesh Patil (Farmer ID: FRM-NSK-01)',
      status: 'VERIFIED',
      details: 'Declared 2,500 kg Alphonso Mangoes (250 Cartons). Harvest maturity index 82%.',
      image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
      hash: 'SHA256: 7f8a9...b12c'
    },
    {
      step: 2,
      title: 'Mandatory Physical Inspection & Calibrated Tare',
      timestamp: '2026-10-09 09:30 IST',
      location: 'Sahyadri Packhouse Dock #1, Nashik',
      actor: 'Officer Suresh Shinde (APEDA Cert #V04)',
      status: 'VERIFIED_OFFICIAL',
      details: 'Physically weighed 2,485 kg. Core pulp temp 11.2°C. Refractometer 16.8° Brix. VRF #VRF-2026-0089 issued.',
      image: ASSETS.INSPECTION.OFFICER_ASSESSMENT,
      hash: 'SHA256: c3e4f...99aa'
    },
    {
      step: 3,
      title: 'Reefer Loading & Tamper-Evident Bolt Seal Affixed',
      timestamp: '2026-10-09 11:00 IST',
      location: 'Sahyadri Reefer Bay #4, Nashik',
      actor: 'Logistics Supervisor (Carrier Transicold)',
      status: 'VERIFIED',
      details: 'Container pre-cooled to 11.5°C. Tamper-evident holographic bolt seal #SEAL-AGRI-8834 locked.',
      image: ASSETS.SIDE_BY_SIDE_EVIDENCE,
      hash: 'SHA256: 41b2c...55dd'
    },
    {
      step: 4,
      title: 'Farm-Gate to Hub Handover & GPS Dispatch',
      timestamp: '2026-10-09 11:30 IST',
      location: 'NH-160 Expressway Gateway, Nashik',
      actor: 'Driver Santosh Mane (Truck: MH-15-EG-4402)',
      status: 'VERIFIED',
      details: 'Live IoT telemetry active. Continuous thermal sampling at 5-second intervals.',
      image: ASSETS.TRANSPORT.ROAD.image,
      hash: 'SHA256: 99a1b...22ee'
    },
    {
      step: 5,
      title: 'Waypoint Cross-Dock & Mid-Transit Telemetry Sync',
      timestamp: '2026-10-09 15:45 IST',
      location: 'Igatpuri Cold Corridor Checkpoint',
      actor: 'Automated Telemetry Relay Gateway',
      status: 'VERIFIED',
      details: 'Zero thermal excursions logged. Mean compartment temperature: 11.4°C, RH: 87.2%.',
      image: ASSETS.FACILITIES.CA_CHAMBER,
      hash: 'SHA256: 33d4e...66ff'
    },
    {
      step: 6,
      title: 'Receiving Dock Gate-In & Seal Integrity Check',
      timestamp: '2026-10-09 17:30 IST',
      location: 'FreshMart Distribution Hub, Vashi, Navi Mumbai',
      actor: 'Dock Receiving Inspector (Buyer Facility)',
      status: 'VERIFIED',
      details: 'Bolt seal #SEAL-AGRI-8834 inspected intact with zero tampering. Gate-in recorded.',
      image: ASSETS.INSPECTION.TAMPER_SEAL,
      hash: 'SHA256: 11f2a...88cc'
    },
    {
      step: 7,
      title: 'Buyer Physical Acceptance & Cryptographic Sign-Off',
      timestamp: '2026-10-09 18:15 IST',
      location: 'FreshMart Inbound Quality Bay #2',
      actor: 'Buyer Quality Inspector (FreshMart Retail)',
      status: 'COMPLETED',
      details: 'Received 2,485 kg (250 cartons). Grade A Export standard confirmed. Escrow settlement unlocked.',
      image: ASSETS.HERO_BANNER,
      hash: 'SHA256: ee99a...77bb'
    }
  ];

  // Evidence Gallery Items
  const evidenceGallery = [
    {
      id: 'EV-01',
      category: 'INSPECTION',
      title: 'Farm Gate Pulp Temperature & Refractometer Brix Test',
      timestamp: '2026-10-09 09:30 IST',
      uploader: 'Officer Suresh Shinde (APEDA-V04)',
      verifiedLocation: 'Sahyadri CC-01, Nashik (GPS Verified: 19.9975° N, 73.7898° E)',
      image: ASSETS.INSPECTION.OFFICER_ASSESSMENT,
      hash: 'SHA256: c3e4f...99aa'
    },
    {
      id: 'EV-02',
      category: 'INSPECTION',
      title: 'Side-by-Side Customer Crates vs Officer Verification',
      timestamp: '2026-10-09 09:45 IST',
      uploader: 'APEDA Quality Verification Team',
      verifiedLocation: 'Packhouse Dock #1, Nashik',
      image: ASSETS.SIDE_BY_SIDE_EVIDENCE,
      hash: 'SHA256: 41b2c...55dd'
    },
    {
      id: 'EV-03',
      category: 'SEALS',
      title: 'Tamper-Evident Holographic Reefer Bolt Seal #SEAL-AGRI-8834',
      timestamp: '2026-10-09 11:05 IST',
      uploader: 'Carrier Transicold Supervisor',
      verifiedLocation: 'Loading Bay #4, Nashik',
      image: ASSETS.LOSS_PREVENTION.FORENSIC_LAB,
      hash: 'SHA256: 11f2a...88cc'
    },
    {
      id: 'EV-04',
      category: 'HANDOVERS',
      title: 'Reefer Truck Dispatch Handover & Sensor Pairing',
      timestamp: '2026-10-09 11:30 IST',
      uploader: 'Driver Santosh Mane (MH-15-EG-4402)',
      verifiedLocation: 'Nashik Gateway Interchange',
      image: ASSETS.TRANSPORT.ROAD.image,
      hash: 'SHA256: 99a1b...22ee'
    },
    {
      id: 'EV-05',
      category: 'HANDOVERS',
      title: 'Controlled Atmosphere Pre-Cooling Chamber Verification',
      timestamp: '2026-10-09 08:30 IST',
      uploader: 'Cold Storage Operations Lead',
      verifiedLocation: 'Sahyadri Blast Pre-Cooling Tunnel',
      image: ASSETS.FACILITIES.CA_CHAMBER,
      hash: 'SHA256: 33d4e...66ff'
    },
    {
      id: 'EV-06',
      category: 'DELIVERY',
      title: 'Destination Receiving Dock Arrival & Offloading',
      timestamp: '2026-10-09 17:35 IST',
      uploader: 'FreshMart Receiving Supervisor',
      verifiedLocation: 'FreshMart Vashi Hub, Navi Mumbai',
      image: ASSETS.HERO_BANNER,
      hash: 'SHA256: ee99a...77bb'
    }
  ];

  const filteredGallery = evidenceGallery.filter(item => {
    if (galleryFilter === 'ALL') return true;
    return item.category === galleryFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. HEADER BANNER */}
      <div className="card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: '800', fontSize: '11px' }}>
                <ShieldCheck size={12} />
                <span>IMMUTABLE CRYPTOGRAPHIC LEDGER</span>
              </span>
              <span className="badge" style={{ background: '#E0F2FE', color: '#0284C7', border: '1px solid #7DD3FC', fontWeight: '700', fontSize: '11px' }}>
                <CheckCircle2 size={12} />
                <span>SHA-256 PROOF-OF-INTEGRITY</span>
              </span>
            </div>
            <h2 className="font-display" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Digital Chain of Custody & Evidence Gallery
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '850px' }}>
              Cryptographically verified timeline of all physical handovers, calibrated measurements, seal inspections, and high-resolution photographic evidence from farm-gate to buyer receiving bay.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Active Shipment:</span>
            <select
              value={activeShipmentId}
              onChange={(e) => {
                setActiveShipmentId(e.target.value);
                if (onSelectShipment) onSelectShipment(e.target.value);
              }}
              className="input-field"
              style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '700', color: 'var(--color-primary-blue)' }}
            >
              {shipments.map(s => (
                <option key={s.shipment_id} value={s.shipment_id}>
                  {s.shipment_id} — {s.product_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. SHIPMENT EVIDENCE TIMELINE */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Shipment Verification & Custody Transfer Timeline
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Consignment #{activeShipmentId} • 7 Authenticated Custody Checkpoints
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          
          {/* Vertical connecting line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            bottom: '20px',
            left: '20px',
            width: '2px',
            background: 'var(--border-card)',
            zIndex: 1
          }} />

          {timelineSteps.map((step) => (
            <div key={step.step} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}>
              
              {/* Step indicator bubble */}
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#0284C7',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                flexShrink: 0
              }}>
                {step.step}
              </div>

              {/* Step Content Card */}
              <div style={{
                flex: 1,
                background: '#FFFFFF',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                boxShadow: 'var(--shadow-xs)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                      {step.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>🕒 {step.timestamp}</span>
                      <span>📍 {step.location}</span>
                    </div>
                  </div>

                  <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', fontWeight: '700', fontSize: '11px' }}>
                    <BadgeCheck size={12} />
                    <span>{step.status}</span>
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0' }}>
                  {step.details}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '8px' }}>
                  <span><b>Responsible Actor:</b> {step.actor}</span>
                  <span><code>{step.hash}</code></span>
                </div>
              </div>

            </div>
          ))}

        </div>
      </div>

      {/* 3. HIGH-RESOLUTION EVIDENCE GALLERY */}
      <div className="card" style={{ padding: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Physical Evidence & Audit Photo Gallery
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Timestamped, GPS-authenticated photographic records preserved with immutable SHA-256 hashes
            </div>
          </div>

          {/* Gallery Filters */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {[
              { key: 'ALL', label: 'All Evidence' },
              { key: 'INSPECTION', label: 'Quality & Brix' },
              { key: 'SEALS', label: 'Bolt Seals' },
              { key: 'HANDOVERS', label: 'Handovers' },
              { key: 'DELIVERY', label: 'Delivery' }
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setGalleryFilter(f.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: galleryFilter === f.key ? '1px solid var(--color-primary-blue)' : '1px solid var(--border-card)',
                  background: galleryFilter === f.key ? '#E6F4F4' : '#FFFFFF',
                  color: galleryFilter === f.key ? 'var(--color-primary-blue)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: galleryFilter === f.key ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredGallery.map(ev => (
            <div key={ev.id} className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <SmartImage
                src={ev.image}
                alt={ev.title}
                aspectRatio="16/10"
                allowZoom={true}
                badge={
                  <span className="badge" style={{ background: '#FFFFFF', color: '#111827', fontWeight: '700', fontSize: '10px' }}>
                    {ev.category}
                  </span>
                }
                caption={ev.title}
              />

              <div>
                <h5 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {ev.title}
                </h5>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  🕒 {ev.timestamp}
                </div>
                <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '2px' }}>
                  📍 {ev.verifiedLocation}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Uploader: <b>{ev.uploader}</b></span>
                <code>{ev.hash}</code>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
