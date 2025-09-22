import pino from 'pino';

/**
 * Configuração do sistema de logging usando Pino
 * Suporta diferentes níveis de log e configurações para desenvolvimento e produção
 */

// Configuração base do logger
const loggerConfig = {
  // Nível de log baseado no ambiente
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // Configurações específicas para desenvolvimento
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false,
        hideObject: false,
      },
    },
  }),
  
  // Configurações para produção
  ...(process.env.NODE_ENV === 'production' && {
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['password', 'token', 'authorization', 'cookie'],
      censor: '[REDACTED]',
    },
  }),
};

/**
 * Instância principal do logger
 * Compatível com Fastify e pode ser usado em toda a aplicação
 */
export const logger = pino(loggerConfig);

/**
 * Logger específico para diferentes contextos da aplicação
 */
export const createContextLogger = (context: string) => {
  return logger.child({ context });
};

/**
 * Logger para auditoria e compliance com LGPD
 * Registra ações sensíveis relacionadas a dados pessoais
 */
export const auditLogger = createContextLogger('AUDIT');

/**
 * Logger para segurança
 * Registra tentativas de acesso, falhas de autenticação, etc.
 */
export const securityLogger = createContextLogger('SECURITY');

/**
 * Logger para performance
 * Monitora tempos de resposta e métricas de performance
 */
export const performanceLogger = createContextLogger('PERFORMANCE');

/**
 * Logger para banco de dados
 * Registra queries, conexões e operações de banco
 */
export const dbLogger = createContextLogger('DATABASE');

/**
 * Função utilitária para log de erros com stack trace
 * @param error - Erro a ser logado
 * @param context - Contexto onde o erro ocorreu
 * @param additionalInfo - Informações adicionais sobre o erro
 */
export const logError = (
  error: Error,
  context: string,
  additionalInfo?: Record<string, unknown>
) => {
  logger.error(
    {
      err: error,
      context,
      stack: error.stack,
      ...additionalInfo,
    },
    `Erro em ${context}: ${error.message}`
  );
};

/**
 * Função para log de ações de usuário (LGPD compliance)
 * @param userId - ID do usuário
 * @param action - Ação realizada
 * @param resource - Recurso acessado
 * @param metadata - Metadados adicionais
 */
export const logUserAction = (
  userId: string,
  action: string,
  resource: string,
  metadata?: Record<string, unknown>
) => {
  auditLogger.info(
    {
      userId,
      action,
      resource,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
    `Usuário ${userId} executou ${action} em ${resource}`
  );
};

/**
 * Função para log de acesso a dados pessoais (LGPD compliance)
 * @param userId - ID do usuário que acessou
 * @param dataType - Tipo de dado pessoal acessado
 * @param dataOwnerId - ID do titular dos dados
 * @param purpose - Finalidade do acesso
 */
export const logPersonalDataAccess = (
  userId: string,
  dataType: string,
  dataOwnerId: string,
  purpose: string
) => {
  auditLogger.info(
    {
      userId,
      dataType,
      dataOwnerId,
      purpose,
      timestamp: new Date().toISOString(),
      compliance: 'LGPD',
    },
    `Acesso a dados pessoais: ${dataType} do titular ${dataOwnerId} por ${userId} - Finalidade: ${purpose}`
  );
};

/**
 * Middleware para log de requisições HTTP
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export const requestLogger = (req: { method: string; url: string; headers: Record<string, string>; ip: string }, res: { statusCode: number; on: (event: string, callback: () => void) => void }, next: () => void) => {
  const start = Date.now();
  
  logger.info(
    {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
    `Requisição recebida: ${req.method} ${req.url}`
  );
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    performanceLogger.info(
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
      },
      `Requisição finalizada: ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
    );
  });
  
  next();
};

export default logger;