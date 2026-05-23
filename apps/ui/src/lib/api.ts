const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

function getToken(): string | null {
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
};
