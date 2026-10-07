# Constituição e Regras Globais do Agente (SITF)

Este documento define as diretrizes globais para a atuação da Inteligência Artificial (Agent/Gemini) no repositório do Sistema Integrado de Teleabilitação Fisioterapêutica (SITF).

## 1. Autonomia e Segurança
- **Autonomia Segura:** O agente tem permissão para criar, modificar e estruturar arquivos de código, bem como instalar dependências via terminal (CLI) de forma autônoma e proativa.
- **Ações Críticas:** O agente deve solicitar revisão ou confirmação explícita do usuário antes de realizar deleções de arquivos em massa, sobrescrever regras de negócio sensíveis de saúde ou executar comandos destrutivos no banco de dados (ex: drop databases/tables).

## 2. Tech Stack Oficial
- **Backend:** Node.js com NestJS, PostgreSQL e MinIO (Armazenamento de Vídeo on-premise).
- **Frontend Web:** Vue.js 3 (Composition API, `<script setup>`), Tailwind CSS.
- **Infraestrutura Local:** Docker e Docker Compose (para banco de dados PostgreSQL e MinIO rodando em localhost).
- **Integração Clínica:** Listener TCP para processamento de mensagens HL7 v2.

## 3. Padrões de Diretórios e Nomenclatura
- **Diretórios Base:**
  - `/api`: Contém toda a aplicação backend NestJS.
  - `/web`: Contém a aplicação frontend Vue.js.
  - `/docs`: Documentação técnica, arquitetura e patterns.
  - `/.agents`: Diretório exclusivo de contexto, skills e configurações das IAs colaboradoras.
- **Nomenclatura (Naming Conventions):**
  - NestJS/Typescript: `kebab-case` para arquivos (`patient.service.ts`), `PascalCase` para classes/tipos, e `camelCase` para propriedades e métodos.
  - Vue: `PascalCase` para componentes (`PatientCard.vue`).

## 4. Restrições e Conformidade
- O sistema deve operar estritamente aderente às normas globais de saúde (LGPD/HIPAA).
- NUNCA submeter, enviar, emular ou registrar dados reais de pacientes em logs não criptografados ou serviços Cloud públicos.
- Todo e qualquer vídeo ou anexo médico de paciente deve obrigatoriamente residir na estrutura On-Premise (MinIO Local).
