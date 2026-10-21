import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Building2, 
  ShieldCheck, 
  Lock, 
  Bell, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  RefreshCw, 
  Sprout, 
  Truck, 
  Warehouse, 
  ShoppingBag,
  BadgeCheck,
  FileText,
  MapPin,
  Phone,
  Mail,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileSettingsView({ role = 'FARMER' }) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form states based on role
  const [formData, setFormData] = useState({
    full_name: user?.full_name || 'Ramesh Patil',
    email: user?.email || 'farmer.ramesh@agritrust.io',
    phone: '+91 98220 54321',
    company_name: 'Sahyadri Agro Producers Cooperative',
    address: 'Gate #2, Dindori Road, Nashik, Maharashtra 422001',
    tax_id: '27AAECP1234F1Z8',
    bank_account: '91880022334455',
    bank_ifsc: 'HDFC0000123',
    bank_name: 'HDFC Bank, Nashik Main Branch',
    certifications: 'APEDA Certified, Devgad GI Registration, GlobalGAP #GG-99182',
    zone: 'Western Maharashtra Agro-Climatic Zone',
    badge_number: 'AGRI-INSP-0441',
    fleet_size: '12 Reefer Trucks (5T - 16T)',
    chamber_capacity: '500 MT Controlled Atmosphere',
    auto_accept_telemetry: true,
    email_alerts: true,
    sms_alerts: true,
    temp_excursion_alarm: true,
    two_factor_auth: true
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setTimeout(() => {
      setSaving(false);
      setFeedback({ type: 'success', message: 'Profile and security configuration updated successfully!' });
    }, 600);
  };

  const roleLabels = {
    FARMER: { title: 'Farmer & Exporter Profile', badge: 'PRODUCER GATEWAY', color: '#16A34A', bg: '#DCFCE7' },
    BUYER: { title: 'Buyer & Retail Procurement Profile', badge: 'COMMERCIAL BUYER', color: '#D946EF', bg: '#FAE8FF' },
    VERIFICATION_TEAM: { title: 'Certified Field Officer Credentials', badge: 'OFFICER ID: AGRI-0441', color: '#059669', bg: '#ECFDF5' },
    LOGISTICS: { title: 'Fleet Carrier Operator Profile', badge: 'VERIFIED CARRIER', color: '#0284C7', bg: '#E0F2FE' },
    COLD_STORAGE: { title: 'Cold Storage Infrastructure Profile', badge: 'CA CERTIFIED', color: '#018180', bg: '#E6F4F4' },
    ADMIN: { title: 'Platform Administrator Governance', badge: 'ENTERPRISE ROOT', color: '#005E5D', bg: '#E6F4F4' }
  };

  const currentMeta = roleLabels[role] || roleLabels.FARMER;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #FFFFFF 0%, #E6F4F4 100%)', border: '1px solid #CFE8E7' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#018180',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(1, 129, 128, 0.3)'
            }}>
              <Settings size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="font-display" style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
                  {currentMeta.title}
                </h1>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: currentMeta.bg,
                  color: currentMeta.color,
                  border: `1px solid ${currentMeta.color}40`
                }}>
                  {currentMeta.badge}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                Manage verified organizational credentials, settlement bank routing, automated notification thresholds & security keys.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>

        </div>

        {/* Sub Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
          {[
            { id: 'profile', label: 'Organization & Details', icon: Building2 },
            { id: 'banking', label: 'Escrow & Banking', icon: ShieldCheck },
            { id: 'notifications', label: 'Alert Preferences', icon: Bell },
            { id: 'security', label: 'Security & API Keys', icon: Key }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: isActive ? '1px solid #018180' : '1px solid #E2E8F0',
                  background: isActive ? '#E6F4F4' : '#FFFFFF',
                  color: isActive ? '#018180' : '#64748B',
                  cursor: 'pointer'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          color: feedback.type === 'success' ? '#166534' : '#991B1B',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SUB-VIEW 1: ORGANIZATION & PROFILE DETAILS */}
      {activeSubTab === 'profile' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '16px' }}>
            General Account & Identification
          </h3>

          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="form-input"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="form-input"
                style={{ height: '38px', background: '#F8FAFC', color: '#64748B' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-input"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Company / Entity Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="form-input"
                style={{ height: '38px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Operational Facility Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="form-input"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Tax / GST / FSSAI Registration</label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="form-input"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Certifications & Standards</label>
              <input
                type="text"
                value={formData.certifications}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                className="form-input"
                style={{ height: '38px' }}
              />
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 2: ESCROW & BANKING */}
      {activeSubTab === 'banking' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '16px' }}>
            Escrow Settlement & Direct Bank Account Routing
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Bank Account Number</label>
              <input
                type="password"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                className="form-input font-mono"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>IFSC Code</label>
              <input
                type="text"
                value={formData.bank_ifsc}
                onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value })}
                className="form-input font-mono"
                style={{ height: '38px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Bank & Branch Name</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="form-input"
                style={{ height: '38px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: NOTIFICATIONS & ALERTS */}
      {activeSubTab === 'notifications' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '16px' }}>
            Real-Time Telemetry & Dispatch Alerts
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'temp_excursion_alarm', label: 'Thermal Excursion Alarms', desc: 'Trigger instant alerts if cargo temperature breaches setpoint by > 1.5°C' },
              { key: 'email_alerts', label: 'Email Digest Notifications', desc: 'Receive VRF verification certificates and booking confirmations by email' },
              { key: 'sms_alerts', label: 'SMS & WhatsApp Gateway', desc: 'Send real-time driver dispatch updates and gate arrival alerts to mobile' },
              { key: 'auto_accept_telemetry', label: 'Automated 5s Sensor Ingestion', desc: 'Allow continuous live GPS and IoT temperature packet processing' }
            ].map(setting => (
              <div key={setting.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{setting.label}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{setting.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData[setting.key]}
                  onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#018180', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: SECURITY & API KEYS */}
      {activeSubTab === 'security' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '16px' }}>
            Enterprise Cryptography & Authentication
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#16A34A" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>Role-Based Access Control (RBAC) Active</span>
              </div>
              <p style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                Your session is authenticated via JWT with cryptographic signature enforcement. Direct unauthorized endpoint access is barred.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>API Telemetry Key</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value="agri_live_telemetry_key_998124a87c01b22e"
                  className="form-input font-mono"
                  style={{ height: '38px', background: '#F8FAFC', color: '#475569', flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => alert('API Key copied to clipboard!')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '12px' }}
                >
                  Copy Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
