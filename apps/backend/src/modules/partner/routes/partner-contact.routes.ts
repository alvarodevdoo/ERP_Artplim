import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { 
  CreatePartnerContactDTO, 
  UpdatePartnerContactDTO,
  createPartnerContactSchema,
  updatePartnerContactSchema
} from '../dtos';
import { PartnerContactService } from '../services';

import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';
import { AppError } from '../../../shared/errors/AppError';

export async function partnerContactRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const partnerContactService = new PartnerContactService(prisma);

  // Middleware de autenticação e tenant para todas as rotas
  
  await fastify.register(tenantMiddleware);

  /**
   * Criar contato do parceiro
   */
  fastify.post<{
    Body: CreatePartnerContactDTO;
  }>('/', {
    preHandler: [createValidation({ body: createPartnerContactSchema })],
    handler: async (request: FastifyRequest<{ Body: CreatePartnerContactDTO }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const contact = await partnerContactService.create(request.body, userId, companyId);
        
        return reply.code(201).send({
          success: true,
          data: contact,
          message: 'Contato criado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Buscar contato por ID
   */
  fastify.get<{
    Params: { id: string };
  }>('/:id', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const contact = await partnerContactService.findById(request.params.id, userId, companyId);
        
        return reply.send({
          success: true,
          data: contact
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Listar contatos de um parceiro
   */
  fastify.get<{
    Params: { partnerId: string };
  }>('/partner/:partnerId', {
    handler: async (request: FastifyRequest<{ Params: { partnerId: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const contacts = await partnerContactService.findByPartnerId(request.params.partnerId, userId, companyId);
        
        return reply.send({
          success: true,
          data: contacts
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Buscar contato primário de um parceiro
   */
  fastify.get<{
    Params: { partnerId: string };
  }>('/partner/:partnerId/primary', {
    handler: async (request: FastifyRequest<{ Params: { partnerId: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const contact = await partnerContactService.findPrimaryByPartnerId(request.params.partnerId, userId, companyId);
        
        return reply.send({
          success: true,
          data: contact
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar contato
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdatePartnerContactDTO;
  }>('/:id', {
    preHandler: [createValidation({ body: updatePartnerContactSchema })],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: UpdatePartnerContactDTO }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const contact = await partnerContactService.update(request.params.id, request.body, userId, companyId);
        
        return reply.send({
          success: true,
          data: contact,
          message: 'Contato atualizado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Excluir contato
   */
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        await partnerContactService.delete(request.params.id, userId, companyId);
        
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Definir contato como primário
   */
  fastify.patch<{
    Params: { id: string };
  }>('/:id/set-primary', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const contact = await partnerContactService.setPrimary(request.params.id, userId, companyId);
        
        return reply.send({
          success: true,
          data: contact,
          message: 'Contato definido como primário com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Verificar disponibilidade de email
   */
  fastify.get<{
    Querystring: { email: string; partnerId: string; excludeId?: string };
  }>('/check-email', {
    handler: async (request: FastifyRequest<{ Querystring: { email: string; partnerId: string; excludeId?: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const { email, partnerId, excludeId } = request.query;
        
        if (!email || !partnerId) {
          return reply.code(400).send({
            success: false,
            message: 'Email e partnerId são obrigatórios'
          });
        }
        
        const result = await partnerContactService.checkEmailAvailability(email, partnerId, userId, companyId, excludeId);
        
        return reply.send({
          success: true,
          data: result
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });
}