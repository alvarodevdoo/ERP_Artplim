import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/auth'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshAuthToken: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  initializeAuth: () => void
  setLoading: (loading: boolean) => void
}

interface RegisterData {
  name: string
  email: string
  password: string
  companyName: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          const response = await authService.login({ email, password })
          
          set({
            user: response.user,
            token: response.tokens.accessToken,
            refreshToken: response.tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true })
          const response = await authService.register(data)
          
          set({
            user: response.user,
            token: response.tokens.accessToken,
            refreshToken: response.tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        authService.logout()
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      refreshAuthToken: async () => {
        try {
          const { refreshToken } = get()
          if (!refreshToken) throw new Error('No refresh token available')
          
          const response = await authService.refreshToken(refreshToken)
          
          set({
            token: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          })
        } catch (error) {
          // If refresh fails, logout user
          get().logout()
          throw error
        }
      },

      updateProfile: async (data: Partial<User>) => {
        const updatedUser = await authService.updateProfile(data)
        
        set(state => ({
          user: { ...state.user, ...updatedUser },
        }))
      },

      initializeAuth: async () => {
        const { token } = get()
        
        if (token) {
          // Validate token and get user info
          try {
            const user = await authService.getCurrentUser()
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            })
          } catch (error) {
            // Token is invalid, logout
            get().logout()
          }
        } else {
          set({ isLoading: false })
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)