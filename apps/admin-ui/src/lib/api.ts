const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') + '/api';

function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  admin: {
    getTemplates: () => request<any[]>('/admin/templates'),
    createTemplate: (data: any) =>
      request<any>('/admin/templates', { method: 'POST', body: JSON.stringify(data) }),
    deleteTemplate: (id: string) =>
      request<{ success: boolean }>(`/admin/templates/${id}`, { method: 'DELETE' }),
    regenerateTemplateSchema: (id: string) =>
      request<{ success: boolean; schema: any; pagesDetected: number; sectionsDetected: number }>(`/admin/templates/${id}/regenerate-schema`, { method: 'POST' }),
    uploadTemplateFiles: async (formData: FormData, onProgress?: (progress: number) => void): Promise<{ success: boolean; r2Key: string }> => {
      const token = getToken();
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE}/admin/templates/upload`, true);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    },

    getClients: () => request<any[]>('/admin/clients'),
    getClient: (id: string) => request<any>(`/admin/clients/${id}`),
    getClientDetails: (id: string) => request<any>(`/admin/clients/${id}/details`),
    getClientStats: (id: string) => request<any>(`/admin/clients/${id}/stats`),
    getClientPublishHistory: (id: string, limit?: number) => 
      request<any>(`/admin/clients/${id}/publish-history${limit ? `?limit=${limit}` : ''}`),
    getClientBlogPosts: (id: string) => request<any[]>(`/admin/clients/${id}/blog-posts`),
    getClientMedia: (id: string) => request<any[]>(`/admin/clients/${id}/media`),
    getClientConfig: (id: string) => request<any>(`/admin/clients/${id}/config`),
    updateClientConfig: (id: string, configs: { key: string; value: any; type?: string; jsonValue?: any }[]) =>
      request<any>(`/admin/clients/${id}/config`, { 
        method: 'POST', 
        body: JSON.stringify({ configs }) 
      }),
    createClient: (data: any) =>
      request<any>('/admin/clients', { method: 'POST', body: JSON.stringify(data) }),
    updateClient: (id: string, data: any) =>
      request<any>(`/admin/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteClient: (id: string) =>
      request<{ success: boolean }>(`/admin/clients/${id}`, { method: 'DELETE' }),
    publishClient: (id: string) =>
      request<{ success: boolean; publishedAt: string }>(`/admin/clients/${id}/publish`, { method: 'POST' }),
    regenerateClientPages: (id: string) =>
      request<{ success: boolean; pagesCreated: number; sectionsCreated: number }>(`/admin/clients/${id}/regenerate-pages`, { method: 'POST' }),
    detectTemplateSchema: (id: string) =>
      request<{ success: boolean; pagesDetected: number; sectionsDetected: number; fieldsDetected: number }>(`/admin/templates/${id}/detect-schema`, { method: 'POST' }),
    getTemplate: (id: string) =>
      request<any>(`/admin/templates/${id}`),
    getTemplateSchema: (id: string) =>
      request<any>(`/template-schema/${id}`),
  },
};
