import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  querystring?: ZodSchema;
  headers?: ZodSchema;
}

export async function validationMiddleware(fastify: FastifyInstance) {
  // Register validation decorator
  fastify.decorate('validate', (schemas: ValidationSchemas) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Validate request body
        if (schemas.body && request.body) {
          request.body = schemas.body.parse(request.body);
        }

        // Validate route parameters
        if (schemas.params && request.params) {
          request.params = schemas.params.parse(request.params);
        }

        // Validate query string
        if (schemas.querystring && request.query) {
          request.query = schemas.querystring.parse(request.query);
        }

        // Validate headers
        if (schemas.headers && request.headers) {
          request.headers = schemas.headers.parse(request.headers);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: 'Invalid request data',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              received: err.received,
            })),
          });
        }
        throw error;
      }
    };
  });
}

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  }),

  // ID parameter
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // File upload
  fileUpload: z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimetype: z.string().min(1, 'MIME type is required'),
    size: z.number().positive('File size must be positive'),
  }),
};

// Helper function to create validation middleware
export function createValidation(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      if (schemas.body && request.body) {
        request.body = schemas.body.parse(request.body);
      }

      // Validate route parameters
      if (schemas.params && request.params) {
        request.params = schemas.params.parse(request.params);
      }

      // Validate query string
      if (schemas.querystring && request.query) {
        request.query = schemas.querystring.parse(request.query);
      }

      // Validate headers
      if (schemas.headers && request.headers) {
        request.headers = schemas.headers.parse(request.headers);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: err.received,
          })),
        });
      }
      throw error;
    }
  };
}

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    validate: (schemas: ValidationSchemas) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}