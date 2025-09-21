import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { createValidation, commonSchemas } from '../../../shared/middlewares/validation';
import {
  loginDto,
  registerDto,
  refreshTokenDto,
  forgotPasswordDto,
  resetPasswordDto,
  changePasswordDto,
  updateProfileDto,
} from '../dtos';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.prisma);
  // Login
  fastify.post('/login', {
    preHandler: createValidation({ body: loginDto }),
  }, async (request, reply) => {
    try {
      const result = await authService.login(request.body as any);
      return reply.send(result);
    } catch (error) {
      return reply.status(401).send({
        error: 'Authentication Failed',
        message: error instanceof Error ? error.message : 'Login failed',
      });
    }
  });

  // Register
  fastify.post('/register', {
    preHandler: createValidation({ body: registerDto }),
  }, async (request, reply) => {
    try {
      const result = await authService.register(request.body as any);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({
        error: 'Registration Failed',
        message: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  });

  // Refresh token
  fastify.post('/refresh', {
    preHandler: createValidation({ body: refreshTokenDto }),
  }, async (request, reply) => {
    try {
      const result = await authService.refreshToken(request.body as any);
      return reply.send(result);
    } catch (error) {
      return reply.status(401).send({
        error: 'Token Refresh Failed',
        message: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  });

  // Forgot password
  fastify.post('/forgot-password', {
    preHandler: createValidation({ body: forgotPasswordDto }),
  }, async (request, reply) => {
    try {
      await authService.forgotPassword(request.body as any);
      return reply.send({
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Password Reset Failed',
        message: 'Unable to process password reset request',
      });
    }
  });

  // Reset password
  fastify.post('/reset-password', {
    preHandler: createValidation({ body: resetPasswordDto }),
  }, async (request, reply) => {
    try {
      await authService.resetPassword(request.body as any);
      return reply.send({
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'Password Reset Failed',
        message: error instanceof Error ? error.message : 'Password reset failed',
      });
    }
  });

  // Change password (authenticated)
  fastify.post('/change-password', {
    preHandler: createValidation({ body: changePasswordDto }),
  }, async (request, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Authentication Required',
          message: 'You must be logged in to change password',
        });
      }

      await authService.changePassword(request.userId, request.body as any);
      return reply.send({
        message: 'Password changed successfully',
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'Password Change Failed',
        message: error instanceof Error ? error.message : 'Password change failed',
      });
    }
  });

  // Update profile (authenticated)
  fastify.put('/profile', {
    preHandler: createValidation({ body: updateProfileDto }),
  }, async (request, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Authentication Required',
          message: 'You must be logged in to update profile',
        });
      }

      const user = await authService.updateProfile(request.userId, request.body as any);
      return reply.send({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'Profile Update Failed',
        message: error instanceof Error ? error.message : 'Profile update failed',
      });
    }
  });

  // Get current user (authenticated)
  fastify.get('/me', async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Authentication Required',
          message: 'You must be logged in to access this resource',
        });
      }

      const user = request.user;
      return reply.send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
          company: user.company,
          // TODO: Implementar sistema de roles/permissions
          employee: user.employee ? {
            id: user.employee.id,
            role: user.employee.role ? {
              id: user.employee.role.id,
              name: user.employee.role.name,
            } : null,
          } : null,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'User Fetch Failed',
        message: 'Unable to fetch user information',
      });
    }
  });

  // Logout (authenticated)
  fastify.post('/logout', async (request, reply) => {
    try {
      // In a real implementation, you might want to blacklist the token
      // For now, we'll just return a success message
      return reply.send({
        message: 'Logged out successfully',
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Logout Failed',
        message: 'Unable to logout',
      });
    }
  });
}