import { api } from './api'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  User,
} from '@/types/auth'

class AuthService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', data)
    
    // Set token for future requests
    if (response.data.tokens.accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.accessToken}`
    }
    
    return response.data
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', data)
    
    // Set token for future requests
    if (response.data.tokens.accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.accessToken}`
    }
    
    return response.data
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    })
    
    // Update token for future requests
    if (response.data.accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`
    }
    
    return response.data
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await api.post('/auth/forgot-password', data)
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await api.post('/auth/reset-password', data)
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.post('/auth/change-password', data)
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await api.put<User>('/auth/profile', data)
    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me')
    return response.data
  }

  logout(): void {
    // Remove token from API headers
    delete api.defaults.headers.common['Authorization']
    
    // Clear any stored tokens
    localStorage.removeItem('auth-storage')
  }

  setAuthToken(token: string): void {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  removeAuthToken(): void {
    delete api.defaults.headers.common['Authorization']
  }
}

export const authService = new AuthService()