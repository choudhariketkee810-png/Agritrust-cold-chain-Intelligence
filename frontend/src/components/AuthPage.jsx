import React, { useState, useEffect } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { checkBackendHealth } from '../api';
import { 
  Sprout, 
  Truck, 
  Warehouse, 
  ShoppingBag, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Building2, 
  MapPin, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  ThermometerSnowflake,
  RefreshCw,
  ServerCrash,
  ClipboardCheck
} from 'lucide-react';

const ROLE_OPTIONS = [
  {
    id: 'FARMER',
    label: 'Farmer',
    icon: Sprout,
    tagline: 'Farm-gate provenance & harvest verification',
    color: '#16A34A',
    bgLight: '#DCFCE7',
    borderColor: '#86EFAC'
  },
  {
    id: 'LOGISTICS',
    label: 'Logistics Provider',
    icon: Truck,
    tagline: 'Reefer fleet monitoring & custody transfer',
    color: '#0284C7',
    bgLight: '#E0F2FE',
    borderColor: '#7DD3FC'
  },
  {
    id: 'COLD_STORAGE',
    label: 'Cold Storage Owner',
    icon: Warehouse,
    tagline: 'Chamber management & pre-cooling intake',
    color: '#018180',
    bgLight: '#E6F4F4',
    borderColor: '#CFE8E7'
  },
  {
    id: 'BUYER',
    label: 'Buyer / Retailer',
    icon: ShoppingBag,
    tagline: 'Produce marketplace & delivery inspection',
    color: '#D946EF',
    bgLight: '#FAE8FF',
    borderColor: '#F0ABFC'
  },
  {
    id: 'VERIFICATION_TEAM',
    label: 'Verification Officer',
    icon: ClipboardCheck,
    tagline: 'Mandatory physical consignment inspection & sign-off',
    color: '#059669',
    bgLight: '#ECFDF5',
    borderColor: '#6EE7B7'
  },
  {
    id: 'ADMIN',
    label: 'Admin Control Tower',
    icon: ShieldCheck,
    tagline: 'Platform governance, disputes & audit trail',
    color: '#005E5D',
    bgLight: '#E6F4F4',
    borderColor: '#9DD3D2'
  }
];

export default function AuthPage() {
  const { login, register, quickLogin, forgotPassword, resetPassword, isLoading, authError } = useAuth();

  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'
  const [selectedRole, setSelectedRole] = useState('FARMER');
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    companyName: '',
    location: '',
    acreage: '',
    fleetSize: '',
    capacityMt: '',
    businessType: 'Agricultural Exporter'
  });

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStage, setResetStage] = useState('REQUEST_TOKEN'); // 'REQUEST_TOKEN' | 'SUBMIT_NEW'

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setFeedback({ type: 'error', message: 'Please enter both email address and password.' });
      return;
    }
    setLocalLoading(true);
    setFeedback(null);
    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName) {
      setFeedback({ type: 'error', message: 'Please complete all required fields.' });
      return;
    }
    setLocalLoading(true);
    setFeedback(null);

    const payload = {
      email: formData.email,
      password: formData.password,
      full_name: formData.fullName,
      role: selectedRole,
      phone: formData.phone || undefined,
      company_name: formData.companyName || undefined,
      location: formData.location || undefined,
      acreage: formData.acreage ? parseFloat(formData.acreage) : undefined,
      fleet_size: formData.fleetSize ? parseInt(formData.fleetSize, 10) : undefined,
      capacity_mt: formData.capacityMt ? parseFloat(formData.capacityMt) : undefined,
      business_type: formData.businessType || undefined
    };

    try {
      await register(payload);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setFeedback({ type: 'error', message: 'Please enter your registered email address.' });
      return;
    }
    setLocalLoading(true);
    setFeedback(null);
    try {
      const res = await forgotPassword(forgotEmail);
      if (res.demo_reset_token) {
        setResetToken(res.demo_reset_token);
        setResetStage('SUBMIT_NEW');
        setFeedback({ 
          type: 'success', 
          message: `Verification code generated: ${res.demo_reset_token}. Enter a new password below.` 
        });
      } else {
        setFeedback({ type: 'success', message: res.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setFeedback({ type: 'error', message: 'Please provide both the reset code and new password.' });
      return;
    }
    setLocalLoading(true);
    setFeedback(null);
    try {
      const res = await resetPassword(forgotEmail, resetToken, newPassword);
      setFeedback({ type: 'success', message: res.message + ' You may now sign in.' });
      setTimeout(() => {
        setMode('LOGIN');
        setFormData(prev => ({ ...prev, email: forgotEmail, password: newPassword }));
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleQuickDemoLogin = async (roleKey) => {
    setLocalLoading(true);
    setFeedback(null);
    try {
      await quickLogin(roleKey);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLocalLoading(false);
    }
  };

  const [backendHealth, setBackendHealth] = useState({ isChecking: true, isOnline: true });

  useEffect(() => {
    let isMounted = true;
    async function verifyBackend() {
      const health = await checkBackendHealth();
      if (isMounted) {
        setBackendHealth({ isChecking: false, isOnline: health.isOnline });
      }
    }
    verifyBackend();
    return () => { isMounted = false; };
  }, []);

  const handleRetryBackend = async () => {
    setBackendHealth({ isChecking: true, isOnline: false });
    const health = await checkBackendHealth();
    setBackendHealth({ isChecking: false, isOnline: health.isOnline });
    if (health.isOnline) {
      setFeedback({ type: 'success', message: 'Backend connected successfully!' });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 16px 60px 16px',
      position: 'relative',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      {/* Background Decorative Gradient Orbs */}
      <div style={{
        position: 'absolute',
        top: '5%',
        left: '15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(47, 128, 237, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(86, 180, 248, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* 1. BRAND HERO LOGO & HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '28px', zIndex: 1, maxWidth: '720px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="agritrust-logo-hero" style={{
            width: '130px',
            height: '130px',
            padding: '8px',
            marginBottom: '14px',
            cursor: 'default'
          }}>
            <img
              src="/agritrust_logo.png"
              alt="AGRITRUST Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08))'
              }}
            />
          </div>

          <h1 className="font-display" style={{ 
            fontSize: '32px', 
            fontWeight: '900', 
            letterSpacing: '-0.5px', 
            color: '#0F172A',
            margin: '0 0 6px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>AGRITRUST</span>
            <span style={{ 
              fontSize: '11px', 
              color: '#018180', 
              fontWeight: '800', 
              background: '#E6F4F4', 
              border: '1.5px solid #CFE8E7',
              padding: '3px 10px', 
              borderRadius: '20px',
              letterSpacing: '0.6px',
              verticalAlign: 'middle'
            }}>
              INTELLIGENCE OS
            </span>
          </h1>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#E6F4F4',
          border: '1px solid #CFE8E7',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.8px', color: '#005E5D', textTransform: 'uppercase' }}>
            Multi-Modal Cold-Chain Intelligence · Enterprise RBAC
          </span>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
          Verified Farm-Gate Provenance · 3-Mode Reefer Logistics (Road, Air, Marine) · Smart Escrow Custody
        </p>
      </div>

      {/* BACKEND CONNECTION STATUS NOTICE (IF OFFLINE) */}
      {!backendHealth.isChecking && !backendHealth.isOnline && (
        <div style={{
          maxWidth: '920px',
          width: '100%',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
          zIndex: 2
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ServerCrash size={20} color="#DC2626" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#991B1B' }}>
              <b>Backend Connection Unavailable:</b> The FastAPI server at <b>http://127.0.0.1:8000</b> is unreachable.
              <span style={{ display: 'block', fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
                Run: <code>uvicorn main:app --reload --port 8000</code> in the backend folder to enable full live data.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryBackend}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              color: '#B91C1C',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <RefreshCw size={12} className={backendHealth.isChecking ? 'animate-spin' : ''} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 2. DEMO ONE-CLICK FAST LOGIN SELECTOR */}
      <div style={{
        maxWidth: '920px',
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        marginBottom: '24px',
        zIndex: 1,
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent-blue)" />
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#005E5D' }}>
              1-Click Demo Evaluation Profiles
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Click any role below to instantly authenticate into its dedicated dashboard
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px'
        }}>
          {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => {
            const Icon = ROLE_OPTIONS.find(r => r.id === cred.role)?.icon || User;
            const meta = ROLE_OPTIONS.find(r => r.id === cred.role) || { color: '#018180', bgLight: '#E6F4F4', borderColor: '#CFE8E7' };
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleQuickDemoLogin(key)}
                disabled={localLoading || isLoading}
                className="btn"
                style={{
                  background: 'var(--bg-panel)',
                  border: `1px solid var(--border-card)`,
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = meta.color;
                  e.currentTarget.style.background = meta.bgLight;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(47, 128, 237, 0.12)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-card)';
                  e.currentTarget.style.background = 'var(--bg-panel)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginBottom: '4px' }}>
                  <Icon size={15} color={meta.color} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#111827' }}>
                    {cred.role}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: meta.color, fontWeight: '700' }}>
                  {cred.name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {cred.badge}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN AUTHENTICATION CARD */}
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 36px',
        boxShadow: 'var(--shadow-modal)',
        zIndex: 1
      }}>

        {/* Tab Toggle: Login vs Register vs Forgot */}
        {mode !== 'FORGOT_PASSWORD' ? (
          <div style={{
            display: 'flex',
            background: 'var(--bg-panel)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            marginBottom: '24px',
            border: '1px solid var(--border-card)'
          }}>
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); setFeedback(null); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'LOGIN' ? 'linear-gradient(135deg, #018180, #005E5D)' : 'transparent',
                color: mode === 'LOGIN' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: mode === 'LOGIN' ? '0 2px 8px rgba(1, 129, 128, 0.25)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('REGISTER'); setFeedback(null); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'REGISTER' ? 'linear-gradient(135deg, #018180, #005E5D)' : 'transparent',
                color: mode === 'REGISTER' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: mode === 'REGISTER' ? '0 2px 8px rgba(1, 129, 128, 0.25)' : 'none'
              }}
            >
              Register Account
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={20} color="var(--color-primary-blue)" />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                Reset Your Password
              </h3>
            </div>
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); setFeedback(null); }}
              className="btn btn-secondary btn-sm"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* FEEDBACK BANNER */}
        {(feedback || authError) && (
          <div style={{
            background: (feedback?.type === 'success') ? '#DCFCE7' : 'var(--accent-rose-bg)',
            border: `1px solid ${(feedback?.type === 'success') ? '#86EFAC' : '#FECACA'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '13px',
            color: (feedback?.type === 'success') ? '#15803D' : '#DC2626',
            fontWeight: '600'
          }}>
            {(feedback?.type === 'success') ? <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span>{feedback?.message || authError}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* A. SIGN IN FORM */}
        {/* ------------------------------------------------------------- */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. farmer@agritrust.io"
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('FORGOT_PASSWORD'); setFeedback(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary-blue)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '700'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={localLoading || isLoading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700',
                marginTop: '10px'
              }}
            >
              {localLoading ? 'Signing In...' : 'Sign In to Platform'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* B. REGISTRATION FORM WITH ROLE-SPECIFIC ONBOARDING */}
        {/* ------------------------------------------------------------- */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit}>
            {/* Role Selection Tabs */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Your Role
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {ROLE_OPTIONS.filter(r => r.id !== 'ADMIN').map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      style={{
                        background: isSelected ? role.bgLight : '#FFFFFF',
                        border: `1.5px solid ${isSelected ? role.color : 'var(--border-card)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={16} color={isSelected ? role.color : 'var(--text-muted)'} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: isSelected ? '#111827' : 'var(--text-secondary)' }}>
                          {role.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                * Administrator accounts must be provisioned by an authorized platform administrator.
              </p>
            </div>

            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="e.g. Ramesh Patil"
                    required
                    className="form-input"
                    style={{ paddingLeft: '32px', padding: '8px 10px 8px 30px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 98220 12345"
                    className="form-input"
                    style={{ paddingLeft: '32px', padding: '8px 10px 8px 30px', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. ramesh@patilagro.com"
                  required
                  className="form-input"
                  style={{ paddingLeft: '32px', padding: '8px 10px 8px 30px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Create Password * (min 6 chars)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Choose a strong password"
                  required
                  minLength={6}
                  className="form-input"
                  style={{ paddingLeft: '32px', paddingRight: '32px', padding: '8px 32px 8px 30px', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role-Specific Onboarding Fields */}
            <div style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '18px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#005E5D', marginBottom: '8px' }}>
                {selectedRole} Onboarding Details
              </div>

              {selectedRole === 'FARMER' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Farm Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="e.g. Nashik, MH"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Acreage (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="acreage"
                      value={formData.acreage}
                      onChange={handleInputChange}
                      placeholder="e.g. 10.5"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {selectedRole === 'LOGISTICS' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="e.g. Express Reefer Trans"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Fleet Size</label>
                    <input
                      type="number"
                      name="fleetSize"
                      value={formData.fleetSize}
                      onChange={handleInputChange}
                      placeholder="e.g. 12"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {selectedRole === 'COLD_STORAGE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Facility Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="e.g. MahaCold Warehouse"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Capacity (MT)</label>
                    <input
                      type="number"
                      name="capacityMt"
                      value={formData.capacityMt}
                      onChange={handleInputChange}
                      placeholder="e.g. 500"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {selectedRole === 'BUYER' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Company / Store Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="e.g. FreshMart Supermarkets"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Business Type</label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="form-select"
                      style={{ padding: '6px 8px', fontSize: '12px' }}
                    >
                      <option value="Agricultural Exporter">Agricultural Exporter</option>
                      <option value="Retail Chain">Retail Chain</option>
                      <option value="Wholesale Distributor">Wholesale Distributor</option>
                      <option value="Food Processing Plant">Food Processing Plant</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={localLoading || isLoading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700'
              }}
            >
              {localLoading ? 'Creating Account...' : `Register as ${selectedRole}`}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* C. FORGOT PASSWORD WORKFLOW */}
        {/* ------------------------------------------------------------- */}
        {mode === 'FORGOT_PASSWORD' && (
          <div>
            {resetStage === 'REQUEST_TOKEN' ? (
              <form onSubmit={handleForgotPasswordSubmit}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                  Enter your registered email address to receive a secure password reset verification code.
                </p>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. farmer@agritrust.io"
                      required
                      className="form-input"
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={localLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  {localLoading ? 'Sending...' : 'Generate Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Reset Code / Token
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter new strong password"
                    className="form-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={localLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  {localLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>

      {/* 4. FOOTER CREDENTIAL SUMMARY */}
      <div style={{
        marginTop: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        zIndex: 1,
        flexWrap: 'wrap',
        justifyContent: 'center',
        fontWeight: '500'
      }}>
        <span>🔐 PBKDF2 Password Hashing</span>
        <span>🛡️ JWT RBAC Authorization</span>
        <span>⚡ PostgreSQL Database Active</span>
        <span>🌡️ Real-Time Telemetry Ingestion</span>
      </div>
    </div>
  );
}
