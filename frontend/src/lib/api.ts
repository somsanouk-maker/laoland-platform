// API client — calls backend, injects JWT from localStorage automatically
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('laoland_token');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'request failed'), { status: res.status, data });
  return data as T;
}

export const api = {
  getMarketStats: () => request<any>(`/api/properties/market-stats`),
  searchProperties: (qs: string) => request<any[]>(`/api/properties?${qs}`),
  getProperty: (id: string) => request<any>(`/api/properties/${id}`),
  inquireProperty: (id: string, body: any) =>
    request<any>(`/api/properties/${id}/inquire`, { method: 'POST', body: JSON.stringify(body) }),
  getPropertyBrokers: (id: string) =>
    request<any[]>(`/api/properties/${id}/brokers`),
  getSavedProperties: () =>
    request<any[]>(`/api/buyers/saved`),
  saveProperty: (body: any) =>
    request<any>(`/api/buyers/saved`, { method: 'POST', body: JSON.stringify(body) }),
  unsaveProperty: (propertyId: string) =>
    request<any>(`/api/buyers/saved/${propertyId}`, { method: 'DELETE' }),
  checkDuplicate: (body: any) =>
    request<any>(`/api/properties/check-duplicate`, { method: 'POST', body: JSON.stringify(body) }),
  createProperty: (body: any) =>
    request<any>(`/api/properties`, { method: 'POST', body: JSON.stringify(body) }),
  foreignWizard: (body: any) =>
    request<any>(`/api/monetization/foreign-wizard`, { method: 'POST', body: JSON.stringify(body) }),
  lockQuote: (body: any) =>
    request<any>(`/api/monetization/quotes`, { method: 'POST', body: JSON.stringify(body) }),
  getMandates: () =>
    request<any[]>(`/api/mandates`),
  requestMandate: (body: any) =>
    request<any>(`/api/mandates`, { method: 'POST', body: JSON.stringify(body) }),
  revokeMandate: (mandateId: string) =>
    request<any>(`/api/mandates/${mandateId}/renounce`, { method: 'PATCH' }),
  getOwnerMandates: () =>
    request<any[]>(`/api/owners/mandates`),
  revokeOwnerMandate: (mandateId: string) =>
    request<any>(`/api/owners/mandates/${mandateId}/revoke`, { method: 'POST' }),
  approveMandate: (mandateId: string) =>
    request<any>(`/api/owners/mandates/${mandateId}/approve`, { method: 'POST' }),
  getBrokers: () =>
    request<any[]>(`/api/mandates/brokers`),
  getCobrokes: () =>
    request<any[]>(`/api/mandates/cobroke`),
  proposeCobroke: (body: any) =>
    request<any>(`/api/mandates/cobroke`, { method: 'POST', body: JSON.stringify(body) }),
  acceptCobroke: (id: string) =>
    request<any>(`/api/mandates/cobroke/${id}/accept`, { method: 'POST' }),
  getPipelineBoard: () =>
    request<any>(`/api/pipeline/board`),
  getPipelineStats: () =>
    request<any>(`/api/pipeline/stats`),
  createPipelineDeal: (body: any) =>
    request<any>(`/api/pipeline`, { method: 'POST', body: JSON.stringify(body) }),
  movePipelineStage: (dealId: string, stage: string) =>
    request<any>(`/api/pipeline/${dealId}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  logViewing: (dealId: string, body: { lat: number; lng: number; notes?: string }) =>
    request<any>(`/api/pipeline/${dealId}/log-viewing`, { method: 'POST', body: JSON.stringify(body) }),
  getOwnerProperties: () =>
    request<any[]>(`/api/owners/properties`),
  requestOwnerOtp: (propertyId: string) =>
    request<any>(`/api/owners/otp/request`, { method: 'POST', body: JSON.stringify({ propertyId, purpose: 'activate_listing' }) }),
  verifyOwnerOtp: (body: any) =>
    request<any>(`/api/owners/otp/verify`, { method: 'POST', body: JSON.stringify(body) }),
  getBuyerProfile: () =>
    request<any>(`/api/buyers/profile`),
  saveBuyerProfile: (body: any) =>
    request<any>(`/api/buyers/profile`, { method: 'PUT', body: JSON.stringify(body) }),
  getBuyerViewings: () =>
    request<any[]>(`/api/buyers/viewings`),
  confirmViewing: (viewingLogId: string) =>
    request<any>(`/api/buyers/viewings/${viewingLogId}/confirm`, { method: 'POST' }),
  // Admin
  adminGetUsers: () => request<any[]>(`/api/admin/users`),
  adminDeactivateUser: (id: string) => request<any>(`/api/admin/users/${id}/deactivate`, { method: 'PATCH' }),
  adminActivateUser: (id: string) => request<any>(`/api/admin/users/${id}/activate`, { method: 'PATCH' }),
  adminGetProperties: (offset = 0) => request<any[]>(`/api/admin/properties?limit=50&offset=${offset}`),
  adminGetMandates: (offset = 0) => request<any[]>(`/api/admin/mandates?limit=50&offset=${offset}`),
  adminGetAuditLog: (offset = 0) => request<any[]>(`/api/admin/audit-log?limit=50&offset=${offset}`),
  editProperty: (id: string, body: any) =>
    request<any>(`/api/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  markPropertySold: (id: string) => request<any>(`/api/properties/${id}/sold`, { method: 'POST' }),
  archiveProperty: (id: string) => request<any>(`/api/properties/${id}/archive`, { method: 'POST' }),
};
