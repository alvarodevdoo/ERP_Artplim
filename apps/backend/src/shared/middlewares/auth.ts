import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../../database/client';
import { User, Role } from '@artplim/types';

function logToFile(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}
`;
  const logFilePath = path.join(__dirname, '..', '..', '..', 'auth_debug.log');
  fs.appendFileSync(logFilePath, logMessage);
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: any;
    userId?: string;
  }
}

interface JwtPayload {
  userId: string;
  companyId: string;
  iat: number;
  exp: number;
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  logToFile('authMiddleware: Entering preHandler for URL:', request.url);
  // Skip auth for public routes
  const publicRoutes = [
    '/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/roles',
  ];

  if (publicRoutes.includes(request.url)) {
    logToFile('authMiddleware: Public route, skipping authentication.');
    return;
  }

  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logToFile('authMiddleware: Missing or invalid authorization header.');
    return reply.status(401).send({ message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  logToFile('authMiddleware: Token extracted:', token ? 'present' : 'missing');

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    logToFile('authMiddleware: JWT decoded for userId:', decoded.userId);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: true,
        employee: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      logToFile('authMiddleware: User not found for userId:', decoded.userId);
      return reply.status(401).send({ message: 'User not found' });
    }

    if (!user.isActive) {
      logToFile('authMiddleware: User account is inactive for userId:', decoded.userId);
      return reply.status(401).send({ message: 'User account is inactive' });
    }

    // Attach user and their role to request
    request.user = user;
    if (user.employee && user.employee.role) {
      request.user.role = user.employee.role;
    }
    request.userId = user.id;
    logToFile('authMiddleware: User attached to request:', request.userId);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logToFile('authMiddleware: JWT Error - Invalid token.');
      return reply.status(401).send({ message: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      logToFile('authMiddleware: JWT Error - Token expired.');
      return reply.status(401).send({ message: 'Token expired' });
    }
    logToFile('authMiddleware: Unexpected error in preHandler:', error);
    return reply.status(500).send({ message: 'Internal Server Error' });
  }
}

// Helper function to check if user has permission
export function hasPermission(user: User & { role?: any }, permission: string): boolean {
  if (!user.role) {
    return false;
  }
  const permissions = user.role.permissions as string[];
  return permissions.includes(permission);
}

// Helper function to check if user has role
export function hasRole(user: User & { role?: Role }, roleName: string): boolean {
  if (!user.role) {
    return false;
  }
  return user.role.name === roleName;
}

// Decorator for route-level permission checking
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    if (!hasPermission(request.user, permission)) {
      return reply.status(403).send({ message: 'Insufficient permissions' });
    }
  };
}

// Decorator for route-level role checking
export function requireRole(roleName: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    if (!hasRole(request.user, roleName)) {
      return reply.status(403).send({ message: 'Insufficient role' });
    }
  };
}