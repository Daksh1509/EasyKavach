import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const workerService = {
  register: (data) => apiClient.post('/workers/register', data),
  listWorkers: () => apiClient.get('/workers'),
  getProfile: (id) => apiClient.get(`/workers/${id}`),
  updateStatus: (id, isOnline) => apiClient.patch(`/workers/${id}`, { is_online: isOnline }),
  listZones: () => apiClient.get('/workers/zones/list'),
};

export const policyService = {
  quote: (data) => apiClient.post('/policies/quote', data),
  create: (workerId) => apiClient.post(`/policies/create?worker_id=${workerId}`),
  getWorkerPolicies: (workerId) => apiClient.get(`/policies/worker/${workerId}`),
};

export const claimService = {
  list: (status) => apiClient.get('/claims', { params: { status } }),
  getWorkerClaims: (workerId) => apiClient.get(`/claims/worker/${workerId}`),
};

export const payoutService = {
  list: () => apiClient.get('/payouts'),
  getWorkerPayouts: (workerId) => apiClient.get(`/payouts/worker/${workerId}`),
};

export const analyticsService = {
  getInsurerOverview: () => apiClient.get('/analytics/insurer/overview'),
  getWorkerDashboard: (workerId) => apiClient.get(`/analytics/worker/${workerId}`),
};

export const triggerService = {
  checkNow: (zoneId) => apiClient.post('/triggers/check-now', null, { params: { zone_id: zoneId } }),
  listEvents: () => apiClient.get('/triggers/events'),
};

export default apiClient;
