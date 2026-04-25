import { Navigate, useLocation } from 'react-router-dom';

export default function RoleRoute({ user, allow = [], children }) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allow.length > 0 && !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
