import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  user_id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  institution?: string;
  license_number?: string;
  joined_at?: string;
  is_staff?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      error: null,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      login: (token, user) => set({ token, user, isAuthenticated: true, error: null }),
      logout: () => set({ token: null, user: null, isAuthenticated: false, error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export interface Prediction {
  id: string;
  patient_id?: string;
  patient_name?: string;
  predicted_class: string;
  confidence_score: number;
  probabilities: {
    [key: string]: number;
  };
  is_uncertain: boolean;
  uncertainty_reason?: string;
  created_at: string;
  clinical_notes?: string;
}

interface PredictionState {
  predictions: Prediction[];
  currentPrediction: Prediction | null;
  isLoading: boolean;
  error: string | null;

  setPredictions: (predictions: Prediction[]) => void;
  addPrediction: (prediction: Prediction) => void;
  setCurrentPrediction: (prediction: Prediction | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const usePredictionStore = create<PredictionState>((set) => ({
  predictions: [],
  currentPrediction: null,
  isLoading: false,
  error: null,

  setPredictions: (predictions) => set({ predictions }),
  addPrediction: (prediction) => set((state) => ({ predictions: [prediction, ...state.predictions] })),
  setCurrentPrediction: (prediction) => set({ currentPrediction: prediction }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
