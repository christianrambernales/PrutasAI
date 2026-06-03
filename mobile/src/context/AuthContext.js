import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('prutasai_token');
      if (savedToken) {
        setToken(savedToken);
        const response = await api.getSession(savedToken);
        setUser(response.user);
      }
    } catch (error) {
      await AsyncStorage.removeItem('prutasai_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.login(email, password);
    await AsyncStorage.setItem('prutasai_token', response.token);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const register = async (name, email, password, language) => {
    const response = await api.register(name, email, password, language);
    await AsyncStorage.setItem('prutasai_token', response.token);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('prutasai_token');
    setToken(null);
    setUser(null);
  };

  const updateLanguage = async (language) => {
    await api.updateLanguage(token, language);
    setUser(prev => ({ ...prev, preferredLanguage: language }));
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout, updateLanguage
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
