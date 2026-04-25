import { useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../App';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';
import AdminPage from '../pages/AdminPage';
import ComplaintsPage from '../pages/ComplaintsPage';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import SubmitPage from '../pages/SubmitPage';
import TrackPage from '../pages/TrackPage';

export default function AppRoutes() {
  const { user, booting, logout } = useContext(AuthContext);

  if (booting) {
    return <div className="min-h-screen grid place-items-center font-mono text-sm">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute user={user}>
            <AppLayout user={user} onLogout={logout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="track" element={<TrackPage />} />
        <Route
          path="admin"
          element={
            <RoleRoute user={user} allow={['admin']}>
              <AdminPage />
            </RoleRoute>
          }
        />

        <Route
          path="submit"
          element={
            <RoleRoute user={user} allow={['citizen']}>
              <SubmitPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
