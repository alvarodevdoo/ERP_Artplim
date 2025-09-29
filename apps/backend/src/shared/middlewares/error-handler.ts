import { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../logger/index';

export async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(async (error: FastifyError, request, reply) => {
    const { method, url } = request;
    const userAgent = request.headers['user-agent'];
    const ip = request.ip;

    // Log error details
    logger.error({
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      request: {
        method,
        url,
        userAgent,
        ip,
      },
    }, 'Request error occurred');

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      });
    }

    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return reply.status(409).send({
            error: 'Conflict',
            message: 'Resource already exists',
            field: error.meta?.target,
          });
        case 'P2025':
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Resource not found',
          });
        case 'P2003':
          return reply.status(400).send({
            error: 'Foreign Key Constraint',
            message: 'Referenced resource does not exist',
          });
        default:
          return reply.status(500).send({
            error: 'Database Error',
            message: 'An error occurred while processing your request',
          });
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid data provided',
      });
    }

    // Fastify HTTP errors
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name || 'HTTP Error',
        message: error.message,
      });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return reply.status(401).send({
        error: 'Authentication Error',
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return reply.status(401).send({
        error: 'Authentication Error',
        message: 'Token expired',
      });
    }

    // File upload errors
    if (error.code === 'FST_FILES_LIMIT') {
      return reply.status(413).send({
        error: 'Upload Error',
        message: 'Too many files uploaded',
      });
    }

    if (error.code === 'FST_FILE_TOO_LARGE') {
      return reply.status(413).send({
        error: 'Upload Error',
        message: 'File too large',
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'Rate Limit Exceeded',
        message: 'Too many requests, please try again later',
      });
    }

    // Default server error
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
}