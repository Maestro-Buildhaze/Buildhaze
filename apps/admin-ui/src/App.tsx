import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AdminShell } from './pages/AdminShell';
import { Dashboard } from './pages/Dashboard';
import { Templates } from './pages/Templates';
import { Clients } from './pages/Clients';
import { ClientDetails } from './pages/ClientDetails';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { isLoggedIn } from './lib/auth';

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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
