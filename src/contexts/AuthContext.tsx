import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { api, authApi, User, LoginResponse, RegisterRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@auth_refresh_token';
const USER_KEY = '@auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedRefreshToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
        api.setToken(storedToken);

        // Verify token is still valid by fetching user profile
        try {
          const currentUser = await authApi.me();
          setUser(currentUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        } catch (error) {
          // Token expired, try to refresh
          if (storedRefreshToken) {
            try {
              const refreshResponse = await authApi.refresh(storedRefreshToken);
              const newToken = refreshResponse.access_token;
              setToken(newToken);
              api.setToken(newToken);
              await AsyncStorage.setItem(TOKEN_KEY, newToken);
            } catch (refreshError) {
              // Refresh failed, logout
              await clearAuth();
            }
          } else {
            await clearAuth();
          }
        }
      }
    } catch (error) {
      console.log('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    api.setToken(null);
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response: LoginResponse = await authApi.login(identifier, password);

      const authToken = response.access_token;
      const authRefreshToken = response.refresh_token;
      const userData = response.user;

      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, authToken),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, authRefreshToken),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
      ]);

      setToken(authToken);
      setRefreshToken(authRefreshToken);
      setUser(userData);
      api.setToken(authToken);

      return { success: true, user: userData };
    } catch (error: any) {
      console.log('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      await authApi.register(data);
      // Auto login after registration
      return await login(data.email, data.password);
    } catch (error: any) {
      console.log('Register error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.'
      };
    }
  };

  const logout = async () => {
    try {
      await clearAuth();
      router.replace('/(auth)/login');
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch (error) {
        console.log('Error refreshing user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
