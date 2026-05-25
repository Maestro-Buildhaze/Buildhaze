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
import { CMSDashboard } from './pages/CMSDashboard';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
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
                <Route path="/cms/:clientId/*" element={<CMSDashboard />} />
              </Routes>
            </Shell>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
