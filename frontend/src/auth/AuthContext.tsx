import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, AuthResponse, TOKEN_STORAGE_KEY, User } from '../api';
import type { UpdateProfileInput, UploadProgressHandler } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<User>;
  uploadAvatar: (file: File, onProgress?: UploadProgressHandler) => Promise<User>;
  removeAvatar: () => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(readStoredToken()));

  const applySession = useCallback((session: AuthResponse) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    authApi
      .me()
      .then((profile) => {
        if (active) {
          setUser(profile);
        }
      })
      .catch(() => {
        if (active) {
          logout();
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login({ email, password });
      applySession(session);
    },
    [applySession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const session = await authApi.register({ name, email, password });
      applySession(session);
    },
    [applySession],
  );

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const updated = await authApi.updateProfile(input);
    setUser(updated);
    return updated;
  }, []);

  const uploadAvatar = useCallback(async (file: File, onProgress?: UploadProgressHandler) => {
    const updated = await authApi.uploadAvatar(file, onProgress);
    setUser(updated);
    return updated;
  }, []);

  const removeAvatar = useCallback(async () => {
    const updated = await authApi.removeAvatar();
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      updateProfile,
      uploadAvatar,
      removeAvatar,
      logout,
    }),
    [user, token, loading, login, register, updateProfile, uploadAvatar, removeAvatar, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
