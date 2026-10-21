/**
 * AGRITrust — Centralized API Client Service
 * Connects to the FastAPI backend at http://127.0.0.1:8000 (or VITE_API_URL)
 * Handles automatic JWT Bearer token authentication for all RBAC endpoints.
 */

export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000';

function getAuthToken() {
  return localStorage.getItem('agritrust_token') || '';
}

/**
 * Generic fetch wrapper with robust error handling and JWT injection
 */
async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      let errorMsg = `API Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        } else if (errorJson.message) {
          errorMsg = errorJson.message;
        }
      } catch {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      const offlineMsg = `Backend connection unavailable at ${API_BASE_URL}. Please ensure the FastAPI backend is running.`;
      console.warn(`[AGRITrust API Offline] ${options.method || 'GET'} ${endpoint}:`, offlineMsg);
      const customErr = new Error(offlineMsg);
      customErr.isOffline = true;
      throw customErr;
    }
    console.error(`Fetch error on [${options.method || 'GET'} ${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Health check helper to test backend connectivity
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/docs`, { method: 'HEAD', mode: 'no-cors' });
    return { isOnline: true, status: 'CONNECTED' };
  } catch (e) {
    return { isOnline: false, status: 'DISCONNECTED', error: e.message };
  }
}

// =============================================================
// 1. AUTHENTICATION & PROFILE APIS
// =============================================================

export async function loginUser(email, password) {
  return fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function registerUser(payload) {
  return fetchJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchCurrentUser() {
  return fetchJson('/auth/me');
}

export async function forgotPassword(email) {
  return fetchJson('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(email, resetToken, newPassword) {
  return fetchJson('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
      reset_token: resetToken,
      new_password: newPassword
    })
  });
}

export async function provisionAdmin(payload) {
  return fetchJson('/auth/admin/provision', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// =============================================================
// 2. FARMER DASHBOARD APIS
// =============================================================

export async function fetchFarmerFarms() {
  return fetchJson('/farmer/farms');
}

export async function createFarmerFarm(payload) {
  return fetchJson('/farmer/farms', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateFarmerFarm(farmId, payload) {
  return fetchJson(`/farmer/farms/${encodeURIComponent(farmId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function fetchFarmerProduce() {
  return fetchJson('/farmer/produce');
}

export async function createFarmerProduce(payload) {
  return fetchJson('/farmer/produce', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchNearbyColdStorages(district = null, minCapacity = null) {
  let query = '';
  const params = [];
  if (district) params.push(`district=${encodeURIComponent(district)}`);
  if (minCapacity) params.push(`min_capacity_mt=${encodeURIComponent(minCapacity)}`);
  if (params.length > 0) query = `?${params.join('&')}`;
  return fetchJson(`/farmer/cold-storages${query}`);
}

export async function fetchFarmerStorageBookings() {
  return fetchJson('/farmer/storage-bookings');
}

export async function createFarmerStorageBooking(payload) {
  return fetchJson('/farmer/storage-bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchFarmerShipments() {
  return fetchJson('/farmer/shipments');
}

export async function createFarmerShipment(payload) {
  return fetchJson('/farmer/shipments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchFarmerPayments() {
  return fetchJson('/farmer/payments');
}

// =============================================================
// 3. LOGISTICS PROVIDER APIS
// =============================================================

export async function fetchLogisticsProfile() {
  return fetchJson('/logistics/profile');
}

export async function fetchLogisticsDrivers() {
  return fetchJson('/logistics/drivers');
}

export async function createLogisticsDriver(payload) {
  return fetchJson('/logistics/drivers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchLogisticsVehicles() {
  return fetchJson('/logistics/vehicles');
}

export async function createLogisticsVehicle(payload) {
  return fetchJson('/logistics/vehicles', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchAvailableLogisticsShipments() {
  return fetchJson('/logistics/shipments/available');
}

export async function acceptLogisticsShipment(shipmentId) {
  return fetchJson(`/logistics/shipments/${encodeURIComponent(shipmentId)}/accept`, {
    method: 'POST'
  });
}

export async function assignLogisticsShipment(shipmentId, payload) {
  return fetchJson(`/logistics/shipments/${encodeURIComponent(shipmentId)}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateLogisticsShipmentStatus(shipmentId, payload) {
  return fetchJson(`/logistics/shipments/${encodeURIComponent(shipmentId)}/status`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchLogisticsFleetTelemetry() {
  return fetchJson('/logistics/fleet-telemetry');
}

// =============================================================
// 4. COLD STORAGE FACILITY APIS
// =============================================================

export async function fetchColdStorageFacility() {
  return fetchJson('/cold-storage/facility');
}

export async function fetchColdStorageChambers() {
  return fetchJson('/cold-storage/chambers');
}

export async function createColdStorageChamber(payload) {
  return fetchJson('/cold-storage/chambers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateColdStorageChamber(chamberId, payload) {
  return fetchJson(`/cold-storage/chambers/${encodeURIComponent(chamberId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function fetchColdStorageBookings() {
  return fetchJson('/cold-storage/bookings');
}

export async function actionColdStorageBooking(bookingId, payload) {
  return fetchJson(`/cold-storage/bookings/${encodeURIComponent(bookingId)}/action`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function intakeColdStorageBooking(bookingId, payload) {
  return fetchJson(`/cold-storage/bookings/${encodeURIComponent(bookingId)}/intake`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function dispatchColdStorageBooking(bookingId, payload) {
  return fetchJson(`/cold-storage/bookings/${encodeURIComponent(bookingId)}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchColdStorageInventory() {
  return fetchJson('/cold-storage/inventory');
}

// =============================================================
// 5. BUYER APIS
// =============================================================

export async function fetchBuyerMarketplace() {
  return fetchJson('/buyer/marketplace');
}

export async function createBuyerOrder(payload) {
  return fetchJson('/buyer/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchBuyerOrders() {
  return fetchJson('/buyer/orders');
}

export async function fetchBuyerShipments() {
  return fetchJson('/buyer/shipments');
}

// =============================================================
// 6. DISPUTES & AI EVIDENCE APIS
// =============================================================

export async function createDispute(payload) {
  return fetchJson('/disputes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// =============================================================
// 7. ADMIN GOVERNANCE & AUDIT APIS
// =============================================================

export async function fetchAdminStats() {
  return fetchJson('/admin/stats');
}

export async function fetchAdminUsers() {
  return fetchJson('/admin/users');
}

export async function updateAdminUserStatus(userId, payload) {
  return fetchJson(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function fetchAdminDisputes() {
  return fetchJson('/admin/disputes');
}

export async function resolveAdminDispute(disputeId, payload) {
  return fetchJson(`/admin/disputes/${encodeURIComponent(disputeId)}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchAdminAuditLogs(limit = 50) {
  return fetchJson(`/admin/audit-logs?limit=${limit}`);
}

export async function fetchAdminAnalytics() {
  return fetchJson('/admin/analytics');
}

// =============================================================
// 8. EXISTING TELEMETRY, SHIPMENTS & MONITORING APIS
// =============================================================

export async function fetchLatestTelemetry() {
  return fetchJson('/telemetry/latest');
}

export async function fetchShipmentTelemetry(shipmentId, limit = 50) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/telemetry?limit=${limit}`);
}

export async function fetchFleetMonitoring() {
  return fetchJson('/monitoring/shipments');
}

export async function fetchShipmentRisk(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/risk`);
}

export async function fetchShipments() {
  return fetchJson('/shipments');
}

export async function fetchCurrentShipment() {
  return fetchJson('/shipments/current');
}

export async function fetchShipmentDetails(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}`);
}

export async function createShipment(payload) {
  return fetchJson('/shipments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function recordHandover(shipmentId, payload) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/handover`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function recordReceiving(shipmentId, payload) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/receive`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchShipmentTimeline(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/timeline`);
}

export async function fetchShipmentEvidence(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/evidence`);
}

export async function fetchShipmentComparison(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/comparison`);
}

export async function verifyShipment(shipmentId) {
  return fetchJson(`/verify/${encodeURIComponent(shipmentId)}`);
}

export function getQrCodeUrl(shipmentId) {
  return `${API_BASE_URL}/shipments/${encodeURIComponent(shipmentId)}/qr`;
}

export async function fetchRecentAlerts() {
  return fetchJson('/alerts/recent');
}

export async function triggerAlertCheck() {
  return fetchJson('/alerts/check', {
    method: 'POST'
  });
}

export async function fetchIncidents() {
  return fetchJson('/incidents');
}

export async function fetchIncidentDetails(incidentId) {
  return fetchJson(`/incidents/${encodeURIComponent(incidentId)}`);
}

export async function fetchIncidentInvestigation(incidentId) {
  return fetchJson(`/incidents/${encodeURIComponent(incidentId)}/investigation`);
}

export async function updateIncidentStatus(incidentId, status, resolutionNotes = null) {
  return fetchJson(`/incidents/${encodeURIComponent(incidentId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      resolution_notes: resolutionNotes
    })
  });
}

// =============================================================
// 9. SELL BEFORE SPOILAGE — AI-POWERED DYNAMIC MARKETPLACE APIS
// =============================================================

export async function fetchShipmentSpoilageRisk(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/spoilage-risk`);
}

export async function reassessShipmentSpoilageRisk(shipmentId, payload = {}) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/spoilage-risk/reassess`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchAtRiskShipments(riskFilter = null) {
  let query = '';
  if (riskFilter) query = `?risk_filter=${encodeURIComponent(riskFilter)}`;
  return fetchJson(`/spoilage/at-risk-shipments${query}`);
}

export async function fetchAlternativeBuyers(shipmentId, filters = {}) {
  const params = [];
  if (filters.maxDistance) params.push(`max_distance_km=${encodeURIComponent(filters.maxDistance)}`);
  if (filters.minPrice) params.push(`min_price=${encodeURIComponent(filters.minPrice)}`);
  if (filters.receivingWindow) params.push(`receiving_window=${encodeURIComponent(filters.receivingWindow)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/alternative-buyers${query}`);
}

export async function fetchBuyerDemands(filters = {}) {
  const params = [];
  if (filters.produceName) params.push(`produce_name=${encodeURIComponent(filters.produceName)}`);
  if (filters.district) params.push(`district=${encodeURIComponent(filters.district)}`);
  if (filters.receivingWindow) params.push(`receiving_window=${encodeURIComponent(filters.receivingWindow)}`);
  if (filters.status) params.push(`status=${encodeURIComponent(filters.status)}`);
  if (filters.buyerId) params.push(`buyer_id=${encodeURIComponent(filters.buyerId)}`);
  if (filters.includeDemo !== undefined) params.push(`include_demo=${filters.includeDemo}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return fetchJson(`/marketplace/buyer-demand${query}`);
}

export async function createBuyerDemand(payload) {
  return fetchJson('/marketplace/buyer-demand', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateBuyerDemand(demandId, payload) {
  return fetchJson(`/marketplace/buyer-demand/${encodeURIComponent(demandId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function fetchMarketplaceOffers(filters = {}) {
  const params = [];
  if (filters.shipmentId) params.push(`shipment_id=${encodeURIComponent(filters.shipmentId)}`);
  if (filters.statusFilter) params.push(`status_filter=${encodeURIComponent(filters.statusFilter)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return fetchJson(`/marketplace/offers${query}`);
}

export async function fetchMarketplaceOfferDetails(offerId) {
  return fetchJson(`/marketplace/offers/${encodeURIComponent(offerId)}`);
}

export async function createMarketplaceOffer(payload) {
  return fetchJson('/marketplace/offers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function buyerActionOnOffer(offerId, payload) {
  return fetchJson(`/marketplace/offers/${encodeURIComponent(offerId)}/buyer-action`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function logisticsActionOnOffer(offerId, payload) {
  return fetchJson(`/marketplace/offers/${encodeURIComponent(offerId)}/logistics-action`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function farmerConfirmOffer(offerId, payload) {
  return fetchJson(`/marketplace/offers/${encodeURIComponent(offerId)}/farmer-confirm`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deliverMarketplaceOffer(offerId, payload) {
  return fetchJson(`/marketplace/offers/${encodeURIComponent(offerId)}/deliver`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchShipmentAllocations(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/allocations`);
}

export async function fetchShipmentRedirectionRequests(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/redirection-requests`);
}

export async function fetchShipmentRouteHistory(shipmentId) {
  return fetchJson(`/shipments/${encodeURIComponent(shipmentId)}/route-history`);
}

export async function fetchEmergencyRescueCapacity(district = null) {
  let query = '';
  if (district) query = `?district=${encodeURIComponent(district)}`;
  return fetchJson(`/storage/rescue-capacity${query}`);
}

export async function createRescueStorageRequest(payload) {
  return fetchJson('/storage/rescue-requests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchRescueStorageRequests(facilityId = null) {
  let query = '';
  if (facilityId) query = `?facility_id=${encodeURIComponent(facilityId)}`;
  return fetchJson(`/storage/rescue-requests${query}`);
}

export async function actionRescueStorageRequest(requestId, payload) {
  return fetchJson(`/storage/rescue-requests/${encodeURIComponent(requestId)}/action`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchMarketplaceNotifications() {
  return fetchJson('/marketplace/notifications');
}

export async function markNotificationRead(notificationId) {
  return fetchJson(`/marketplace/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH'
  });
}

export async function markAllNotificationsRead() {
  return fetchJson('/marketplace/notifications/mark-all-read', {
    method: 'POST'
  });
}

export async function fetchAdminSpoilageDashboard() {
  return fetchJson('/admin/spoilage/dashboard');
}

// =============================================================
// 9. MULTIMODAL MARINE INTELLIGENCE & LOSS PREVENTION APIS
// =============================================================

export async function fetchMarineKpis() {
  return fetchJson('/marine/dashboard/kpis');
}

export async function fetchNauticalWaypoints(routeCode = null) {
  let query = '';
  if (routeCode) query = `?route_code=${encodeURIComponent(routeCode)}`;
  return fetchJson(`/marine/waypoints${query}`);
}

export async function fetchMarineShipments() {
  return fetchJson('/marine/shipments');
}

export async function fetchShippingContainers() {
  return fetchJson('/marine/containers');
}

export async function fetchContainerDetail(containerId) {
  return fetchJson(`/marine/containers/${encodeURIComponent(containerId)}`);
}

export async function fetchContainerBlackBox(containerId) {
  return fetchJson(`/marine/containers/${encodeURIComponent(containerId)}/black-box`);
}

export async function createContainerBlackBoxEvent(containerId, payload) {
  return fetchJson(`/marine/containers/${encodeURIComponent(containerId)}/events`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchContainerLocation(containerId) {
  return fetchJson(`/marine/containers/${encodeURIComponent(containerId)}/location`);
}

export async function fetchContainerLocationHistory(containerId) {
  return fetchJson(`/marine/containers/${encodeURIComponent(containerId)}/location-history`);
}

export async function fetchMultimodalLossInvestigation(shipmentId) {
  return fetchJson(`/marine/shipments/${encodeURIComponent(shipmentId)}/investigation`);
}

export async function simulateMarineWhatIf(payload) {
  return fetchJson('/marine/what-if', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function advanceContainerSimulation(containerId, stepNmi = 25.0) {
  return fetchJson(`/marine/containers/${encodeURIComponent(containerId)}/step?step_nmi=${stepNmi}`, {
    method: 'POST'
  });
}

export async function fetchTrackingProviderMetadata() {
  return fetchJson('/marine/tracking-provider/metadata');
}

export async function toggleTrackingProviderMode(mode) {
  return fetchJson(`/marine/tracking-provider/mode?mode=${encodeURIComponent(mode)}`, {
    method: 'POST'
  });
}

// =============================================================
// 10. MULTI-MODAL LOGISTICS INTELLIGENCE (ROAD + MARINE + AIR) APIS
// =============================================================

export async function planAndCompareRoutes(payload) {
  return fetchJson('/multimodal/plan-and-compare', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchMultimodalQuotes(limit = 20) {
  return fetchJson(`/multimodal/quotes?limit=${limit}`);
}

export async function fetchMultimodalQuoteDetail(quoteId) {
  return fetchJson(`/multimodal/quotes/${encodeURIComponent(quoteId)}`);
}

export async function createMultimodalBooking(payload) {
  return fetchJson('/multimodal/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchMultimodalBookings(limit = 30) {
  return fetchJson(`/multimodal/bookings?limit=${limit}`);
}

export async function fetchMultimodalBookingDetail(bookingId) {
  return fetchJson(`/multimodal/bookings/${encodeURIComponent(bookingId)}`);
}

export async function fetchMultimodalTracking(shipmentId) {
  return fetchJson(`/multimodal/tracking/${encodeURIComponent(shipmentId)}`);
}

export async function advanceMultimodalSegment(shipmentId) {
  return fetchJson(`/multimodal/tracking/${encodeURIComponent(shipmentId)}/advance-segment`, {
    method: 'POST'
  });
}

export async function fetchPincodeDirectory() {
  return fetchJson('/multimodal/pincodes');
}

export async function fetchMultimodalHubs() {
  return fetchJson('/multimodal/hubs');
}

export async function fetchTransportRateCards() {
  return fetchJson('/multimodal/rate-cards');
}

export async function updateTransportRateCard(rateId, payload) {
  return fetchJson(`/multimodal/rate-cards/${encodeURIComponent(rateId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function fetchCarrierServices() {
  return fetchJson('/multimodal/carriers');
}

// =============================================================
// 9. PHYSICAL CONSIGNMENT VERIFICATION & WORKFLOW APIS
// =============================================================

export async function createConsignmentRequest(payload) {
  return fetchJson('/consignments/request', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchConsignments(params = {}) {
  const query = new URLSearchParams();
  if (params.status_filter) query.append('status_filter', params.status_filter);
  if (params.customer_id) query.append('customer_id', params.customer_id);
  if (params.officer_id) query.append('officer_id', params.officer_id);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', params.limit);
  const qStr = query.toString();
  return fetchJson(`/consignments${qStr ? `?${qStr}` : ''}`);
}

export async function fetchConsignmentDetail(consignmentId) {
  return fetchJson(`/consignments/${encodeURIComponent(consignmentId)}`);
}

export async function submitConsignmentCorrections(consignmentId, payload) {
  return fetchJson(`/consignments/${encodeURIComponent(consignmentId)}/corrections`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function fetchVerificationOfficers(region = '') {
  const q = region ? `?region=${encodeURIComponent(region)}` : '';
  return fetchJson(`/verification/officers${q}`);
}

export async function assignVerificationOfficer(consignmentId, payload) {
  return fetchJson(`/verification/assign?consignment_id=${encodeURIComponent(consignmentId)}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function startPhysicalInspection(consignmentId) {
  return fetchJson(`/verification/consignments/${encodeURIComponent(consignmentId)}/start-inspection`, {
    method: 'POST'
  });
}

export async function submitInspectionDecision(consignmentId, payload) {
  return fetchJson(`/verification/consignments/${encodeURIComponent(consignmentId)}/submit-inspection`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchVerificationQueue(officerId = '') {
  const q = officerId ? `?officer_id=${encodeURIComponent(officerId)}` : '';
  return fetchJson(`/verification/queue${q}`);
}

export async function fetchVerificationStats() {
  return fetchJson('/verification/stats');
}

export async function bookVerifiedConsignment(consignmentId, payload) {
  return fetchJson(`/consignments/${encodeURIComponent(consignmentId)}/book`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function logisticsAcceptConsignment(consignmentId, carrierNotes = '') {
  return fetchJson(`/consignments/${encodeURIComponent(consignmentId)}/logistics-accept`, {
    method: 'POST',
    body: JSON.stringify({ carrier_notes: carrierNotes })
  });
}

export async function performDispatchReadinessCheck(consignmentId, payload) {
  return fetchJson(`/consignments/${encodeURIComponent(consignmentId)}/dispatch-readiness`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function dispatchConsignment(consignmentId, sealNumber = '') {
  return fetchJson(`/consignments/${encodeURIComponent(consignmentId)}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ seal_number: sealNumber })
  });
}

export async function updateConsignmentMilestone(consignmentId, payload) {
  return fetchJson(`/consignments/${encodeURIComponent(consignmentId)}/milestone`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminExceptionApproval(consignmentId, payload) {
  return fetchJson(`/admin/consignments/${encodeURIComponent(consignmentId)}/exception-approval`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// =============================================================
// 12. AI INTELLIGENCE, PREDICTIVE MODELS & FILE UPLOADS
// =============================================================

export async function uploadFileToServer(file, category = 'images', consignmentId = null, uploadedBy = 'System User') {
  const url = `${API_BASE_URL}/api/ai/upload/file`;
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (consignmentId) formData.append('consignment_id', consignmentId);
  if (uploadedBy) formData.append('uploaded_by', uploadedBy);

  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || `Upload failed with HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('File upload error:', err);
    throw err;
  }
}

export async function aiInspectConsignment(payload) {
  return fetchJson('/api/ai/inspect-consignment', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function predictSpoilageRisk(payload) {
  return fetchJson('/api/ai/spoilage-predict', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function generateDisputeInvestigation(payload) {
  return fetchJson('/api/ai/investigate-dispute', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchMediaCatalog() {
  return fetchJson('/api/ai/media/catalog');
}

