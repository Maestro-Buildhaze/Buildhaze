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

    // Admin Features - 14 new APIs
    // 1. Global Analytics
    getAnalyticsDashboard: () => request<any>('/admin/analytics/dashboard'),
    refreshAnalytics: () => request<any>('/admin/analytics/refresh', { method: 'POST' }),

    // 2. System Health
    getSystemHealth: () => request<any>('/admin/health'),

    // 3. Activity Logs
    getActivityLogs: (params?: { actor?: string; action?: string; page?: number; limit?: number }) =>
      request<any>(`/admin/activity-logs?${new URLSearchParams(params as any).toString()}`),

    // 4. Backups
    getBackups: (page = 1, limit = 20) =>
      request<any>(`/admin/backups?page=${page}&limit=${limit}`),
    createBackup: (name?: string, tables?: string[]) =>
      request<any>('/admin/backups/create', { method: 'POST', body: JSON.stringify({ name, tables }) }),
    restoreBackup: (id: string) =>
      request<any>(`/admin/backups/${id}/restore`, { method: 'POST' }),
    deleteBackup: (id: string) =>
      request<any>(`/admin/backups/${id}`, { method: 'DELETE' }),

    // 5. Bulk Operations
    bulkClientOperation: (clientIds: string[], operation: string, plan?: string) =>
      request<any>('/admin/bulk/clients', { method: 'POST', body: JSON.stringify({ clientIds, operation, plan }) }),

    // 6. Custom Domains
    getDomains: (status?: string, page = 1, limit = 20) =>
      request<any>(`/admin/domains?${status ? `status=${status}&` : ''}page=${page}&limit=${limit}`),
    getSSLExpiringDomains: () =>
      request<any>('/admin/domains/ssl-expiring'),
    verifyDomainDNS: (id: string) =>
      request<any>(`/admin/domains/${id}/verify-dns`, { method: 'POST' }),
    renewDomainSSL: (id: string) =>
      request<any>(`/admin/domains/${id}/renew-ssl`, { method: 'POST' }),

    // 7. Client Impersonate
    impersonateClient: (clientId: string) =>
      request<any>(`/admin/impersonate/${clientId}`, { method: 'POST' }),

    // 8. Billing
    getSubscriptions: (status?: string, page = 1, limit = 20) =>
      request<any>(`/admin/billing/subscriptions?${status ? `status=${status}&` : ''}page=${page}&limit=${limit}`),
    getInvoices: (status?: string, clientId?: string, page = 1, limit = 20) =>
      request<any>(`/admin/billing/invoices?${status ? `status=${status}&` : ''}${clientId ? `clientId=${clientId}&` : ''}page=${page}&limit=${limit}`),
    createInvoice: (clientId: string, amount: number, description: string, dueDate?: string) =>
      request<any>('/admin/billing/invoices', { method: 'POST', body: JSON.stringify({ clientId, amount, description, dueDate }) }),
    changeClientPlan: (clientId: string, plan: string, priceMonthly?: number, priceYearly?: number) =>
      request<any>('/admin/billing/change-plan', { method: 'POST', body: JSON.stringify({ clientId, plan, priceMonthly, priceYearly }) }),

    // 9. Quotas
    getQuotas: (clientId?: string) =>
      request<any>(`/admin/quotas${clientId ? `?clientId=${clientId}` : ''}`),
    recalculateQuota: (clientId: string) =>
      request<any>('/admin/quotas/recalculate', { method: 'POST', body: JSON.stringify({ clientId }) }),
    updateQuotaLimits: (clientId: string, limits: any) =>
      request<any>('/admin/quotas/update-limits', { method: 'POST', body: JSON.stringify({ clientId, limits }) }),

    // 10. Template Versions
    getTemplateVersions: (templateId: string) =>
      request<any>(`/admin/templates/${templateId}/versions`),
    createTemplateVersion: (templateId: string, name: string, description?: string) =>
      request<any>(`/admin/templates/${templateId}/versions`, { method: 'POST', body: JSON.stringify({ name, description }) }),
    rollbackTemplateVersion: (templateId: string, versionId: string) =>
      request<any>(`/admin/templates/${templateId}/versions/${versionId}/rollback`, { method: 'POST' }),

    // 11. Email Templates
    getEmailTemplates: () =>
      request<any>('/admin/email-templates'),
    getEmailTemplate: (key: string) =>
      request<any>(`/admin/email-templates/${key}`),
    updateEmailTemplate: (key: string, data: any) =>
      request<any>(`/admin/email-templates/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
    sendTestEmail: (key: string, toEmail: string, variables?: any) =>
      request<any>(`/admin/email-templates/${key}/send-test`, { method: 'POST', body: JSON.stringify({ toEmail, variables }) }),

    // 12. Maintenance Mode
    getMaintenanceMode: () =>
      request<any>('/admin/maintenance-mode'),
    updateMaintenanceMode: (settings: any) =>
      request<any>('/admin/maintenance-mode', { method: 'PUT', body: JSON.stringify(settings) }),

    // 13. Export Center
    getExports: (status?: string, page = 1, limit = 20) =>
      request<any>(`/admin/exports?${status ? `status=${status}&` : ''}page=${page}&limit=${limit}`),
    createExport: (type: string, format: string, filters?: any) =>
      request<any>('/admin/exports', { method: 'POST', body: JSON.stringify({ type, format, filters }) }),
    downloadExport: (id: string) =>
      request<any>(`/admin/exports/${id}/download`),

    // 14. SEO Global
    getSEOGlobal: (page = 1, limit = 20) =>
      request<any>(`/admin/seo-global?page=${page}&limit=${limit}`),
    getClientSEO: (clientId: string) =>
      request<any>(`/admin/seo-global/${clientId}`),
    updateClientSEO: (clientId: string, seo: any) =>
      request<any>(`/admin/seo-global/${clientId}`, { method: 'PUT', body: JSON.stringify(seo) }),
  },
};
