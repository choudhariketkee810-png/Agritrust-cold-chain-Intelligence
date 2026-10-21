import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { ROLE_METADATA } from '../config/roles';

export default function AccessRestricted({
  currentRole = 'FARMER',
  attemptedTab = 'admin',
  onReturnToDashboard
}) {
  const roleMeta = ROLE_METADATA[currentRole] || ROLE_METADATA.FARMER;

  return (
    <div style={{
      minHeight: '65vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px 36px',
        boxShadow: 'var(--shadow-card)',
        textAlign: 'center'
      }}>
        {/* Shield Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--accent-rose-bg)',
          border: '1px solid #FECACA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          color: 'var(--accent-rose)',
          boxShadow: '0 8px 24px rgba(220, 38, 38, 0.12)'
        }}>
          <ShieldAlert size={32} />
        </div>

        {/* Header */}
        <div style={{
          fontSize: '11px',
          fontWeight: '800',
          color: 'var(--accent-rose)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '8px'
        }}>
          RBAC Security Guard · Unauthorized Route
        </div>

        <h2 style={{
          fontSize: '24px',
          fontWeight: '900',
          color: '#111827',
          letterSpacing: '-0.5px',
          marginBottom: '12px'
        }}>
          ACCESS RESTRICTED
        </h2>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          You don't have permission to access this workspace. This module is restricted by AGRITRUST Role-Based Access Control policies.
        </p>

        {/* Current Active Role Card */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: roleMeta.bgLight,
              border: `1px solid ${roleMeta.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: roleMeta.primaryColor
            }}>
              <Lock size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                Active Session: {roleMeta.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Target View: <code style={{ background: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #E5E7EB', color: 'var(--accent-rose)' }}>{attemptedTab}</code>
              </div>
            </div>
          </div>

          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            padding: '3px 9px',
            borderRadius: 'var(--radius-full)',
            background: roleMeta.bgLight,
            color: roleMeta.primaryColor,
            border: `1px solid ${roleMeta.borderLight}`
          }}>
            {roleMeta.badgeText}
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onReturnToDashboard}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-glow-blue)'
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to {roleMeta.title} Dashboard</span>
        </button>
      </div>
    </div>
  );
}
