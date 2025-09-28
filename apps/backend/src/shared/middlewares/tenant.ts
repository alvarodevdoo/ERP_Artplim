import { FastifyInstance, FastifyRequest } from 'fastify';
import { User } from '@artplim/types';

declare module 'fastify' {
  interface FastifyRequest {
    companyId?: string;
  }
}

export async function tenantMiddleware(fastify: FastifyInstance) {
  fastify.decorateRequest('companyId', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    // Skip tenant isolation for public routes
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

    // Skip if user is not authenticated
    if (!request.user) {
      return;
    }

    const user = request.user as User;
    
    // Set company ID from authenticated user
    if (user.companyId) {
      request.companyId = user.companyId;
    } else {
      throw fastify.httpErrors.forbidden('User is not associated with any company');
    }
  });
}

// Helper function to add tenant filter to Prisma queries
export function addTenantFilter(companyId: string | undefined) {
  if (!companyId) {
    throw new Error('Company ID is required for tenant filtering');
  }
  
  return {
    companyId,
  };
}

// Helper function for multi-tenant create operations
export function addTenantData(companyId: string | undefined, data: Record<string, unknown>) {
  if (!companyId) {
    throw new Error('Company ID is required for tenant data');
  }
  
  return {
    ...data,
    companyId,
  };
}

// Helper function to validate tenant access
export function validateTenantAccess(userCompanyId: string, resourceCompanyId: string) {
  if (userCompanyId !== resourceCompanyId) {
    throw new Error('Access denied: Resource belongs to different company');
  }
}

// Decorator for route-level tenant validation
export function requireTenant() {
  return async (request: FastifyRequest) => {
    if (!request.companyId) {
      throw request.server.httpErrors.forbidden('Company context required');
    }
  };
}

// Extract tenant function for individual route usage
export async function extractTenant(request: FastifyRequest) {
  // Skip tenant isolation for public routes
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

  // Skip if user is not authenticated
  if (!request.user) {
    return;
  }

  const user = request.user as User;
  
  // Set company ID from authenticated user
  if (user.companyId) {
    request.companyId = user.companyId;
  } else {
    throw request.server.httpErrors.forbidden('User is not associated with any company');
  }
}