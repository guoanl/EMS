const API_BASE = '/api';

export const api = {
  get token() {
    return localStorage.getItem('token');
  },
  set token(val: string | null) {
    if (val) localStorage.setItem('token', val);
    else localStorage.removeItem('token');
  },
  get user() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  set user(val: any) {
    if (val) localStorage.setItem('user', JSON.stringify(val));
    else localStorage.removeItem('user');
  },

  async request(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '请求失败');
    }
    return res.json();
  },

  login(data: any) {
    return this.request('/login', { method: 'POST', body: JSON.stringify(data) });
  },

  admin: {
    getAccounts(page: number) {
      return api.request(`/admin/accounts?page=${page}`);
    },
    getAccount(id: number) {
      return api.request(`/admin/accounts/${id}`);
    },
    createAccount(data: any) {
      return api.request('/admin/accounts', { method: 'POST', body: JSON.stringify(data) });
    },
    updateAccount(id: number, data: any) {
      return api.request(`/admin/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    resetPassword(id: number, data: any) {
      return api.request(`/admin/accounts/${id}/reset-password`, { method: 'POST', body: JSON.stringify(data) });
    },
    deleteAccount(id: number) {
      return api.request(`/admin/accounts/${id}`, { method: 'DELETE' });
    },
    getEnterprises() {
      return api.request('/admin/enterprises');
    },
    getEnterpriseDetail(id: number) {
      return api.request(`/admin/enterprises/${id}`);
    }
  },

  client: {
    getTasks() {
      return api.request('/client/tasks');
    },
    saveAll(formData: FormData) {
      return api.request('/client/save-all', { method: 'POST', body: formData });
    }
  }
};
