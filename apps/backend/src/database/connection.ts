import { PrismaClient } from '@prisma/client';

/**
 * Instância global do Prisma Client
 * Implementa padrão Singleton para evitar múltiplas conexões
 */
class DatabaseConnection {
  private static instance: PrismaClient;

  /**
   * Obtém a instância do Prisma Client
   * @returns Instância do PrismaClient
   */
  public static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty'
      });
    }
    return DatabaseConnection.instance;
  }

  /**
   * Conecta ao banco de dados
   */
  public static async connect(): Promise<void> {
    try {
      await DatabaseConnection.getInstance().$connect();
      console.log('✅ Conectado ao banco de dados');
    } catch (error) {
      console.error('❌ Erro ao conectar ao banco de dados:', error);
      throw error;
    }
  }

  /**
   * Desconecta do banco de dados
   */
  public static async disconnect(): Promise<void> {
    try {
      await DatabaseConnection.getInstance().$disconnect();
      console.log('✅ Desconectado do banco de dados');
    } catch (error) {
      console.error('❌ Erro ao desconectar do banco de dados:', error);
      throw error;
    }
  }
}

// Exporta a instância global do Prisma
export const prisma = DatabaseConnection.getInstance();

// Exporta a classe para uso em testes ou configurações específicas
export { DatabaseConnection };