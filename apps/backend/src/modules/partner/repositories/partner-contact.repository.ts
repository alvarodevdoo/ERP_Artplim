import { PrismaClient, PartnerContact, Prisma } from '@prisma/client';
import { 
  CreatePartnerContactDTO, 
  UpdatePartnerContactDTO, 
  PartnerContactResponseDTO
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

export class PartnerContactRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria um novo contato do parceiro
   */
  async create(data: CreatePartnerContactDTO, companyId: string): Promise<PartnerContactResponseDTO> {
    try {
      // Verifica se o parceiro existe e pertence à empresa
      const partner = await this.prisma.partner.findFirst({
        where: {
          id: data.partnerId,
          companyId,
          deletedAt: null
        }
      });

      if (!partner) {
        throw new AppError('Parceiro não encontrado', 404);
      }

      // Se for contato primário, remove a flag dos outros contatos
      if (data.isPrimary) {
        await this.prisma.partnerContact.updateMany({
          where: {
            partnerId: data.partnerId,
            isPrimary: true
          },
          data: {
            isPrimary: false
          }
        });
      }

      const contact = await this.prisma.partnerContact.create({
        data
      });

      return this.formatContactResponse(contact);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('Já existe um contato com este email para este parceiro', 409);
        }
      }
      throw new AppError('Erro ao criar contato', 500);
    }
  }

  /**
   * Busca contato por ID
   */
  async findById(id: string, companyId: string): Promise<PartnerContactResponseDTO | null> {
    try {
      const contact = await this.prisma.partnerContact.findFirst({
        where: {
          id,
          partner: {
            companyId,
            deletedAt: null
          }
        }
      });

      return contact ? this.formatContactResponse(contact) : null;
    } catch (error) {
      throw new AppError('Erro ao buscar contato', 500);
    }
  }

  /**
   * Lista contatos de um parceiro
   */
  async findByPartnerId(partnerId: string, companyId: string): Promise<PartnerContactResponseDTO[]> {
    try {
      // Verifica se o parceiro existe e pertence à empresa
      const partner = await this.prisma.partner.findFirst({
        where: {
          id: partnerId,
          companyId,
          deletedAt: null
        }
      });

      if (!partner) {
        throw new AppError('Parceiro não encontrado', 404);
      }

      const contacts = await this.prisma.partnerContact.findMany({
        where: {
          partnerId
        },
        orderBy: [
          { isPrimary: 'desc' },
          { name: 'asc' }
        ]
      });

      return contacts.map(contact => this.formatContactResponse(contact));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar contatos', 500);
    }
  }

  /**
   * Atualiza contato
   */
  async update(id: string, data: UpdatePartnerContactDTO, companyId: string): Promise<PartnerContactResponseDTO> {
    try {
      // Verifica se o contato existe e o parceiro pertence à empresa
      const existingContact = await this.prisma.partnerContact.findFirst({
        where: {
          id,
          partner: {
            companyId,
            deletedAt: null
          }
        }
      });

      if (!existingContact) {
        throw new AppError('Contato não encontrado', 404);
      }

      // Se for contato primário, remove a flag dos outros contatos
      if (data.isPrimary) {
        await this.prisma.partnerContact.updateMany({
          where: {
            partnerId: existingContact.partnerId,
            isPrimary: true,
            id: { not: id }
          },
          data: {
            isPrimary: false
          }
        });
      }

      const contact = await this.prisma.partnerContact.update({
        where: { id },
        data
      });

      return this.formatContactResponse(contact);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Contato não encontrado', 404);
        }
        if (error.code === 'P2002') {
          throw new AppError('Já existe um contato com este email para este parceiro', 409);
        }
      }
      throw new AppError('Erro ao atualizar contato', 500);
    }
  }

  /**
   * Remove contato
   */
  async delete(id: string, companyId: string): Promise<void> {
    try {
      // Verifica se o contato existe e o parceiro pertence à empresa
      const contact = await this.prisma.partnerContact.findFirst({
        where: {
          id,
          partner: {
            companyId,
            deletedAt: null
          }
        }
      });

      if (!contact) {
        throw new AppError('Contato não encontrado', 404);
      }

      await this.prisma.partnerContact.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Contato não encontrado', 404);
        }
      }
      throw new AppError('Erro ao excluir contato', 500);
    }
  }

  /**
   * Define contato como primário
   */
  async setPrimary(id: string, companyId: string): Promise<PartnerContactResponseDTO> {
    try {
      // Verifica se o contato existe e o parceiro pertence à empresa
      const existingContact = await this.prisma.partnerContact.findFirst({
        where: {
          id,
          partner: {
            companyId,
            deletedAt: null
          }
        }
      });

      if (!existingContact) {
        throw new AppError('Contato não encontrado', 404);
      }

      // Remove a flag primário dos outros contatos
      await this.prisma.partnerContact.updateMany({
        where: {
          partnerId: existingContact.partnerId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      });

      // Define este contato como primário
      const contact = await this.prisma.partnerContact.update({
        where: { id },
        data: {
          isPrimary: true
        }
      });

      return this.formatContactResponse(contact);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao definir contato primário', 500);
    }
  }

  /**
   * Busca contato primário de um parceiro
   */
  async findPrimaryByPartnerId(partnerId: string, companyId: string): Promise<PartnerContactResponseDTO | null> {
    try {
      // Verifica se o parceiro existe e pertence à empresa
      const partner = await this.prisma.partner.findFirst({
        where: {
          id: partnerId,
          companyId,
          deletedAt: null
        }
      });

      if (!partner) {
        throw new AppError('Parceiro não encontrado', 404);
      }

      const contact = await this.prisma.partnerContact.findFirst({
        where: {
          partnerId,
          isPrimary: true
        }
      });

      return contact ? this.formatContactResponse(contact) : null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar contato primário', 500);
    }
  }

  /**
   * Verifica se email já existe para o parceiro
   */
  async emailExists(email: string, partnerId: string, excludeId?: string): Promise<boolean> {
    try {
      const contact = await this.prisma.partnerContact.findFirst({
        where: {
          email,
          partnerId,
          ...(excludeId && { id: { not: excludeId } })
        }
      });

      return !!contact;
    } catch (error) {
      throw new AppError('Erro ao verificar email', 500);
    }
  }

  /**
   * Formata resposta do contato
   */
  private formatContactResponse(contact: PartnerContact): PartnerContactResponseDTO {
    return {
      id: contact.id,
      partnerId: contact.partnerId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      position: contact.position,
      department: contact.department,
      isPrimary: contact.isPrimary,
      notes: contact.notes,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    };
  }
}