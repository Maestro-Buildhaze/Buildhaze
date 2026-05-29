import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { isLoggedIn, saveSession } from './lib/auth';
import { api } from './lib/api';
import { Login } from './pages/Login';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { SiteEditor } from './pages/SiteEditor';
import { BlogList } from './pages/BlogList';
import { BlogEditor } from './pages/BlogEditor';
import { MediaLibrary } from './pages/MediaLibrary';
import { Settings } from './pages/Settings';
import { CMSDashboard } from './pages/CMSDashboard';
import { DomainSettings } from './pages/DomainSettings';

function GhostLoginHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminToken = params.get('adminToken');
    if (adminToken && !isLoggedIn()) {
      // Save the admin token as the session token and fetch profile
      localStorage.setItem('cms_token', adminToken);
      api.auth.me().then((client) => {
        saveSession(adminToken, client);
        // Clean URL
        window.history.replaceState({}, '', '/');
        navigate('/', { replace: true });
      }).catch(() => {
        localStorage.removeItem('cms_token');
        navigate('/login', { replace: true });
      });
    }
  }, [navigate]);
  return null;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const params = new URLSearchParams(window.location.search);
  const hasAdminToken = params.has('adminToken');
  return (isLoggedIn() || hasAdminToken) ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <GhostLoginHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
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
                  <Route path="/domain" element={<DomainSettings />} />
                  <Route path="/cms/:clientId/*" element={<CMSDashboard />} />
                </Routes>
              </Shell>
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}
