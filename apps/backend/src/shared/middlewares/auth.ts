import { FastifyInstance, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../../database/client';
import { User } from '@artplim/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    userId?: string;
  }
}

interface JwtPayload {
  userId: string;
  companyId: string;
  iat: number;
  exp: number;
}

export async function authMiddleware(fastify: FastifyInstance) {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('userId', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    // Skip auth for public routes
    const publicRoutes = [
      '/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
    ];

    if (publicRoutes.includes(request.url)) {
      return;
    }

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw fastify.httpErrors.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          company: true,
          roles: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user) {
        throw fastify.httpErrors.unauthorized('User not found');
      }

      if (!user.isActive) {
        throw fastify.httpErrors.unauthorized('User account is inactive');
      }

      // Attach user to request
      request.user = user as User;
      request.userId = user.id;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw fastify.httpErrors.unauthorized('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw fastify.httpErrors.unauthorized('Token expired');
      }
      throw error;
    }
  });
}

// Helper function to check if user has permission
export function hasPermission(user: User, permission: string): boolean {
  return user.roles.some(role => 
    role.permissions.some(p => p.name === permission)
  );
}

// Helper function to check if user has role
export function hasRole(user: User, roleName: string): boolean {
  return user.roles.some(role => role.name === roleName);
}

// Decorator for route-level permission checking
export function requirePermission(permission: string) {
  return async (request: FastifyRequest) => {
    if (!request.user) {
      throw request.server.httpErrors.unauthorized('Authentication required');
    }

    if (!hasPermission(request.user, permission)) {
      throw request.server.httpErrors.forbidden('Insufficient permissions');
    }
  };
}

// Decorator for route-level role checking
export function requireRole(roleName: string) {
  return async (request: FastifyRequest) => {
    if (!request.user) {
      throw request.server.httpErrors.unauthorized('Authentication required');
    }

    if (!hasRole(request.user, roleName)) {
      throw request.server.httpErrors.forbidden('Insufficient role');
    }
  };
}