import React, { useState } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { ROLE_METADATA, ROLE_NAVIGATION, ROLES } from '../config/roles';
import { 
  Sprout, 
  Truck, 
  Warehouse, 
  ShoppingBag, 
  ShieldCheck, 
  LogOut, 
  RefreshCw, 
  Bell, 
  ChevronDown, 
  ThermometerSnowflake,
  Radio,
  Menu,
  ChevronRight,
  User
} from 'lucide-react';

const ROLE_ICONS = {
  FARMER: Sprout,
  LOGISTICS: Truck,
  COLD_STORAGE: Warehouse,
  BUYER: ShoppingBag,
  ADMIN: ShieldCheck
};

export default function TopBar({
  lastUpdated,
  isRefreshing,
  onRefresh,
  autoRefresh,
  setAutoRefresh,
  activeAlertCount = 0,
  apiConnected = true,
  activeTab = 'dashboard',
  onToggleMobileSidebar
}) {
  const { user, role, logout, quickLogin } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const effectiveRole = role || ROLES.FARMER;
  const roleMeta = ROLE_METADATA[effectiveRole] || ROLE_METADATA.FARMER;
  const RoleIcon = ROLE_ICONS[effectiveRole] || Sprout;

  const handleRoleSwitch = async (roleKey) => {
    setShowRoleMenu(false);
    await quickLogin(roleKey);
  };

  // Find active label for breadcrumb
  let activeItemLabel = 'Dashboard';
  const roleNav = ROLE_NAVIGATION[effectiveRole] || [];
  for (const section of roleNav) {
    const item = section.items.find(i => i.id === activeTab);
    if (item) {
      activeItemLabel = item.label;
      break;
    }
  }

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-xl)',
      padding: '10px 18px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      zIndex: 50
    }}>
      {/* 1. MOBILE TOGGLE & BREADCRUMB */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {/* Mobile Hamburger */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)'
            }}
            title="Toggle Sidebar Navigation"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Workflow Breadcrumb with Highlighted Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#FFFFFF',
            border: '2px solid #018180',
            padding: '2px',
            boxShadow: '0 4px 12px rgba(1, 129, 128, 0.25), 0 0 0 2px rgba(1, 129, 128, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            color: roleMeta.primaryColor,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap'
          }}>
            {roleMeta.workspaceName}
          </span>
          <ChevronRight size={13} color="var(--text-dim)" />
          <span style={{
            fontSize: '14px',
            fontWeight: '800',
            color: '#111827',
            letterSpacing: '-0.2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {activeItemLabel}
          </span>
        </div>

        {/* Live Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px', paddingLeft: '12px', borderLeft: '1px solid var(--border-subtle)' }} className="desktop-status-pills">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', background: apiConnected ? '#DCFCE7' : '#FEE2E2', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: `1px solid ${apiConnected ? '#86EFAC' : '#FCA5A5'}` }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: apiConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'inline-block' }} />
            <span style={{ color: apiConnected ? '#15803D' : 'var(--accent-rose)', fontWeight: '700' }}>
              {apiConnected ? 'API Live' : 'API Offline'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', background: 'var(--bg-panel-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-card)' }}>
            <Radio size={11} color="var(--accent-blue)" />
            <span style={{ color: 'var(--text-secondary)' }}>Sensor: <b style={{ color: 'var(--accent-blue-dark)' }}>Active (5s)</b></span>
          </div>
        </div>
      </div>

      {/* 2. RIGHT SECTION: ROLE SWITCHER, SYNC & USER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
        
        {/* FAST ROLE SWITCHER DROPDOWN */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="btn btn-secondary btn-sm"
            style={{
              background: roleMeta.bgLight,
              border: `1px solid ${roleMeta.borderLight}`,
              color: roleMeta.primaryColor,
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Switch RBAC Persona for Evaluation"
          >
            <RoleIcon size={14} />
            <span>Role: {roleMeta.shortLabel}</span>
            <ChevronDown size={12} />
          </button>

          {showRoleMenu && (
            <div style={{
              position: 'absolute',
              top: '115%',
              right: 0,
              width: '280px',
              background: '#FFFFFF',
              border: '1px solid var(--border-card-hover)',
              borderRadius: 'var(--radius-lg)',
              padding: '8px',
              boxShadow: 'var(--shadow-modal)',
              zIndex: 200
            }}>
              <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                Select Role Persona
              </div>
              {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => {
                const meta = ROLE_METADATA[cred.role] || ROLE_METADATA.FARMER;
                const Icon = ROLE_ICONS[cred.role] || Sprout;
                const isActive = cred.role === effectiveRole;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleRoleSwitch(key)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? meta.bgLight : 'transparent',
                      border: `1px solid ${isActive ? meta.borderLight : 'transparent'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--bg-panel-light)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icon size={16} color={meta.primaryColor} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: isActive ? meta.primaryColor : '#111827' }}>
                        {meta.title}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cred.name} ({cred.email})
                      </div>
                    </div>
                    {isActive && (
                      <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', background: meta.primaryColor, color: '#FFFFFF' }}>
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* REFRESH / SYNC BUTTON */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary btn-sm"
          style={{ padding: '5px 10px' }}
          title="Refresh real-time telemetry"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span style={{ fontSize: '12px' }}>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* ALERTS BADGE */}
        {activeAlertCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'var(--accent-rose-bg)',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-full)',
            padding: '4px 9px',
            fontSize: '11px',
            fontWeight: '700',
            color: 'var(--accent-rose)'
          }}>
            <Bell size={11} />
            <span>{activeAlertCount} Alerts</span>
          </div>
        )}

        {/* USER PROFILE INFO PILL */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '3px 10px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-full)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: roleMeta.bgLight,
            border: `1px solid ${roleMeta.borderLight}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '700',
            color: roleMeta.primaryColor
          }}>
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#111827', lineHeight: 1.1 }}>
              {user?.full_name || 'Operative'}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
