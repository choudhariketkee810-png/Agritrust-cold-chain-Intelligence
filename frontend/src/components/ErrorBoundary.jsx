import React from 'react';
import { AlertTriangle, RefreshCw, LogOut, ServerCrash } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AGRITrust ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.removeItem('agritrust_token');
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isConnectionError = 
        this.state.error?.message?.includes('fetch') || 
        this.state.error?.message?.includes('unavailable') ||
        this.state.error?.message?.includes('Network') ||
        this.state.error?.message?.includes('Failed to fetch');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#F8FAFC',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '40px 36px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isConnectionError ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${isConnectionError ? '#FECACA' : '#FDE68A'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: isConnectionError ? '#DC2626' : '#D97706'
            }}>
              {isConnectionError ? <ServerCrash size={32} /> : <AlertTriangle size={32} />}
            </div>

            <div style={{
              fontSize: '11px',
              fontWeight: '800',
              color: isConnectionError ? '#DC2626' : '#D97706',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px'
            }}>
              {isConnectionError ? 'Backend Connection Notice' : 'Application Runtime Notice'}
            </div>

            <h2 style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#0F172A',
              marginBottom: '12px',
              letterSpacing: '-0.02em'
            }}>
              {isConnectionError ? 'Backend Service Unavailable' : 'Encountered Unexpected State'}
            </h2>

            <p style={{
              fontSize: '14px',
              color: '#64748B',
              lineHeight: 1.6,
              marginBottom: '24px'
            }}>
              {isConnectionError ? (
                <>
                  The AGRITrust UI is active, but the backend API server at <b>http://127.0.0.1:8000</b> is unreachable. Please ensure your FastAPI backend is running via <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>uvicorn main:app --reload</code>.
                </>
              ) : (
                <>
                  The application caught an unexpected view exception: <br />
                  <code style={{ background: '#F1F5F9', padding: '3px 6px', borderRadius: '4px', fontSize: '12px', color: '#DC2626', display: 'inline-block', marginTop: '6px' }}>
                    {this.state.error?.message || 'Unknown error'}
                  </code>
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: '#018180',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={14} />
                <span>Retry Connection</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <LogOut size={14} />
                <span>Reset Session & Return to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
