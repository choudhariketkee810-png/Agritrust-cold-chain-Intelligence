import React, { useState } from 'react';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Truck, 
  DollarSign, 
  Package, 
  Trash2, 
  Filter,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';

export default function NotificationsView({ role = 'FARMER', onNavigateTab }) {
  const [filterType, setFilterType] = useState('ALL');

  // Role-customized notifications mock/real seed data
  const roleNotifications = {
    FARMER: [
      {
        id: 'NOTIF-F01',
        type: 'VERIFICATION',
        title: 'Physical Consignment Inspection Approved',
        message: 'Consignment #REQ-2026-001 (Alphonso Mango, 2,500 KG) has been physically verified & stamped at Sahyadri Packhouse Dock #1. VRF #VRF-2026-8891 issued. Transport booking is now unlocked.',
        timestamp: '10 minutes ago',
        isRead: false,
        severity: 'SUCCESS',
        actionTab: 'shipments',
        actionLabel: 'View Verified Shipment'
      },
      {
        id: 'NOTIF-F02',
        type: 'BOOKING',
        title: 'Cold-Chain Reefer Booking Confirmed',
        message: 'Carrier FTL Express has accepted shipment #SHP-TOMATO-001 (Road Freight, 5,000 KG). Driver Ramesh Shinde (MH-15-XY-9988) assigned for pickup.',
        timestamp: '1 hour ago',
        isRead: false,
        severity: 'INFO',
        actionTab: 'tracking',
        actionLabel: 'Track Reefer Vehicle'
      },
      {
        id: 'NOTIF-F03',
        type: 'PAYMENT',
        title: 'Escrow Milestone Deposit Locked',
        message: 'FreshMart Central Hub has funded escrow for Purchase Order #ORD-2026-442. ₹1,80,000 held securely under AGRITrust Smart Escrow.',
        timestamp: '3 hours ago',
        isRead: true,
        severity: 'SUCCESS',
        actionTab: 'payments',
        actionLabel: 'View Transactions'
      },
      {
        id: 'NOTIF-F04',
        type: 'ALERT',
        title: 'AI Spoilage & Shelf-Life Warning',
        message: 'Pulp temperature on Consignment #SHP-TOMATO-001 approaching 13.8°C near Igatpuri Ghat. Recommended 300 KG redirection to nearby buyer in Vashi.',
        timestamp: '5 hours ago',
        isRead: true,
        severity: 'WARNING',
        actionTab: 'disputes',
        actionLabel: 'Inspect Spoilage Risk'
      }
    ],
    BUYER: [
      {
        id: 'NOTIF-B01',
        type: 'DISPATCH',
        title: 'Inbound Shipment Dispatched from Farm-Gate',
        message: 'Shipment #SHP-TOMATO-001 (Devgad Mangoes, 2,500 KG) departed Nashik Orchards. Security seal #SEAL-MH15-8831 locked. Target ETA: 16:45 Today.',
        timestamp: '25 minutes ago',
        isRead: false,
        severity: 'INFO',
        actionTab: 'tracking',
        actionLabel: 'Live GPS Telemetry'
      },
      {
        id: 'NOTIF-B02',
        type: 'QUALITY',
        title: 'Physical Verification Certificate Available',
        message: 'Senior Inspector Sunil Shinde uploaded certified 8-point physical check for Purchase Order #ORD-2026-442. Verified net weight: 2,492 KG, Brix: 16.5°.',
        timestamp: '2 hours ago',
        isRead: false,
        severity: 'SUCCESS',
        actionTab: 'quality-verification',
        actionLabel: 'Review Quality Report'
      },
      {
        id: 'NOTIF-B03',
        type: 'DISPUTE',
        title: 'Claim Resolution Notice',
        message: 'Dispute #DISP-2026-102 regarding 50 KG carton crushing has been adjudicated. ₹12,500 refunded from carrier reserve to buyer wallet.',
        timestamp: '1 day ago',
        isRead: true,
        severity: 'SUCCESS',
        actionTab: 'disputes',
        actionLabel: 'View Resolution'
      }
    ],
    VERIFICATION_TEAM: [
      {
        id: 'NOTIF-V01',
        type: 'ASSIGNMENT',
        title: 'New Physical Inspection Request Assigned',
        message: 'Consignment #REQ-2026-004 (Pomegranates, 4,000 KG) at Patil Orchards Gate #2 requires mandatory farm-gate physical weight calibration and temp verification.',
        timestamp: '5 minutes ago',
        isRead: false,
        severity: 'WARNING',
        actionTab: 'pending-queue',
        actionLabel: 'Open Inspection Queue'
      },
      {
        id: 'NOTIF-V02',
        type: 'REINSPECTION',
        title: 'Corrective Action Photos Submitted',
        message: 'Farmer Ramesh submitted tamper-evident holographic seal photos and re-conditioned pulp temperature for Consignment #REQ-2026-002. Ready for reinspection.',
        timestamp: '45 minutes ago',
        isRead: false,
        severity: 'INFO',
        actionTab: 'pending-queue',
        actionLabel: 'Review Rectifications'
      }
    ],
    LOGISTICS: [
      {
        id: 'NOTIF-L01',
        type: 'TELEMETRY',
        title: 'Temperature Excursion Alarm — Vehicle FTL-V001',
        message: 'Reefer container MH-15-XY-9988 reported 14.8°C (threshold max: 13.0°C) on NH-3 Igatpuri bypass. Compressor auto-cycle initiated.',
        timestamp: '8 minutes ago',
        isRead: false,
        severity: 'WARNING',
        actionTab: 'live-tracking',
        actionLabel: 'Inspect Sensor Telemetry'
      },
      {
        id: 'NOTIF-L02',
        type: 'BOOKING',
        title: 'New Verified Shipment Available for Carrier Acceptance',
        message: 'VRF #VRF-2026-8891 issued for 2,500 KG Alphonso Mangoes. Road Freight requested. Staging available at Nashik Packhouse.',
        timestamp: '35 minutes ago',
        isRead: false,
        severity: 'SUCCESS',
        actionTab: 'booking-requests',
        actionLabel: 'Accept Consignment'
      },
      {
        id: 'NOTIF-L03',
        type: 'DISPATCH',
        title: '5-Point Dispatch Readiness Sign-Off Required',
        message: 'Vehicle FTL-V003 scheduled for 14:00 dispatch. Pre-cooling temperature log and calibrated scale weights pending driver verification.',
        timestamp: '1 hour ago',
        isRead: true,
        severity: 'INFO',
        actionTab: 'shipment-assignment',
        actionLabel: 'Conduct Readiness Check'
      }
    ],
    COLD_STORAGE: [
      {
        id: 'NOTIF-C01',
        type: 'BOOKING',
        title: 'New Farmer Chamber Storage Booking Request',
        message: 'Sahyadri Orchards requested 5.0 MT Controlled Atmosphere storage for Alphonso Mangoes in Chamber #3 for 14 days starting tomorrow.',
        timestamp: '12 minutes ago',
        isRead: false,
        severity: 'INFO',
        actionTab: 'booking-requests',
        actionLabel: 'Review Request'
      },
      {
        id: 'NOTIF-C02',
        type: 'TELEMETRY',
        title: 'Chamber #2 Humidity Optimal',
        message: 'Controlled atmosphere chamber #2 stabilized at 85% RH and 11.2°C. Ethylene scrubbers functioning in standard cycle.',
        timestamp: '2 hours ago',
        isRead: true,
        severity: 'SUCCESS',
        actionTab: 'temperature-monitoring',
        actionLabel: 'View Chamber Status'
      }
    ],
    ADMIN: [
      {
        id: 'NOTIF-A01',
        type: 'SECURITY',
        title: 'Immutable Audit Trail Alert',
        message: 'Documented Policy Exception Override logged by Admin for Consignment #REQ-2026-003. Cryptographic hash recorded in ledger.',
        timestamp: '15 minutes ago',
        isRead: false,
        severity: 'INFO',
        actionTab: 'audit-logs',
        actionLabel: 'View Audit Logs'
      },
      {
        id: 'NOTIF-A02',
        type: 'DISPUTE',
        title: 'High-Value Quality Claim Filed',
        message: 'Buyer FreshMart lodged ₹18,500 loss claim against Carrier FTL Express on Shipment #SHP-TOMATO-001. AI Discrepancy report compiled.',
        timestamp: '40 minutes ago',
        isRead: false,
        severity: 'WARNING',
        actionTab: 'disputes',
        actionLabel: 'Adjudicate Claim'
      }
    ]
  };

  const [notifications, setNotifications] = useState(roleNotifications[role] || roleNotifications.FARMER);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleToggleRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: !n.isRead }) : n));
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filtered = notifications.filter(n => {
    if (filterType === 'UNREAD') return !n.isRead;
    if (filterType === 'WARNING') return n.severity === 'WARNING';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #FFFFFF 0%, #E6F4F4 100%)', border: '1px solid #CFE8E7' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#018180',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(1, 129, 128, 0.3)'
            }}>
              <BellRing size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="font-display" style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
                  System Notifications & Operational Alerts
                </h1>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: '#FEE2E2',
                    color: '#B91C1C',
                    border: '1px solid #FECACA'
                  }}>
                    {unreadCount} UNREAD
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                Real-time operational updates, verification stamps, telemetry alarms & escrow settlement events tailored to your role.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', color: '#018180', borderColor: '#018180' }}
              >
                <Check size={14} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {[
            { id: 'ALL', label: `All (${notifications.length})` },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'WARNING', label: `Warnings & Alerts (${notifications.filter(n => n.severity === 'WARNING').length})` }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: filterType === f.id ? '1px solid #018180' : '1px solid #E2E8F0',
                background: filterType === f.id ? '#E6F4F4' : '#FFFFFF',
                color: filterType === f.id ? '#018180' : '#64748B',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(item => {
          const isWarning = item.severity === 'WARNING';
          const isSuccess = item.severity === 'SUCCESS';
          return (
            <div
              key={item.id}
              className="card"
              style={{
                padding: '16px 20px',
                borderLeft: `4px solid ${isWarning ? '#F59E0B' : isSuccess ? '#10B981' : '#018180'}`,
                background: item.isRead ? '#FFFFFF' : '#FAFEFE',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isWarning ? '#FEF3C7' : isSuccess ? '#DCFCE7' : '#E6F4F4',
                  color: isWarning ? '#D97706' : isSuccess ? '#16A34A' : '#018180',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {isWarning ? <AlertTriangle size={18} /> : isSuccess ? <CheckCircle2 size={18} /> : <Info size={18} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                      {item.title}
                    </h4>
                    {!item.isRead && (
                      <span style={{ fontSize: '10px', fontWeight: '800', background: '#018180', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px' }}>
                        NEW
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                      {item.timestamp}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: '1.5' }}>
                    {item.message}
                  </p>

                  {item.actionLabel && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab(item.actionTab)}
                      style={{
                        marginTop: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#018180',
                        background: '#E6F4F4',
                        border: '1px solid #CFE8E7',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleRead(item.id)}
                  title={item.isRead ? 'Mark unread' : 'Mark read'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '4px'
                  }}
                >
                  <Check size={16} color={item.isRead ? '#CBD5E1' : '#018180'} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  title="Dismiss notification"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '4px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
            <Bell size={28} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>No Notifications</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>You are fully caught up with your operational queue.</div>
          </div>
        )}
      </div>

    </div>
  );
}
