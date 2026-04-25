import { createContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AppRoutes from './routes/AppRoutes';
import api from './services/api';
import { clearAuth, getStoredToken, getStoredUser, setAuthSession } from './services/auth';

export const AuthContext = createContext(null);

export default function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const boot = async () => {
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        clearAuth();
        setToken('');
        setUser(null);
      } finally {
        setBooting(false);
      }
    };

    boot();
  }, [token]);

  const login = async (payload, mode = 'login') => {
    const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
    const { data } = await api.post(endpoint, payload);

    setAuthSession(data.token, data.user, payload.rememberMe !== false);
    setToken(data.token);
    setUser(data.user);
    toast.success(mode === 'register' ? 'Account created' : 'Signed in');
    navigate('/dashboard');
  };

  const logout = () => {
    clearAuth();
    setToken('');
    setUser(null);
    navigate('/login');
    toast.info('Logged out');
  };

  const value = useMemo(
    () => ({ token, user, booting, login, logout, setUser }),
    [token, user, booting]
  );

  return <AuthContext.Provider value={value}><AppRoutes /></AuthContext.Provider>;
}
