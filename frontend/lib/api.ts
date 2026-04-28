import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
const API_READ_TIMEOUT_MS = 5000;
const API_WRITE_TIMEOUT_MS = 15000;
const API_UPLOAD_TIMEOUT_MS = 120000;
const API_CACHE_TTL_MS = 60 * 1000;

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PatientPayload {
  patient_id?: string;
  patient_name?: string;
  date_of_birth?: string;
  sex?: string;
  phone?: string;
  national_id?: string;
  address?: string;
  notes?: string;
  episode_reason?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private publicClient: AxiosInstance;
  private token: string | null = null;
  private readCache = new Map<string, { expiresAt: number; data?: unknown; promise?: Promise<unknown> }>();

  constructor() {
    this.publicClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_WRITE_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_WRITE_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
      if (this.token) {
        this.setAuthToken(this.token);
      }
    }

    this.client.interceptors.request.use((config) => {
      const requestUrl = config.url || '';
      const isAuthAttempt = requestUrl.includes('/login/') || requestUrl.includes('/register/');

      if (isAuthAttempt) {
        delete config.headers.Authorization;
        return config;
      }

      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken') || this.token;
        if (token) {
          config.headers.Authorization = `Token ${token}`;
        }
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const requestUrl = error.config?.url || '';
        const isAuthAttempt = requestUrl.includes('/login/') || requestUrl.includes('/register/');

        if (error.response?.status === 401 && !isAuthAttempt) {
          // Handle unauthorized
          if (typeof window !== 'undefined') {
            // Lazy import/require to avoid circular dependency issues if any
            const { useAuthStore } = require('./store');
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Token ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearAuthToken() {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  clearCache() {
    this.readCache.clear();
  }

  private getCacheKey(url: string, params?: Record<string, unknown>) {
    return `${url}:${JSON.stringify(params ?? {})}`;
  }

  private async getCached<T>(
    url: string,
    params?: Record<string, unknown>,
    ttl: number = API_CACHE_TTL_MS
  ): Promise<T> {
    const key = this.getCacheKey(url, params);
    const now = Date.now();
    const cached = this.readCache.get(key);

    if (cached?.data && cached.expiresAt > now) {
      return cached.data as T;
    }

    if (cached?.promise) {
      return cached.promise as Promise<T>;
    }

    const promise = this.client
      .get<T>(url, { params, timeout: API_READ_TIMEOUT_MS })
      .then((response) => {
        this.readCache.set(key, {
          data: response.data,
          expiresAt: Date.now() + ttl,
        });
        return response.data;
      })
      .catch((error) => {
        this.readCache.delete(key);
        throw error;
      });

    this.readCache.set(key, {
      promise,
      expiresAt: now + ttl,
    });

    return promise;
  }

  // Auth endpoints
  async register(username: string, email: string, password: string, confirmPassword: string, role: string = 'clinician') {
    const response = await this.publicClient.post('/register/', {
      username,
      email,
      password,
      confirm_password: confirmPassword,
      role,
    });
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data;
  }

  async login(username: string, password: string) {
    this.clearAuthToken();
    const response = await this.publicClient.post('/login/', {
      username,
      password,
    });
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/logout/');
    } finally {
      this.clearCache();
      this.clearAuthToken();
    }
  }

  async getUserProfile() {
    return this.getCached<any>('/profile/');
  }

  // Prediction endpoints
  private appendPatientFields(formData: FormData, patient?: PatientPayload) {
    if (!patient) return;
    Object.entries(patient).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
  }

  async predict(imageFile: File, patient?: PatientPayload) {
    const formData = new FormData();
    formData.append('image', imageFile);
    this.appendPatientFields(formData, patient);

    const response = await this.client.post('/predict/', formData, {
      timeout: API_UPLOAD_TIMEOUT_MS,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    this.clearCache();
    return response.data;
  }

  async predictWithHeatmap(imageFile: File, patient: PatientPayload) {
    const formData = new FormData();
    formData.append('image', imageFile);
    this.appendPatientFields(formData, patient);

    const response = await this.client.post('/predict_heatmap/', formData, {
      timeout: API_UPLOAD_TIMEOUT_MS,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    this.clearCache();
    return response.data;
  }

  // History & Analytics
  async getPredictionHistory(limit: number = 50, page: number = 1) {
    return this.getCached<any>('/history/', { limit, page });
  }

  async getPredictionDetail(predictionId: string) {
    return this.getCached<any>(`/prediction/${predictionId}/`);
  }

  async getModelMetrics() {
    return this.getCached<any>('/metrics/');
  }

  async getDashboardStats() {
    return this.getCached<any>('/dashboard/');
  }

  // Health
  async getHealth() {
    return this.getCached<any>('/health/', undefined, 10 * 1000);
  }

  async getApiInfo() {
    return this.getCached<any>('/info/', undefined, 5 * 60 * 1000);
  }

  // Chat Assistant
  async sendMessage(message: string) {
    const response = await this.client.post('/chat/', { message });
    return response.data;
  }

  // Admin & Management
  async getUsers() {
    return this.getCached<any>('/users/');
  }

  async getPatients() {
    return this.getCached<any>('/patients/');
  }

  async createPatient(patient: PatientPayload) {
    const response = await this.client.post('/patients/', patient);
    this.clearCache();
    return response.data;
  }

  async getPatient(patientId: string) {
    return this.getCached<any>(`/patients/${patientId}/`);
  }
}

export const apiClient = new ApiClient();
