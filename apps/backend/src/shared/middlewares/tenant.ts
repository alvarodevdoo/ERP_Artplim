import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '@artplim/types';

declare module 'fastify' {
  interface FastifyRequest {
    companyId?: string;
  }
}

export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply) {
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
    return reply.status(403).send({ message: 'User is not associated with any company' });
  }
}