export interface User {
  id: string
  name: string
  email: string
  companyId: string
  roleId: string
  role: Role
  company: Company
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

export interface Permission {
  id: string
  name: string
  resource: string
  action: string
}

export interface Company {
  id: string
  name: string
  document: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  companyName: string
  companyDocument?: string
  companyEmail?: string
  companyPhone?: string
}

export interface RegisterResponse {
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
}