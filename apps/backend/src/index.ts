import 'dotenv/config';
import { server } from './server';
import { config } from './config';
import { logger } from './shared/logger/index';

const start = async () => {
  try {
    await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });
    
    logger.info(`🚀 Server running on http://localhost:${config.PORT}`);
    logger.info(`📊 Environment: ${config.NODE_ENV}`);
    logger.info(`🔗 CORS Origin: ${config.CORS_ORIGIN}`);
  } catch (error) {
    logger.error(error, 'Falha ao iniciar o servidor');
    process.exit(1);
  }
};

start();