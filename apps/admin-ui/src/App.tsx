import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AdminShell } from './pages/AdminShell';
import { Dashboard } from './pages/Dashboard';
import { Templates } from './pages/Templates';
import { Clients } from './pages/Clients';
import { ClientDetails } from './pages/ClientDetails';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { isLoggedIn } from './lib/auth';
// Admin Features
import { AnalyticsDashboard } from './pages/admin/AnalyticsDashboard';
import { SystemHealth } from './pages/admin/SystemHealth';
import { ActivityLogs } from './pages/admin/ActivityLogs';
import { BackupManager } from './pages/admin/BackupManager';
import { BulkOperations } from './pages/admin/BulkOperations';
import { DomainManager } from './pages/admin/DomainManager';
import { BillingDashboard } from './pages/admin/BillingDashboard';
import { QuotaManager } from './pages/admin/QuotaManager';
import { TemplateVersions } from './pages/admin/TemplateVersions';
import { EmailTemplates } from './pages/admin/EmailTemplates';
import { MaintenanceMode } from './pages/admin/MaintenanceMode';
import { ExportCenter } from './pages/admin/ExportCenter';
import { SEOGlobal } from './pages/admin/SEOGlobal';

function PrivateRoute() {
  return isLoggedIn() ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route element={<AdminShell><Outlet /></AdminShell>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetails />} />
          <Route path="/settings" element={<Settings />} />
          {/* Admin Features */}
          <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
          <Route path="/admin/health" element={<SystemHealth />} />
          <Route path="/admin/activity-logs" element={<ActivityLogs />} />
          <Route path="/admin/backups" element={<BackupManager />} />
          <Route path="/admin/bulk-ops" element={<BulkOperations />} />
          <Route path="/admin/domains" element={<DomainManager />} />
          <Route path="/admin/billing" element={<BillingDashboard />} />
          <Route path="/admin/quotas" element={<QuotaManager />} />
          <Route path="/admin/template-versions/:templateId?" element={<TemplateVersions />} />
          <Route path="/admin/email-templates" element={<EmailTemplates />} />
          <Route path="/admin/maintenance" element={<MaintenanceMode />} />
          <Route path="/admin/exports" element={<ExportCenter />} />
          <Route path="/admin/seo" element={<SEOGlobal />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
