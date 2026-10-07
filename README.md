# SITF — execução e segurança

Para publicar uma instalação de validação com PostgreSQL/Storage Supabase e NestJS/Vue no Render gratuito, siga [o guia de deploy](docs/deploy-supabase.md). O modo de nuvem exige dados exclusivamente fictícios; a instalação clínica continua usando MinIO local.

A aplicação principal está em `api/` (NestJS) e `web/` (Vue 3). Inclui pacientes, exercícios, prescrições, execuções, upload particionado, agenda local e listener opcional HL7 ADT^A01.

## Configuração

Copie `.env.example` para `.env` na raiz e configure as credenciais do PostgreSQL e MinIO. Copie `api/.env.example` para `api/.env`, usando as mesmas credenciais, e configure `JWT_SECRET` aleatório com pelo menos 32 caracteres. Use `web/.env.example` para alterar o endereço da API.

```powershell
docker compose up -d
npm --prefix api ci
npm --prefix web ci
cd api
npm run migration:run
cd ..
npm run start:dev
```

Em outro terminal, execute `npm run web:dev`. Frontend: `http://localhost:5173`. API: `http://localhost:3000/api/v1`.

Para provisionar o administrador, configure temporariamente `SEED_ADMIN=true`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mínimo 12 caracteres) em `api/.env`. Após a criação, desative o seed e remova a senha do arquivo. Em instalações antigas com `admin/admin`, use `ADMIN_EMAIL=admin` e uma senha forte para substituir a credencial legada; a API bloqueia a inicialização com a senha padrão.

## Verificação

```powershell
npm run build
npm run web:build
npm --prefix api test -- --runInBand
npm --prefix api run test:e2e -- --runInBand
```

Leia [segurança e operação](docs/seguranca-e-operacao.md) antes de implantar. O código em `src/` e `test/` na raiz é legado; os scripts principais delegam para `api/`. Google Calendar e o túnel público automático estão desativados. Os controles não constituem certificação LGPD/HIPAA.

## Visão e documentação originais

Bem-vindo ao repositório base do projeto SITF. Este repositório conterá o código fonte e as especificações necessárias para o desenvolvimento de uma plataforma de teleabilitação fisioterapêutica, focada na segurança de dados médicos (LGPD/HIPAA) e interoperabilidade.

## Estrutura de Documentação

Os documentos fundamentais do sistema já foram consolidados e encontram-se na pasta `docs/`:

- [Documentação de Arquitetura e Engenharia de Software](./docs/documentacao_sistema_saude_nestjs_dev.md): Descreve a visão geral, infraestrutura (via Docker Compose), tech stack e o fluxo crítico de upload de vídeos de forma particionada (Chunked).
- [Padrões de Projeto](./docs/padroes_de_projeto_sitf.md): Detalha os Design Patterns utilizados ao longo das aplicações NestJS (Backend), Vue.js (Frontend) e Flutter (Mobile).
- [Design System e UI/UX](./docs/design_system.md): Diretrizes visuais, tipografia, paleta de cores médicas e acessibilidade (paciente/fisioterapeuta).

Os documentos originais representam a visão inicial; o guia de segurança registra os contratos e controles atuais.
