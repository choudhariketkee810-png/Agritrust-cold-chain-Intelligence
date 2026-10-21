import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES, getRoleDefaultTab, hasPermission } from './config/roles';
import AuthPage from './components/AuthPage';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import AccessRestricted from './components/AccessRestricted';

// Role Dashboards
import FarmerDashboard from './components/FarmerDashboard';
import LogisticsDashboard from './components/LogisticsDashboard';
import ColdStorageDashboard from './components/ColdStorageDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import AdminDashboard from './components/AdminDashboard';
import VerificationTeamDashboard from './components/VerificationTeamDashboard';

// Shared Deep Intelligence & Provenance Views
import ControlTowerView from './components/ControlTowerView';
import ShipmentsView from './components/ShipmentsView';
import LiveMonitoringView from './components/LiveMonitoringView';
import ChainOfCustodyView from './components/ChainOfCustodyView';
import AlertsView from './components/AlertsView';
import IncidentsView from './components/IncidentsView';
import AnalyticsView from './components/AnalyticsView';
import VerificationView from './components/VerificationView';
import SpoilageControlCenter from './components/SpoilageControlCenter';
import MarineControlCenter from './components/MarineControlCenter';
import MultiRoutePlanner from './components/MultiRoutePlanner';

// Upgraded Visual AI Intelligence & Loss Prevention Components
import AiConsignmentInspector from './components/AiConsignmentInspector';
import AiSpoilagePredictor from './components/AiSpoilagePredictor';
import SmartRouteOptimizer from './components/SmartRouteOptimizer';
import DigitalChainOfCustody from './components/DigitalChainOfCustody';
import LossPreventionInvestigation from './components/LossPreventionInvestigation';
import NewShipmentBooking from './components/NewShipmentBooking';
import NotificationsView from './components/NotificationsView';
import ProfileSettingsView from './components/ProfileSettingsView';

import { AlertCircle, RefreshCw, Sprout } from 'lucide-react';
import { 
  fetchShipments, 
  fetchFleetMonitoring, 
  fetchRecentAlerts, 
  fetchIncidents 
} from './api';

function MainApp() {
  const { isAuthenticated, role, isLoading: authLoading } = useAuth();
  const effectiveRole = role || ROLES.FARMER;

  // Unified Tab Navigation — Defaults to role-specific dashboard on mount
  const [activeTab, setActiveTab] = useState(() => getRoleDefaultTab(effectiveRole));
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync activeTab whenever user role changes (e.g. via Login or Quick Role Switcher)
  useEffect(() => {
    if (role) {
      setActiveTab(getRoleDefaultTab(role));
    }
  }, [role]);

  // Shared application state
  const [shipments, setShipments] = useState([]);
  const [fleetMonitoring, setFleetMonitoring] = useState([]);
  const [alertsList, setAlertsList] = useState([]);
  const [incidentsList, setIncidentsList] = useState([]);

  // Selected entities for deep links
  const [selectedShipmentId, setSelectedShipmentId] = useState('SHP-TOMATO-001');
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  // Sync & health state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiConnected, setApiConnected] = useState(true);

  // Master data fetching function
  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const [shipRes, fleetRes, alertRes, incRes] = await Promise.allSettled([
        fetchShipments(),
        fetchFleetMonitoring(),
        fetchRecentAlerts(),
        fetchIncidents()
      ]);

      let hasSuccess = false;

      if (shipRes.status === 'fulfilled' && shipRes.value?.data) {
        setShipments(shipRes.value.data);
        hasSuccess = true;
        if (shipRes.value.data.length > 0 && !selectedShipmentId) {
          setSelectedShipmentId(shipRes.value.data[0].shipment_id);
        }
      }

      if (fleetRes.status === 'fulfilled' && fleetRes.value?.data) {
        setFleetMonitoring(fleetRes.value.data);
        hasSuccess = true;
      }

      if (alertRes.status === 'fulfilled' && alertRes.value?.data) {
        setAlertsList(alertRes.value.data);
        hasSuccess = true;
      }

      if (incRes.status === 'fulfilled' && incRes.value?.data) {
        setIncidentsList(incRes.value.data);
        hasSuccess = true;
      }

      if (hasSuccess) {
        setError(null);
        setApiConnected(true);
        setLastUpdated(new Date());
      } else {
        throw new Error('All background API fetches failed.');
      }
    } catch (err) {
      console.error('Data fetch error:', err);
      setError(err.message || 'Unable to connect to FastAPI backend');
      setApiConnected(false);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, [selectedShipmentId]);

  // Initial Load
  useEffect(() => {
    if (isAuthenticated) {
      fetchData(true);
    }
  }, [isAuthenticated, fetchData]);

  // Real-time Polling Interval (every 4 seconds when authenticated)
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, isAuthenticated, fetchData]);

  // Deep Navigation handlers
  const handleSelectShipment = (shipmentId) => {
    setSelectedShipmentId(shipmentId);
    if (effectiveRole === ROLES.LOGISTICS || effectiveRole === ROLES.ADMIN) {
      setActiveTab('live-monitoring');
    } else if (effectiveRole === ROLES.FARMER) {
      setActiveTab('tracking');
    } else if (effectiveRole === ROLES.BUYER) {
      setActiveTab('tracking');
    }
  };

  const handleOpenInvestigation = (incidentId) => {
    setSelectedIncidentId(incidentId);
    if (hasPermission(effectiveRole, 'disputes') || hasPermission(effectiveRole, 'incidents')) {
      setActiveTab('disputes');
    }
  };

  const handleOpenVerification = (shipmentId) => {
    setSelectedShipmentId(shipmentId);
    if (effectiveRole === ROLES.VERIFICATION_TEAM) {
      setActiveTab('pending-queue');
    } else if (effectiveRole === ROLES.ADMIN) {
      setActiveTab('verification-oversight');
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '32px 48px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}>
          <RefreshCw size={28} className="animate-spin" color="var(--color-primary-blue)" style={{ margin: '0 auto 16px auto' }} />
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Initializing AGRITRUST Security Session...</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Connecting to verified PostgreSQL telemetry backend</div>
        </div>
      </div>
    );
  }

  // Not Authenticated -> Show Common Login & Registration Portal
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Route Permission Check
  const isAuthorized = hasPermission(effectiveRole, activeTab);

  const activeAlertsCount = alertsList.filter(a => a.status === 'OPEN').length;
  const openIncidentsCount = incidentsList.filter(i => i.status === 'OPEN' || i.status === 'UNDER_REVIEW').length;

  return (
    <div className="agritrust-app-layout">
      {/* 1. ENTERPRISE ROLE-SPECIFIC SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        badgeCounts={{
          activeAlerts: activeAlertsCount,
          openIncidents: openIncidentsCount
        }}
        currentRole={effectiveRole}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* 2. MAIN CONTENT VIEW CONTAINER */}
      <div className="agritrust-main-content">
        
        {/* TOP STATUS AND ACTION BAR */}
        <TopBar
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchData(true)}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          activeAlertCount={activeAlertsCount}
          apiConnected={apiConnected}
          activeTab={activeTab}
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
        />

        {/* CONNECTION NOTICE (IF ANY) */}
        {error && (
          <div style={{
            background: 'var(--accent-rose-bg)',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--accent-rose)',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="var(--accent-rose)" />
              <span><b>Connection Notice:</b> {error}. Automatic retry active...</span>
            </div>
            <button 
              type="button"
              onClick={() => fetchData(true)}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--accent-rose)', borderColor: '#FECACA' }}
            >
              <RefreshCw size={12} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* 3. ACTIVE VIEW ROUTING WITH STRICT ROLE-BASED ACCESS GUARDS */}
        <main style={{ minHeight: 'calc(100vh - 180px)' }}>
          
          {/* UNAUTHORIZED ACCESS GUARD */}
          {!isAuthorized && (
            <AccessRestricted
              currentRole={effectiveRole}
              attemptedTab={activeTab}
              onReturnToDashboard={() => setActiveTab(getRoleDefaultTab(effectiveRole))}
            />
          )}

          {/* AUTHORIZED ROLE WORKSPACES */}
          {isAuthorized && (
            <>
              {/* ========================================================= */}
              {/* 1. FARMER / EXPORTER PORTAL (11 Items)                    */}
              {/* ========================================================= */}
              {effectiveRole === ROLES.FARMER && (
                <>
                  {activeTab === 'new-booking' ? (
                    <NewShipmentBooking 
                      onBookingConfirmed={() => {
                        fetchData(true);
                        setActiveTab('shipments');
                      }}
                      onNavigateVerificationQueue={() => setActiveTab('shipments')}
                    />
                  ) : activeTab === 'compare-modes' ? (
                    <SmartRouteOptimizer
                      onSelectMode={handleSelectShipment}
                      onNavigateBooking={() => setActiveTab('new-booking')}
                    />
                  ) : activeTab === 'tracking' ? (
                    <LiveMonitoringView
                      shipments={shipments}
                      selectedShipmentId={selectedShipmentId}
                      onSelectShipment={setSelectedShipmentId}
                    />
                  ) : activeTab === 'quality-records' ? (
                    <FarmerDashboard
                      activeTab="produce"
                      onNavigateTab={setActiveTab}
                    />
                  ) : activeTab === 'disputes' ? (
                    <LossPreventionInvestigation />
                  ) : activeTab === 'notifications' ? (
                    <NotificationsView role="FARMER" onNavigateTab={setActiveTab} />
                  ) : activeTab === 'profile-settings' ? (
                    <ProfileSettingsView role="FARMER" />
                  ) : (
                    <FarmerDashboard
                      activeTab={activeTab}
                      onNavigateTab={setActiveTab}
                    />
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* 2. BUYER / RETAILER PORTAL (10 Items)                     */}
              {/* ========================================================= */}
              {effectiveRole === ROLES.BUYER && (
                <>
                  {activeTab === 'tracking' ? (
                    <LiveMonitoringView
                      shipments={shipments}
                      selectedShipmentId={selectedShipmentId}
                      onSelectShipment={setSelectedShipmentId}
                    />
                  ) : activeTab === 'quality-verification' ? (
                    <BuyerDashboard
                      activeTab="verify"
                      onNavigateTab={setActiveTab}
                    />
                  ) : activeTab === 'delivery-confirmation' ? (
                    <BuyerDashboard
                      activeTab="orders"
                      onNavigateTab={setActiveTab}
                    />
                  ) : activeTab === 'disputes' ? (
                    <LossPreventionInvestigation />
                  ) : activeTab === 'notifications' ? (
                    <NotificationsView role="BUYER" onNavigateTab={setActiveTab} />
                  ) : activeTab === 'profile-settings' ? (
                    <ProfileSettingsView role="BUYER" />
                  ) : (
                    <BuyerDashboard
                      activeTab={activeTab}
                      onNavigateTab={setActiveTab}
                    />
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* 3. VERIFICATION TEAM PORTAL (9 Items)                     */}
              {/* ========================================================= */}
              {effectiveRole === ROLES.VERIFICATION_TEAM && (
                <>
                  {activeTab === 'ai-quality-analysis' ? (
                    <AiConsignmentInspector onNavigateConsignment={handleSelectShipment} />
                  ) : activeTab === 'notifications' ? (
                    <NotificationsView role="VERIFICATION_TEAM" onNavigateTab={setActiveTab} />
                  ) : activeTab === 'profile-settings' ? (
                    <ProfileSettingsView role="VERIFICATION_TEAM" />
                  ) : (
                    <VerificationTeamDashboard
                      activeTab={activeTab}
                      onNavigateTab={setActiveTab}
                    />
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* 4. LOGISTICS PROVIDER / FLEET PORTAL (11 Items)           */}
              {/* ========================================================= */}
              {effectiveRole === ROLES.LOGISTICS && (
                <>
                  {activeTab === 'live-tracking' || activeTab === 'in-transit-monitoring' ? (
                    <LiveMonitoringView
                      shipments={shipments}
                      selectedShipmentId={selectedShipmentId}
                      onSelectShipment={setSelectedShipmentId}
                    />
                  ) : activeTab === 'incidents' ? (
                    <LossPreventionInvestigation />
                  ) : activeTab === 'notifications' ? (
                    <NotificationsView role="LOGISTICS" onNavigateTab={setActiveTab} />
                  ) : activeTab === 'profile-settings' ? (
                    <ProfileSettingsView role="LOGISTICS" />
                  ) : (
                    <LogisticsDashboard
                      activeTab={activeTab}
                      onNavigateTab={setActiveTab}
                    />
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* 5. COLD STORAGE PORTAL (10 Items)                         */}
              {/* ========================================================= */}
              {effectiveRole === ROLES.COLD_STORAGE && (
                <>
                  {activeTab === 'storage-reports' ? (
                    <AnalyticsView
                      shipments={shipments}
                      fleetMonitoring={fleetMonitoring}
                      alertsList={alertsList}
                      incidentsList={incidentsList}
                    />
                  ) : activeTab === 'notifications' ? (
                    <NotificationsView role="COLD_STORAGE" onNavigateTab={setActiveTab} />
                  ) : activeTab === 'profile-settings' ? (
                    <ProfileSettingsView role="COLD_STORAGE" />
                  ) : (
                    <ColdStorageDashboard
                      activeTab={activeTab}
                      onNavigateTab={setActiveTab}
                    />
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* 6. ADMIN / CONTROL TOWER PORTAL (13 Items)                */}
              {/* ========================================================= */}
              {effectiveRole === ROLES.ADMIN && (
                <>
                  {activeTab === 'control-tower' && (
                    <ControlTowerView
                      shipments={shipments}
                      fleetMonitoring={fleetMonitoring}
                      alertsList={alertsList}
                      incidentsList={incidentsList}
                      onSelectShipment={handleSelectShipment}
                      onOpenInvestigation={handleOpenInvestigation}
                      onOpenVerification={handleOpenVerification}
                      onNavigateTab={setActiveTab}
                    />
                  )}

                  {activeTab === 'shipment-management' && (
                    <ShipmentsView
                      shipments={shipments}
                      onRefresh={() => fetchData(true)}
                      onSelectMonitoring={handleSelectShipment}
                      onOpenVerification={handleOpenVerification}
                      onOpenInvestigation={handleOpenInvestigation}
                    />
                  )}

                  {activeTab === 'transport-routes' && (
                    <MultiRoutePlanner />
                  )}

                  {activeTab === 'live-monitoring' && (
                    <LiveMonitoringView
                      shipments={shipments}
                      selectedShipmentId={selectedShipmentId}
                      onSelectShipment={setSelectedShipmentId}
                    />
                  )}

                  {activeTab === 'alerts' && (
                    <AlertsView
                      alertsList={alertsList}
                      onRefresh={() => fetchData(true)}
                      onSelectShipment={handleSelectShipment}
                    />
                  )}

                  {activeTab === 'disputes' && (
                    <LossPreventionInvestigation />
                  )}

                  {activeTab === 'loss-prevention' && (
                    <LossPreventionInvestigation />
                  )}

                  {activeTab === 'analytics' && (
                    <AnalyticsView
                      shipments={shipments}
                      fleetMonitoring={fleetMonitoring}
                      alertsList={alertsList}
                      incidentsList={incidentsList}
                    />
                  )}

                  {['user-management', 'verification-oversight', 'cold-storage-oversight', 'audit-logs', 'system-settings'].includes(activeTab) && (
                    <AdminDashboard
                      activeTab={activeTab}
                      onNavigateToView={(viewKey) => setActiveTab(viewKey)}
                      shipments={shipments}
                      fleetMonitoring={fleetMonitoring}
                      alertsList={alertsList}
                      incidentsList={incidentsList}
                    />
                  )}
                </>
              )}
            </>
          )}

        </main>

        {/* 4. PLATFORM FOOTER */}
        <footer style={{ 
          marginTop: '40px', 
          paddingTop: '20px', 
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1.5px solid #018180',
              padding: '2px',
              boxShadow: '0 2px 8px rgba(1, 129, 128, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <img src="/agritrust_logo.png" alt="AGRITRUST Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span><b style={{ color: '#0F172A' }}>AGRITRUST</b> · Global Multi-Modal Logistics & Cold-Chain Intelligence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span>PostgreSQL: <b style={{ color: 'var(--text-secondary)' }}>ftl_cold_chain (Port 5432)</b></span>
            <span>FastAPI: <b style={{ color: 'var(--text-secondary)' }}>http://127.0.0.1:8000</b></span>
            <span>Active Role: <b style={{ color: 'var(--color-primary-blue)' }}>{effectiveRole}</b></span>
            <span>Security: <b style={{ color: 'var(--accent-emerald)' }}>RBAC Protected</b></span>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
