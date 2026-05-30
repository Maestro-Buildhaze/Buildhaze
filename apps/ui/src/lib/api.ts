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

export interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  _count?: { posts: number };
}

export interface Author {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  role?: string | null;
  bio?: string | null;
  socialLinks?: Record<string, string>;
  _count?: { posts: number };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  
  // Category & Author
  categoryId?: string | null;
  category?: Category | null;
  authorId?: string | null;
  author?: Author | null;
  
  // Metadata
  readTime?: number | null;
  isPublished: boolean;
  isFeatured?: boolean;
  publishedAt?: string | null;
  
  // SEO
  metaTitle?: string | null;
  metaDesc?: string | null;
  
  // Rich content
  bullets?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
  
  // Stats
  viewCount?: number;
  
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

export interface Field {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'link' | 'richtext';
  selector: string;
  attribute: string;
  value: string;
}

export interface Section {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  fields: Field[];
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
    list: (params?: { category?: string; author?: string; status?: string; featured?: boolean; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.category) query.append('category', params.category);
      if (params?.author) query.append('author', params.author);
      if (params?.status) query.append('status', params.status);
      if (params?.featured) query.append('featured', 'true');
      if (params?.search) query.append('search', params.search);
      return request<BlogPost[]>(`/blog?${query.toString()}`);
    },
    get: (id: string) => request<BlogPost>(`/blog/${id}`),
    create: (data: Partial<BlogPost>) =>
      request<BlogPost>('/blog', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<BlogPost>) =>
      request<BlogPost>(`/blog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/blog/${id}`, { method: 'DELETE' }),
    
    // Categories
    categories: {
      list: () => request<Category[]>('/blog/categories/list'),
      create: (data: { name: string; slug?: string; color?: string }) =>
        request<Category>('/blog/categories', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Category>) =>
        request<Category>(`/blog/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<{ success: boolean }>(`/blog/categories/${id}`, { method: 'DELETE' }),
    },
    
    // Authors
    authors: {
      list: () => request<Author[]>('/blog/authors/list'),
      get: (id: string) => request<Author>(`/blog/authors/${id}`),
      create: (data: { name: string; email?: string; avatar?: string; role?: string; bio?: string }) =>
        request<Author>('/blog/authors', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Author>) =>
        request<Author>(`/blog/authors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<{ success: boolean }>(`/blog/authors/${id}`, { method: 'DELETE' }),
    },
    
    // Stats
    stats: () => request<{
      totalPosts: number;
      publishedPosts: number;
      draftPosts: number;
      totalCategories: number;
      totalAuthors: number;
      featuredPosts: number;
    }>('/blog/stats/overview'),
    
    // Bulk operations
    bulkPublish: (ids: string[]) =>
      request<{ success: boolean; count: number }>('/blog/bulk/publish', { method: 'POST', body: JSON.stringify({ ids }) }),
    bulkUnpublish: (ids: string[]) =>
      request<{ success: boolean; count: number }>('/blog/bulk/unpublish', { method: 'POST', body: JSON.stringify({ ids }) }),
    bulkDelete: (ids: string[]) =>
      request<{ success: boolean; count: number }>('/blog/bulk/delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  pages: {
    list: () => request<Page[]>('/pages'),
    get: (slug: string) => request<Page>(`/pages/${slug}`),
    update: (slug: string, data: Partial<Page>) =>
      request<Page>(`/pages/${slug}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateSections: (slug: string, sections: Section[]) =>
      request<Page>(`/pages/${slug}/sections`, { method: 'PUT', body: JSON.stringify({ sections }) }),
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

  analytics: {
    get: (days = 30) => request<any>(`/analytics?days=${days}`),
  },

  ai: {
    getCredits: () => request<any>('/ai/credits'),
    generateBlog: (data: { topic: string; tone?: string; keywords?: string; niche?: string }) =>
      request<any>('/ai/generate-blog', { method: 'POST', body: JSON.stringify(data) }),
    getNicheNews: () => request<any>('/ai/niche-news', { method: 'POST', body: JSON.stringify({}) }),
    getSuggestions: () => request<any>('/ai/suggestions', { method: 'POST', body: JSON.stringify({}) }),
  },

  domain: {
    get: () => request<any>('/domain'),
    connect: (domain: string) => request<any>('/domain/connect', { method: 'POST', body: JSON.stringify({ domain }) }),
    verify: () => request<any>('/domain/verify'),
    disconnect: () => request<any>('/domain', { method: 'DELETE' }),
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

  // News (real news scraping + AI summaries)
  news: {
    get: (force?: boolean) => request<{ news: any[]; fromCache: boolean; count?: number; countries?: string[] }>(`/news${force ? '?force=true' : ''}`),
    delete: (id: string) => request<{ success: boolean }>(`/news/${id}`, { method: 'DELETE' }),
    createBlogFromNews: (newsId: string) => request<{ success: boolean; blog: any }>(`/news/auto-blog`, {
      method: 'POST',
      body: JSON.stringify({ newsId }),
    }),
    postToSite: (newsId: string) => request<{ success: boolean; news: any }>(`/news/post-to-site`, {
      method: 'POST',
      body: JSON.stringify({ newsId }),
    }),
    getCountries: () => request<{ countries: { code: string; name: string; flag: string }[] }>(`/news/countries`),
    selectCountries: (countries: string[]) => request<{ success: boolean; countries: string[] }>(`/news/select-countries`, {
      method: 'POST',
      body: JSON.stringify({ countries }),
    }),
  },
};
