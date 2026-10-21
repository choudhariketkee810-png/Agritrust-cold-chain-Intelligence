import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_NAVIGATION, ROLE_METADATA, ROLES } from '../config/roles';
import { 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  X, 
  ThermometerSnowflake,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  badgeCounts = {},
  currentRole = 'FARMER',
  isMobileOpen = false,
  setIsMobileOpen
}) {
  const { user, role, logout } = useAuth();
  const effectiveRole = currentRole || role || ROLES.FARMER;
  const roleMeta = ROLE_METADATA[effectiveRole] || ROLE_METADATA.FARMER;
  const navSections = ROLE_NAVIGATION[effectiveRole] || ROLE_NAVIGATION.FARMER;

  // Profile / Settings / Notification Modals
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'notifications' | 'settings' | null

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 900
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      {/* Main Sidebar */}
      <aside className={`agritrust-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        
        {/* 1. BRAND HEADER */}
        <div style={{
          padding: '16px 16px 14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="agritrust-logo-badge" style={{
              width: '62px',
              height: '62px',
              padding: '4px',
              flexShrink: 0
            }}>
              <img
                src="/agritrust_logo.png"
                alt="AGRITRUST Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="font-display" style={{ fontSize: '19px', fontWeight: '900', letterSpacing: '-0.3px', color: '#0F172A' }}>
                  AGRITRUST
                </span>
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#018180', 
                fontWeight: '800', 
                letterSpacing: '0.4px', 
                textTransform: 'uppercase',
                background: '#E6F4F4',
                padding: '3px 7px',
                borderRadius: '5px',
                marginTop: '3px',
                display: 'inline-block',
                border: '1px solid #CFE8E7'
              }}>
                GLOBAL LOGISTICS SOLUTIONS
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          {setIsMobileOpen && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="mobile-close-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'none',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* 2. ROLE WORKSPACE BADGE CHIP */}
        <div style={{
          padding: '8px 16px',
          background: roleMeta.bgLight,
          borderBottom: `1px solid ${roleMeta.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: roleMeta.primaryColor,
              display: 'inline-block'
            }} />
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              color: roleMeta.primaryColor,
              letterSpacing: '0.04em'
            }}>
              {roleMeta.workspaceName}
            </span>
          </div>
          <span style={{
            fontSize: '9px',
            fontWeight: '800',
            padding: '1px 5px',
            borderRadius: '4px',
            background: '#FFFFFF',
            color: roleMeta.primaryColor,
            border: `1px solid ${roleMeta.borderLight}`
          }}>
            {roleMeta.badgeText}
          </span>
        </div>

        {/* 3. DYNAMIC ROLE-SPECIFIC MENU */}
        <nav 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            scrollbarWidth: 'thin'
          }}
        >
          {navSections.map(section => (
            <div key={section.sectionId} className="sidebar-nav-section" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Section Header */}
              <div style={{
                fontSize: '10px',
                fontWeight: '800',
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 10px 5px 10px'
              }}>
                {section.sectionLabel}
              </div>

              {/* Section Navigation Items */}
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    title={item.description}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? '#E6F4F4' : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #018180' : '3px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      <Icon 
                        size={17} 
                        color={isActive ? '#018180' : '#4B5563'} 
                        style={{ flexShrink: 0, transition: 'color 0.15s ease' }}
                      />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: isActive ? '700' : '500',
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.label}
                      </span>
                    </div>

                    {/* Operational Badges (Alerts, Incidents) */}
                    {badgeCount > 0 && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: item.id === 'alerts' ? '#DC2626' : '#EA580C',
                        color: '#FFFFFF',
                        lineHeight: '1.4'
                      }}>
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 4. BOTTOM PROFILE, NOTIFICATIONS, SETTINGS & LOGOUT */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          background: '#F7FBFF'
        }}>
          {/* Active User Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: `1px solid ${roleMeta.borderLight}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: roleMeta.primaryColor,
                flexShrink: 0,
                fontWeight: '800',
                fontSize: '12px'
              }}>
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'AGRITRUST Operative'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {roleMeta.title}
                </div>
              </div>
            </div>

            <span style={{
              fontSize: '9px',
              fontWeight: '800',
              padding: '2px 5px',
              borderRadius: '4px',
              background: roleMeta.bgLight,
              color: roleMeta.primaryColor,
              border: `1px solid ${roleMeta.borderLight}`,
              flexShrink: 0
            }}>
              {effectiveRole}
            </span>
          </div>

          {/* Quick Profile Actions Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveModal('profile')}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 4px', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
              title="View Profile Details"
            >
              <User size={13} />
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('notifications')}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 4px', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
              title="System Notifications"
            >
              <Bell size={13} />
              <span>Alerts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('settings')}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 4px', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
              title="Security & System Settings"
            >
              <Settings size={13} />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '6px 4px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                color: 'var(--accent-rose)',
                borderColor: '#FECACA'
              }}
              title="Sign Out Session"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* PROFILE MODAL */}
      {activeModal === 'profile' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: roleMeta.bgLight, color: roleMeta.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                  <User size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>{user?.full_name || 'Authenticated User'}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{roleMeta.title}</div>
                </div>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary btn-sm"><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                <span style={{ fontWeight: '600' }}>{user?.email || `${effectiveRole.toLowerCase()}@agritrust.io`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Organization:</span>
                <span style={{ fontWeight: '600' }}>{user?.company_name || 'AGRITRUST Verified Node'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned RBAC Role:</span>
                <span style={{ fontWeight: '800', color: roleMeta.primaryColor }}>{effectiveRole}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Security Token:</span>
                <span style={{ fontWeight: '600', color: 'var(--accent-emerald)' }}>JWT Authenticated (Active)</span>
              </div>
            </div>

            <button type="button" onClick={() => setActiveModal(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {activeModal === 'notifications' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} color="#018180" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>System Notifications</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary btn-sm"><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', color: '#15803D', marginBottom: '2px' }}>✓ Telemetry Stream Connected</div>
                <div style={{ color: '#166534' }}>Real-time sensor simulator publishing 5s data packets to PostgreSQL.</div>
              </div>
              <div style={{ padding: '12px', background: '#E6F4F4', border: '1px solid #CFE8E7', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', color: '#005E5D', marginBottom: '2px' }}>✦ AI Spoilage Guard Active</div>
                <div style={{ color: '#018180' }}>Shelf-life decay algorithms evaluating active produce consignments.</div>
              </div>
              <div style={{ padding: '12px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', color: '#B45309', marginBottom: '2px' }}>⚠ Role Filter Applied</div>
                <div style={{ color: '#92400E' }}>You are viewing modules authorized for {roleMeta.title}.</div>
              </div>
            </div>

            <button type="button" onClick={() => setActiveModal(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {activeModal === 'settings' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="#018180" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>Platform & Security Settings</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary btn-sm"><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: '700', color: '#111827', marginBottom: '4px' }}>FastAPI Gateway</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Target: <code>http://127.0.0.1:8000</code></div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: '700', color: '#111827', marginBottom: '4px' }}>PostgreSQL Cold-Chain Database</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Instance: <code>ftl_cold_chain (Port 5432)</code> · SSL Active</div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Role-Based Access Enforcement</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Strict JWT Claims + Route-Level Authorization</div>
              </div>
            </div>

            <button type="button" onClick={() => setActiveModal(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
              Save & Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
