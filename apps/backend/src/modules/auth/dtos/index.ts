import { z } from 'zod';

// Login DTOs
export const loginDto = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginResponseDto = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    companyId: z.string(),
    company: z.object({
      id: z.string(),
      name: z.string(),
      cnpj: z.string(),
    }),
    employee: z.object({
      id: z.string(),
      role: z.object({
        id: z.string(),
        name: z.string(),
      }),
    }).optional(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

// Register DTOs
export const registerDto = z.object({
  // Company data
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyDocument: z.string().min(11, 'Company document must be at least 11 characters'),
  
  // User data
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const registerResponseDto = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    companyId: z.string(),
    company: z.object({
      id: z.string(),
      name: z.string(),
      cnpj: z.string(),
    }),
    employee: z.object({
      id: z.string(),
      role: z.object({
        id: z.string(),
        name: z.string(),
      }),
    }).optional(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

// Refresh token DTOs
export const refreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const refreshTokenResponseDto = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Forgot password DTOs
export const forgotPasswordDto = z.object({
  email: z.string().email('Invalid email format'),
});

// Reset password DTOs
export const resetPasswordDto = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Change password DTOs
export const changePasswordDto = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Profile update DTOs
export const updateProfileDto = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
});

// Type exports
export type LoginDto = z.infer<typeof loginDto>;
export type LoginResponseDto = z.infer<typeof loginResponseDto>;
export type RegisterDto = z.infer<typeof registerDto>;
export type RegisterResponseDto = z.infer<typeof registerResponseDto>;
export type RefreshTokenDto = z.infer<typeof refreshTokenDto>;
export type RefreshTokenResponseDto = z.infer<typeof refreshTokenResponseDto>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordDto>;
export type ResetPasswordDto = z.infer<typeof resetPasswordDto>;
export type ChangePasswordDto = z.infer<typeof changePasswordDto>;
export type UpdateProfileDto = z.infer<typeof updateProfileDto>;