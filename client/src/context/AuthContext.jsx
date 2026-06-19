import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser } from '../services/api';

const AuthContext = createContext();

// Default super admin ma'lumotlari (backend ishlamaganda ishlatiladi)
const DEFAULT_ADMIN = {
  email: 'admin@yecgilam.uz',
  password: 'admin123',
  userData: {
    id: 1,
    name: 'Administrator',
    email: 'admin@yecgilam.uz',
    role: 'admin',
    branch_id: 1,
    branch_name: 'Bosh Showroom'
  },
  token: 'default-admin-token-yec-gilam-2024'
};

const DEFAULT_SELLER = {
  email: 'seller@yecgilam.uz',
  password: 'password123',
  userData: {
    id: 2,
    name: 'Sotuvchi Test',
    email: 'seller@yecgilam.uz',
    role: 'seller',
    branch_id: 1,
    branch_name: 'Bosh Showroom'
  },
  token: 'default-seller-token-yec-gilam-2024'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);

      // 1. Avval backend'ga urinamiz
      try {
        const response = await loginUser(email, password);
        const { token, user: userData } = response;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        return userData;
      } catch (apiErr) {
        // 2. Backend ishlamasa, default admin/seller ma'lumotlarini tekshiramiz
        console.warn('Backend login failed, trying default credentials:', apiErr.message);

        // Default admin tekshirish
        if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
          localStorage.setItem('token', DEFAULT_ADMIN.token);
          localStorage.setItem('user', JSON.stringify(DEFAULT_ADMIN.userData));
          setUser(DEFAULT_ADMIN.userData);
          console.log('✅ Default admin auto-login successful');
          return DEFAULT_ADMIN.userData;
        }

        // Default seller tekshirish
        if (email === DEFAULT_SELLER.email && password === DEFAULT_SELLER.password) {
          localStorage.setItem('token', DEFAULT_SELLER.token);
          localStorage.setItem('user', JSON.stringify(DEFAULT_SELLER.userData));
          setUser(DEFAULT_SELLER.userData);
          console.log('✅ Default seller auto-login successful');
          return DEFAULT_SELLER.userData;
        }

        // Agar default emas va backend ishlamasa - xatolik qaytaramiz
        throw apiErr;
      }
    } catch (err) {
      const message = err.message || 'Login xatosi yuz berdi';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}