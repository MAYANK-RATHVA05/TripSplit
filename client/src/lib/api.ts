const API_BASE = '/api/v1';

export function getStoredToken(): string | null {
  return localStorage.getItem('tripsplit_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('tripsplit_token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem('tripsplit_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set Content-Type to application/json if not sending FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If unauthorized, clear token if expired
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      removeStoredToken();
    }
  }

  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response.text() as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'A network error occurred. Please try again.');
  }

  return data;
}

export const api = {
  auth: {
    register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    me: () => request<any>('/auth/me')
  },
  groups: {
    list: () => request<any>('/groups'),
    create: (body: any) => request<any>('/groups', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request<any>(`/groups/${id}`),
    update: (id: string, body: any) => request<any>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    exportCSVUrl: (id: string) => `${API_BASE}/groups/${id}/export`
  },
  members: {
    addGuest: (groupId: string, name: string) =>
      request<any>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ name }) }),
    createInvite: (groupId: string, memberId?: string) =>
      request<any>(`/groups/${groupId}/invitations`, { method: 'POST', body: JSON.stringify({ memberId }) }),
    claimInvite: (token: string) =>
      request<any>(`/groups/invitations/${token}/claim`, { method: 'POST' })
  },
  expenses: {
    list: (groupId: string, params: Record<string, string> = {}) => {
      const search = new URLSearchParams(params).toString();
      return request<any>(`/groups/${groupId}/expenses${search ? `?${search}` : ''}`);
    },
    create: (groupId: string, formData: FormData) =>
      request<any>(`/groups/${groupId}/expenses`, { method: 'POST', body: formData }),
    get: (groupId: string, expenseId: string) =>
      request<any>(`/groups/${groupId}/expenses/${expenseId}`),
    update: (groupId: string, expenseId: string, body: any) =>
      request<any>(`/groups/${groupId}/expenses/${expenseId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    void: (groupId: string, expenseId: string) =>
      request<any>(`/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' })
  },
  balances: {
    get: (groupId: string) => request<any>(`/groups/${groupId}/balances`),
    explain: (groupId: string, memberId: string) =>
      request<any>(`/groups/${groupId}/balances/${memberId}/explain`)
  },
  settlements: {
    list: (groupId: string) => request<any>(`/groups/${groupId}/settlements`),
    record: (groupId: string, body: any) =>
      request<any>(`/groups/${groupId}/settlements`, { method: 'POST', body: JSON.stringify(body) }),
    reverse: (groupId: string, settlementId: string) =>
      request<any>(`/groups/${groupId}/settlements/${settlementId}/reverse`, { method: 'POST' })
  },
  analytics: {
    get: (groupId: string, params: Record<string, string> = {}) => {
      const search = new URLSearchParams(params).toString();
      return request<any>(`/groups/${groupId}/analytics${search ? `?${search}` : ''}`);
    }
  },
  activity: {
    list: (groupId: string) => request<any>(`/groups/${groupId}/activity`)
  },
  currencies: {
    list: () => request<any>('/currencies')
  }
};
