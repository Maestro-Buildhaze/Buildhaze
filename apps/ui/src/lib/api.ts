const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

function getToken(): string | null {
  // Check for admin shadow access token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const adminToken = urlParams.get('adminToken');
  if (adminToken) {
    return adminToken;
  }
  return localStorage.getItem('cms_token');
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

export interface ClientProfile {
  id: string;
  email: string;
  businessName: string;
  slug: string;
  plan: string;
  domain: string | null;
  lastPublishedAt: string | null;
  createdAt: string;
  template?: { id: string; name: string; slug: string; niche: string } | null;
}

export interface SiteConfig {
  [key: string]: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  clientId: string;
  slug: string;
  title: string;
  sections: Section[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  type: string;
  data: Record<string, unknown>;
  visible?: boolean;
}

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  r2Key: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  createdAt: string;
}

export const api = {
  // Generic methods (axios-style)
  get: async (path: string) => {
    const data = await request<any>(path);
    return { data };
  },
  post: async (path: string, body?: any) => {
    const data = await request<any>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  put: async (path: string, body?: any) => {
    const data = await request<any>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  del: async (path: string) => {
    const data = await request<any>(path, { method: 'DELETE' });
    return { data };
  },

  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; client: ClientProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<ClientProfile>('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  config: {
    get: () => request<SiteConfig>('/config'),
    save: (data: SiteConfig) =>
      request<{ success: boolean }>('/config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  blog: {
    list: () => request<BlogPost[]>('/blog'),
    get: (id: string) => request<BlogPost>(`/blog/${id}`),
    create: (data: Partial<BlogPost>) =>
      request<BlogPost>('/blog', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<BlogPost>) =>
      request<BlogPost>(`/blog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/blog/${id}`, { method: 'DELETE' }),
  },

  pages: {
    list: () => request<Page[]>('/pages'),
    get: (slug: string) => request<Page>(`/pages/${slug}`),
    update: (slug: string, data: Partial<Page>) =>
      request<Page>(`/pages/${slug}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  media: {
    list: () => request<MediaFile[]>('/media'),
    upload: async (file: File): Promise<MediaFile> => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    delete: (id: string) =>
      request<{ success: boolean }>(`/media/${id}`, { method: 'DELETE' }),
  },

  publish: {
    deploy: () =>
      request<{ success: boolean; publishedAt: string }>('/publish', { method: 'POST' }),
  },

  admin: {
    // Templates
    getTemplates: () => request<any[]>('/admin/templates'),
    getTemplate: (id: string) => request<any>(`/admin/templates/${id}`),
    createTemplate: (data: { name: string; slug: string; niche: string; description?: string; r2Key: string; thumbnail?: string }) =>
      request<any>('/admin/templates', { method: 'POST', body: JSON.stringify(data) }),
    deleteTemplate: (id: string) =>
      request<{ success: boolean }>(`/admin/templates/${id}`, { method: 'DELETE' }),
    uploadTemplateFiles: async (formData: FormData, onProgress?: (progress: number) => void): Promise<{ success: boolean; r2Key: string }> => {
      const token = getToken();
      // Use XMLHttpRequest for progress tracking
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

    // Clients
    getClients: () => request<any[]>('/admin/clients'),
    getClient: (id: string) => request<any>(`/admin/clients/${id}`),
    createClient: (data: { email: string; password: string; businessName: string; templateId?: string; domain?: string; plan?: string }) =>
      request<any>('/admin/clients', { method: 'POST', body: JSON.stringify(data) }),
    updateClient: (id: string, data: Partial<{ email: string; password?: string; businessName: string; templateId: string | null; domain: string | null; plan: string; isActive: boolean }>) =>
      request<any>(`/admin/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteClient: (id: string) =>
      request<{ success: boolean }>(`/admin/clients/${id}`, { method: 'DELETE' }),
    publishClient: (id: string) =>
      request<{ success: boolean; publishedAt: string }>(`/admin/clients/${id}/publish`, { method: 'POST' }),

    // Client details (shadow access)
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
        body: JSON.stringify({ configs }),
      }),
  },

  // Site management (CMS Dashboard)
  site: {
    getData: (clientId: string) => request<any>(`/site/${clientId}/data`),
    saveConfig: (clientId: string, key: string, value: any, type?: string, jsonValue?: any) =>
      request<any>(`/site/${clientId}/config`, {
        method: 'POST',
        body: JSON.stringify({ key, value, type, jsonValue }),
      }),
    saveConfigBatch: (clientId: string, configs: { key: string; value: any; type?: string; jsonValue?: any }[]) =>
      request<any>(`/site/${clientId}/config/batch`, {
        method: 'POST',
        body: JSON.stringify({ configs }),
      }),
    getStatistics: (clientId: string) => request<any>(`/site/${clientId}/statistics`),
    getPublishHistory: (clientId: string, limit?: number) =>
      request<any>(`/site/${clientId}/publish-history${limit ? `?limit=${limit}` : ''}`),
    deleteConfig: (clientId: string, key: string) =>
      request<{ success: boolean }>(`/site/${clientId}/config/${key}`, { method: 'DELETE' }),
  },

  // Template schema
  templateSchema: {
    get: (templateId: string) => request<any>(`/template-schema/${templateId}`),
    update: (templateId: string, data: any) =>
      request<any>(`/template-schema/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    regenerate: (templateId: string) =>
      request<any>(`/template-schema/${templateId}/regenerate`, { method: 'POST' }),
  },
};
