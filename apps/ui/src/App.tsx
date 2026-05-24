import { Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/auth';
import { Login } from './pages/Login';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { SiteEditor } from './pages/SiteEditor';
import { BlogList } from './pages/BlogList';
import { BlogEditor } from './pages/BlogEditor';
import { MediaLibrary } from './pages/MediaLibrary';
import { Settings } from './pages/Settings';

// Admin Dashboard
import { AdminShell } from './pages/admin/AdminShell';
import { Templates } from './pages/admin/Templates';
import { Clients } from './pages/admin/Clients';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Admin Dashboard Routes */}
      <Route
        path="/admin/*"
        element={
          <PrivateRoute>
            <AdminShell>
              <Routes>
                <Route path="/" element={<div className="p-8"><h1 className="text-2xl font-bold">Admin Dashboard</h1><p>Selectează o opțiune din sidebar</p></div>} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/clients" element={<Clients />} />
              </Routes>
            </AdminShell>
          </PrivateRoute>
        }
      />
      
      {/* Client CMS Routes */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Shell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/site" element={<SiteEditor />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/new" element={<BlogEditor />} />
                <Route path="/blog/:id" element={<BlogEditor />} />
                <Route path="/media" element={<MediaLibrary />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Shell>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
