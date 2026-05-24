import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminShell } from './pages/AdminShell';
import { Templates } from './pages/Templates';
import { Clients } from './pages/Clients';
import { Login } from './pages/Login';
import { isLoggedIn } from './lib/auth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AdminShell>
              <Routes>
                <Route path="/" element={<Navigate to="/clients" replace />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/clients" element={<Clients />} />
              </Routes>
            </AdminShell>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
