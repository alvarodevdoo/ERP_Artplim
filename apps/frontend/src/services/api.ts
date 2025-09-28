import axios, { AxiosError, AxiosResponse } from 'axios'
import { toast } from 'sonner'

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error)
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Try to refresh token
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const { state } = JSON.parse(authStorage)
          if (state?.token) {
            // Attempt token refresh
            const refreshResponse = await api.post('/auth/refresh', {
              refreshToken: state.token,
            })
            
            const { token } = refreshResponse.data
            
            // Update stored token
            const updatedStorage = {
              ...JSON.parse(authStorage),
              state: {
                ...state,
                token,
              },
            }
            localStorage.setItem('auth-storage', JSON.stringify(updatedStorage))
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('auth-storage')
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      }
    }
    
    // Handle other errors
    const errorMessage = getErrorMessage(error)
    
    // Don't show toast for certain errors
    const silentErrors = [401, 422] // Validation errors, unauthorized
    if (!silentErrors.includes(error.response?.status || 0)) {
      toast.error(errorMessage)
    }
    
    return Promise.reject(error)
  }
)

// Helper function to extract error messages
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as { errors?: Array<{ message: string }>; message?: string } | string
    
    // Handle validation errors
    if (typeof data === 'object' && data.errors && Array.isArray(data.errors)) {
      return data.errors.map((err) => err.message).join(', ')
    }
    
    // Handle single error message
    if (typeof data === 'object' && data.message) {
      return data.message
    }
    
    // Handle error string
    if (typeof data === 'string') {
      return data
    }
  }
  
  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }
  
  // Handle timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'Tempo limite excedido. Tente novamente.'
  }
  
  // Default error message
  return error.message || 'Ocorreu um erro inesperado. Tente novamente.'
}

// Export types
export type { AxiosError, AxiosResponse }