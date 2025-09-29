# Arquitetura do Projeto ArtPlimERP

Este documento fornece uma visão geral da arquitetura do projeto ArtPlimERP, suas tecnologias e a estrutura do código.

## 1. Visão Geral

O ArtPlimERP é um projeto **monorepo** gerenciado com **PNPM Workspaces**. Ele é construído inteiramente em **TypeScript**, garantindo consistência e segurança de tipos em todo o ecossistema.

A estrutura é dividida principalmente em duas áreas:
- `apps/`: Contém as aplicações principais (frontend e backend).
- `packages/`: Contém pacotes compartilhados (código, tipos, etc.) usados pelas aplicações.

## 2. Estrutura do Monorepo

- **`apps/backend`**: A aplicação do servidor (API).
- **`apps/frontend`**: A aplicação do cliente (interface do usuário).
- **`packages/shared`**: Lógica de negócios, utilitários e constantes compartilhadas entre frontend e backend.
- **`packages/types`**: Definições de tipos e interfaces TypeScript compartilhadas.

## 3. Backend (`apps/backend`)

- **Framework**: **Fastify**, um framework web de alta performance e baixo overhead para Node.js.
- **Linguagem**: TypeScript.
- **Banco de Dados**: **PostgreSQL**, com o **Prisma** como ORM para acesso e migrações de dados.
  - O schema do banco de dados está definido em `apps/backend/prisma/schema.prisma`.
- **Estrutura de Código**: O backend segue uma arquitetura modular, com a lógica de negócios organizada por domínios (ex: `product`, `user`, `order`) dentro de `apps/backend/src/modules`.
- **Autenticação**: Utiliza JSON Web Tokens (JWT) através do plugin `@fastify/jwt`.
- **Scripts Principais**:
  - `dev`: Inicia o servidor em modo de desenvolvimento com `tsx`.
  - `build`: Compila o código TypeScript para JavaScript.
  - `db:migrate`: Executa migrações do Prisma.
  - `db:seed`: Popula o banco de dados com dados iniciais.

## 4. Frontend (`apps/frontend`)

- **Framework**: **React 18**.
- **Build Tool**: **Vite**, proporcionando um desenvolvimento rápido e eficiente.
- **Linguagem**: TypeScript com JSX (`.tsx`).
- **Roteamento**: **React Router DOM** (`react-router-dom`) para navegação e gerenciamento de rotas.
- **Estilização**: **Tailwind CSS** para estilização utilitária, com `postcss`. A configuração pode ser encontrada em `tailwind.config.js`.
- **Componentes UI**: Utiliza **Radix UI** como base para componentes de UI acessíveis e não estilizados, combinado com `lucide-react` para ícones.
- **Gerenciamento de Estado**:
  - **Zustand**: Para gerenciamento de estado global (ex: estado de autenticação).
  - **TanStack Query (React Query)**: Para gerenciamento de estado do servidor (caching, re-fetching, etc.).
- **Formulários**: **React Hook Form** com **Zod** para validação de schemas.
- **Estrutura de Código**:
  - `src/pages`: Componentes que representam as páginas da aplicação.
  - `src/components`: Componentes reutilizáveis.
  - `src/services`: Funções para comunicação com a API.
  - `src/hooks`: Hooks customizados.
  - `src/stores`: Lojas de estado do Zustand.

## 5. Pacotes Compartilhados (`packages`)

- **`packages/shared`**: Contém código que pode ser reutilizado em qualquer aplicação do monorepo. Ideal para validações, utilitários, constantes, etc.
- **`packages/types`**: Centraliza todas as definições de tipo (interfaces, types) que são compartilhadas entre o frontend e o backend, garantindo consistência nos contratos de dados.

## 6. Ferramentas e Configuração

- **Gerenciador de Pacotes**: **PNPM** (versão 8.15.0 ou superior).
- **TypeScript**: A configuração base está em `tsconfig.json` na raiz, com aliases de caminho (`@shared`, `@types`, etc.) para facilitar as importações.
- **Linting**: **ESLint** para análise estática de código.
- **Formatação**: **Prettier** para formatação de código consistente.
- **Containerização**: **Docker** e `docker-compose.yml` para orquestrar o ambiente de desenvolvimento (ex: banco de dados PostgreSQL).
- **Deploy**: A presença de `vercel.json` sugere que o projeto pode ser implantado na Vercel.
