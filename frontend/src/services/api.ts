import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  agency_name: string;
  status: string;
  posted_date: string;
  response_deadline: string;
  estimated_value: number;
  naics_codes: string[];
  cpv_codes: string[];
  country: string;
  type: string;
  documents: any[];
  award_probability?: number;
  predicted_value?: number;
  estimated_competition?: number;
}

export interface Contract {
  id: string;
  contract_id: string;
  agency_name: string;
  contractor_name: string;
  award_date: string;
  completion_date: string;
  current_completion_date: string;
  obligated_amount: number;
  current_value: number;
  naics_code: string;
  competed: boolean;
  days_until_expiry?: number;
}

export interface SearchParams {
  q?: string;
  status?: string;
  agency?: string;
  naics?: string;
  minValue?: number;
  maxValue?: number;
  postedFrom?: string;
  postedTo?: string;
  country?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const opportunitiesApi = {
  search: async (params: SearchParams) => {
    const response = await api.get('/opportunities/search', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/opportunities/${id}`);
    return response.data;
  },
  
  getSimilar: async (id: string, limit = 10) => {
    const response = await api.get(`/opportunities/${id}/similar`, { params: { limit } });
    return response.data;
  },
  
  export: async (format: 'csv' | 'json', params: SearchParams) => {
    const response = await api.get(`/opportunities/export/${format}`, { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },
};

export const contractsApi = {
  getExpiring: async (months = 12) => {
    const response = await api.get('/contracts/expiring', { params: { months } });
    return response.data;
  },
};

export const intelligenceApi = {
  getOpportunityAnalysis: async (opportunityId: string) => {
    const response = await api.get(`/intelligence/opportunity/${opportunityId}`);
    return response.data;
  },
  
  getContractorProfile: async (contractorId: string) => {
    const response = await api.get(`/intelligence/contractor/${contractorId}`);
    return response.data;
  },
  
  getRecompetePredictions: async (months = 12) => {
    const response = await api.get('/intelligence/recompete-predictions', { params: { months } });
    return response.data;
  },
};

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  
  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('authToken');
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const watchlistApi = {
  getAll: async () => {
    const response = await api.get('/watchlists');
    return response.data;
  },
  
  create: async (watchlist: any) => {
    const response = await api.post('/watchlists', watchlist);
    return response.data;
  },
  
  update: async (id: string, watchlist: any) => {
    const response = await api.put(`/watchlists/${id}`, watchlist);
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/watchlists/${id}`);
  },
  
  checkMatches: async (id: string) => {
    const response = await api.post(`/watchlists/${id}/check`);
    return response.data;
  },
};

export default api;