// API client ກາງ — ເອີ້ນ backend (http://localhost:4000)
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit & { userId?: string }): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as any) };
  // ສຳລັບ Workshop (broker) ສົ່ງ X-User-Id (MVP — ປ່ຽນເປັນ JWT ໃນ production)
  if (init?.userId) headers['X-User-Id'] = init.userId;

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
  getSavedProperties: (userId: string) =>
    request<any[]>(`/api/buyers/saved`, { userId }),
  saveProperty: (body: any, userId: string) =>
    request<any>(`/api/buyers/saved`, { method: 'POST', body: JSON.stringify(body), userId }),
  unsaveProperty: (propertyId: string, userId: string) =>
    request<any>(`/api/buyers/saved/${propertyId}`, { method: 'DELETE', userId }),
  checkDuplicate: (body: any, userId: string) =>
    request<any>(`/api/properties/check-duplicate`, { method: 'POST', body: JSON.stringify(body), userId }),
  createProperty: (body: any, userId: string) =>
    request<any>(`/api/properties`, { method: 'POST', body: JSON.stringify(body), userId }),
  foreignWizard: (body: any) =>
    request<any>(`/api/monetization/foreign-wizard`, { method: 'POST', body: JSON.stringify(body) }),
  lockQuote: (body: any) =>
    request<any>(`/api/monetization/quotes`, { method: 'POST', body: JSON.stringify(body) }),
  getMandates: (userId: string) =>
    request<any[]>(`/api/mandates`, { userId }),
  requestMandate: (body: any, userId: string) =>
    request<any>(`/api/mandates`, { method: 'POST', body: JSON.stringify(body), userId }),
  revokeMandate: (mandateId: string, userId: string) =>
    request<any>(`/api/mandates/${mandateId}/revoke`, { method: 'PATCH', userId }),
  getOwnerMandates: (userId: string) =>
    request<any[]>(`/api/owners/mandates`, { userId }),
  revokeOwnerMandate: (mandateId: string, userId: string) =>
    request<any>(`/api/owners/mandates/${mandateId}/revoke`, { method: 'POST', userId }),
  getBrokers: (userId: string) =>
    request<any[]>(`/api/mandates/brokers`, { userId }),
  getCobrokes: (userId: string) =>
    request<any[]>(`/api/mandates/cobroke`, { userId }),
  proposeCobroke: (body: any, userId: string) =>
    request<any>(`/api/mandates/cobroke`, { method: 'POST', body: JSON.stringify(body), userId }),
  acceptCobroke: (id: string, userId: string) =>
    request<any>(`/api/mandates/cobroke/${id}/accept`, { method: 'POST', userId }),
  getPipelineBoard: (userId: string) =>
    request<any>(`/api/pipeline/board`, { userId }),
  getPipelineStats: (userId: string) =>
    request<any>(`/api/pipeline/stats`, { userId }),
  createPipelineDeal: (body: any, userId: string) =>
    request<any>(`/api/pipeline`, { method: 'POST', body: JSON.stringify(body), userId }),
  movePipelineStage: (dealId: string, stage: string, userId: string) =>
    request<any>(`/api/pipeline/${dealId}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }), userId }),
  logViewing: (dealId: string, body: { lat: number; lng: number; notes?: string }, userId: string) =>
    request<any>(`/api/pipeline/${dealId}/log-viewing`, { method: 'POST', body: JSON.stringify(body), userId }),
  approveMandate: (mandateId: string, userId: string) =>
    request<any>(`/api/owners/mandates/${mandateId}/approve`, { method: 'POST', userId }),
  getOwnerProperties: (userId: string) =>
    request<any[]>(`/api/owners/properties`, { userId }),
  requestOwnerOtp: (propertyId: string, userId: string) =>
    request<any>(`/api/owners/otp/request`, { method: 'POST', body: JSON.stringify({ propertyId, purpose: 'activate_listing' }), userId }),
  verifyOwnerOtp: (body: any, userId: string) =>
    request<any>(`/api/owners/otp/verify`, { method: 'POST', body: JSON.stringify(body), userId }),
  getBuyerProfile: (userId: string) =>
    request<any>(`/api/buyers/profile`, { userId }),
  saveBuyerProfile: (body: any, userId: string) =>
    request<any>(`/api/buyers/profile`, { method: 'PUT', body: JSON.stringify(body), userId }),
  getBuyerViewings: (userId: string) =>
    request<any[]>(`/api/buyers/viewings`, { userId }),
  confirmViewing: (viewingLogId: string, userId: string) =>
    request<any>(`/api/buyers/viewings/${viewingLogId}/confirm`, { method: 'POST', userId }),
};
