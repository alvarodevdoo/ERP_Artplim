/**
 * Classe de erro customizada para a aplicação
 * Permite definir mensagens de erro específicas e códigos de status HTTP
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação - 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Dados inválidos') {
    super(message, 400);
  }
}

/**
 * Erro de autenticação - 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
  }
}

/**
 * Erro de autorização - 403 Forbidden
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403);
  }
}

/**
 * Erro de recurso não encontrado - 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
  }
}

/**
 * Erro de conflito - 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflito de dados') {
    super(message, 409);
  }
}

/**
 * Erro interno do servidor - 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor') {
    super(message, 500);
  }
}