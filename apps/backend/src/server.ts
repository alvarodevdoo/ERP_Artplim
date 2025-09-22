import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { config } from './config';
import { prisma } from './database/client';
import { errorHandler } from './shared/middlewares/error-handler';
import { authMiddleware } from './shared/middlewares/auth';
import { tenantMiddleware } from './shared/middlewares/tenant';
import { validationMiddleware } from './shared/middlewares/validation';

// Import routes
import { authRoutes } from './modules/auth/routes';
import { companyRoutes } from './modules/company/routes';
import { userRoutes } from './modules/user/routes';
import { roleRoutes } from './modules/role/routes';
import { employeeRoutes } from './modules/employee/routes';
import { productRoutes } from './modules/product/routes';
import { partnerRoutes } from './modules/partner/routes';
import { quoteRoutes } from './modules/quote/routes';
import { orderRoutes } from './modules/order/routes';
import { stockRoutes } from './modules/stock/routes';
import { financialRoutes } from './modules/financial/routes';
// import { uploadRoutes } from './modules/upload/routes';

const server = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register plugins
server.register(helmet, {
  contentSecurityPolicy: false,
});

server.register(cors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
});

server.register(rateLimit, {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
});

server.register(multipart, {
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
});

// Register global middlewares
server.register(errorHandler);
server.register(authMiddleware);
server.register(tenantMiddleware);
server.register(validationMiddleware);

// Health check
server.get('/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  } catch (error) {
    server.log.error('Health check failed:', error);
    throw server.httpErrors.serviceUnavailable('Database connection failed');
  }
});

// Register routes
server.register(authRoutes, { prefix: '/api/auth' });
server.register(companyRoutes, { prefix: '/api/companies' });
server.register(userRoutes, { prefix: '/api/users' });
server.register(roleRoutes, { prefix: '/api/roles' });
server.register(employeeRoutes, { prefix: '/api/employees' });
server.register(productRoutes, { prefix: '/api/products' });
server.register(partnerRoutes, { prefix: '/api/partners' });
server.register(quoteRoutes, { prefix: '/api/quotes' });
server.register(orderRoutes, { prefix: '/api/orders' });
server.register(stockRoutes, { prefix: '/api/stock' });
server.register(financialRoutes, { prefix: '/api/financial' });
// server.register(uploadRoutes, { prefix: '/api/upload' });

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await server.close();
    await prisma.$disconnect();
    server.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    server.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { server };