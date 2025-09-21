import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar empresa de exemplo
  const company = await prisma.company.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      name: 'ArtPlim Móveis Ltda',
      cnpj: '12.345.678/0001-90',
      email: 'contato@artplim.com.br',
      phone: '(11) 99999-9999',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    },
  })

  console.log('✅ Empresa criada:', company.name)

  // Criar roles
  const adminRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'Administrador', companyId: company.id } },
    update: {},
    create: {
      name: 'Administrador',
      description: 'Acesso total ao sistema',
      permissions: JSON.stringify([
        'users:read', 'users:write', 'users:delete',
        'products:read', 'products:write', 'products:delete',
        'quotes:read', 'quotes:write', 'quotes:delete',
        'orders:read', 'orders:write', 'orders:delete',
        'stock:read', 'stock:write',
        'financial:read', 'financial:write', 'financial:delete',
        'reports:read'
      ]),
      companyId: company.id,
    },
  })

  const vendorRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'Vendedor', companyId: company.id } },
    update: {},
    create: {
      name: 'Vendedor',
      description: 'Acesso a vendas e orçamentos',
      permissions: JSON.stringify([
        'quotes:read', 'quotes:write',
        'orders:read', 'orders:write',
        'products:read',
        'stock:read'
      ]),
      companyId: company.id,
    },
  })

  console.log('✅ Roles criados')

  // Criar usuário administrador
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@artplim.com.br' },
    update: {},
    create: {
      email: 'admin@artplim.com.br',
      password: hashedPassword,
      name: 'Administrador',
      companyId: company.id,
    },
  })

  // Criar funcionário para o usuário admin
  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      employeeNumber: 'EMP001',
      department: 'Administração',
      position: 'Administrador Geral',
      salary: 8000.00,
      companyId: company.id,
    },
  })

  console.log('✅ Usuário administrador criado')

  // Criar parceiros (clientes e fornecedores)
  const customer = await prisma.partner.upsert({
    where: { document_companyId: { document: '123.456.789-00', companyId: company.id } },
    update: {},
    create: {
      name: 'João Silva',
      type: 'CUSTOMER',
      document: '123.456.789-00',
      email: 'joao@email.com',
      phone: '(11) 98888-8888',
      address: 'Rua A, 456',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      companyId: company.id,
    },
  })

  const supplier = await prisma.partner.upsert({
    where: { document_companyId: { document: '98.765.432/0001-10', companyId: company.id } },
    update: {},
    create: {
      name: 'Madeiras Premium Ltda',
      type: 'SUPPLIER',
      document: '98.765.432/0001-10',
      email: 'vendas@madeiraspremium.com.br',
      phone: '(11) 97777-7777',
      address: 'Av. Industrial, 789',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      companyId: company.id,
    },
  })

  console.log('✅ Parceiros criados')

  // Criar insumos
  const madeira = await prisma.inputItem.upsert({
    where: { id: 'madeira-mdf-15mm' },
    update: {},
    create: {
      id: 'madeira-mdf-15mm',
      name: 'MDF 15mm',
      description: 'Chapa de MDF 15mm - 2,75x1,83m',
      unit: 'UN',
      costPrice: 85.00,
      supplier: 'Madeiras Premium Ltda',
      minStock: 10,
      currentStock: 50,
      companyId: company.id,
    },
  })

  console.log('✅ Insumos criados')

  // Criar acabamentos
  const acabamento = await prisma.finish.upsert({
    where: { id: 'laminado-branco' },
    update: {},
    create: {
      id: 'laminado-branco',
      name: 'Laminado Branco',
      description: 'Laminado melamínico branco texturizado',
      type: 'LAMINADO',
      color: 'Branco',
      texture: 'Texturizado',
      additionalCost: 15.00,
      companyId: company.id,
    },
  })

  console.log('✅ Acabamentos criados')

  // Criar produtos
  const mesa = await prisma.product.upsert({
    where: { sku_companyId: { sku: 'MESA-001', companyId: company.id } },
    update: {},
    create: {
      name: 'Mesa de Escritório',
      description: 'Mesa de escritório em MDF com acabamento laminado',
      sku: 'MESA-001',
      category: 'Móveis de Escritório',
      unit: 'UN',
      costPrice: 250.00,
      salePrice: 450.00,
      minStock: 5,
      currentStock: 15,
      companyId: company.id,
    },
  })

  // Criar variantes do produto
  await prisma.variant.upsert({
    where: { sku_companyId: { sku: 'MESA-001-120', companyId: company.id } },
    update: {},
    create: {
      productId: mesa.id,
      name: 'Mesa 120cm',
      sku: 'MESA-001-120',
      attributes: JSON.stringify({ largura: '120cm', profundidade: '60cm', altura: '75cm' }),
      costPrice: 250.00,
      salePrice: 450.00,
      currentStock: 8,
      companyId: company.id,
    },
  })

  await prisma.variant.upsert({
    where: { sku_companyId: { sku: 'MESA-001-150', companyId: company.id } },
    update: {},
    create: {
      productId: mesa.id,
      name: 'Mesa 150cm',
      sku: 'MESA-001-150',
      attributes: JSON.stringify({ largura: '150cm', profundidade: '60cm', altura: '75cm' }),
      costPrice: 300.00,
      salePrice: 550.00,
      currentStock: 7,
      companyId: company.id,
    },
  })

  console.log('✅ Produtos e variantes criados')

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })