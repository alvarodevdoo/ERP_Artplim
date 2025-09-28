import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Configurações centralizadas da aplicação
 * Todas as configurações são carregadas das variáveis de ambiente
 * com valores padrão seguros para desenvolvimento
 */

export const config = {
  // Ambiente da aplicação
  env: process.env.NODE_ENV || 'development',
  
  // Configurações do servidor
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  },
  
  // Configurações do banco de dados
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/artplim_erp',
  },
  
  // Configurações JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Configurações Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  // Configurações de email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@artplim.com',
  },
  
  // Configurações de upload/storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // 'local' | 'minio' | 's3'
    local: {
      uploadPath: process.env.UPLOAD_PATH || './uploads',
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'artplim-erp',
    },
  },
  
  // Configurações de rate limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },
  
  // Configurações de segurança
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10), // 1 hora em ms
  },
  
  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10M',
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '5', 10),
    },
  },
  
  // Configurações de filas (BullMQ)
  queues: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
      password: process.env.QUEUE_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
      db: parseInt(process.env.QUEUE_REDIS_DB || '1', 10),
    },
    defaultJobOptions: {
      removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE || '10', 10),
      removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL || '50', 10),
      attempts: parseInt(process.env.QUEUE_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000', 10),
      },
    },
  },
  
  // Configurações de WebSocket
  websocket: {
    cors: {
      origin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
  },
  
  // Configurações específicas do ERP
  erp: {
    company: {
      maxUsers: parseInt(process.env.MAX_USERS_PER_COMPANY || '100', 10),
      maxStorage: process.env.MAX_STORAGE_PER_COMPANY || '1GB',
    },
    features: {
      multiCompany: process.env.MULTI_COMPANY_ENABLED === 'true',
      auditLog: process.env.AUDIT_LOG_ENABLED !== 'false', // habilitado por padrão
      backup: process.env.BACKUP_ENABLED === 'true',
    },
  },
};

/**
 * Validação das configurações obrigatórias
 */
export const validateConfig = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validações adicionais
  if (config.env === 'production') {
    const productionRequiredVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];
    
    const missingProdVars = productionRequiredVars.filter(varName => 
      !process.env[varName] || process.env[varName]?.includes('change-in-production')
    );
    
    if (missingProdVars.length > 0) {
      throw new Error(`Missing or invalid production environment variables: ${missingProdVars.join(', ')}`);
    }
  }
};

// Exportar configuração como padrão
export default config;

// Tipos para TypeScript
export interface Config {
  env: string;
  server: {
    port: number;
    host: string;
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
  };
  storage: {
    provider: string;
    local: {
      uploadPath: string;
    };
    minio: {
      endpoint: string;
      port: number;
      useSSL: boolean;
      accessKey: string;
      secretKey: string;
      bucket: string;
    };
  };
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  security: {
    bcryptRounds: number;
    passwordMinLength: number;
    sessionTimeout: number;
  };
  logging: {
    level: string;
    file: {
      enabled: boolean;
      path: string;
      maxSize: string;
      maxFiles: number;
    };
  };
  queues: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    defaultJobOptions: {
      removeOnComplete: number;
      removeOnFail: number;
      attempts: number;
      backoff: {
        type: string;
        delay: number;
      };
    };
  };
  websocket: {
    cors: {
      origin: string[];
      credentials: boolean;
    };
    pingTimeout: number;
    pingInterval: number;
  };
  erp: {
    company: {
      maxUsers: number;
      maxStorage: string;
    };
    features: {
      multiCompany: boolean;
      auditLog: boolean;
      backup: boolean;
    };
  };
}