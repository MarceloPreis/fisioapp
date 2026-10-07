# Roadmap de Desenvolvimento (TCC) - SITF

Este roadmap foi desenhado para guiar o desenvolvimento do seu Trabalho de Conclusão de Curso (TCC) do **Sistema Integrado de Teleabilitação Fisioterapêutica (SITF)**, levando em consideração todas as regras de negócio clínicas (LGPD/HIPAA), integrações (HL7) e processamentos pesados (Vídeos em chunks) estabelecidos no projeto.

## 📌 Fase 1: Fundação, Infraestrutura e Modelagem (Atual)
Nesta fase, estabelecemos as bases do projeto. Grande parte já está feita (estrutura base NestJS + Vue + Docker).
- [x] **Setup Inicial:** Estrutura de diretórios (`/api`, `/web`, `AGENTS.md`).
- [x] **Infraestrutura On-Premise:** Docker Compose configurado (PostgreSQL, MinIO e Cloudflared Tunnel).
- [ ] **Modelagem do Banco de Dados (ERD):** Definir as tabelas e relações no PostgreSQL (Prisma/TypeORM):
  - Entidades centrais: `Profissional`, `Paciente`, `PlanoTratamento`, `Exercicio`, `SessaoGravada`, `AuditLog`.
- [ ] **Integração Básica do Backend:** Conectar o NestJS ao PostgreSQL e configurar o SDK do MinIO.

## 🔐 Fase 2: Backend Core e Segurança (Zero-Trust)
Foco em garantir que os dados de saúde estejam protegidos, um pilar fortíssimo para justificar seu TCC.
- [ ] **Módulo de Autenticação:** Implementar login JWT com controle de acesso (RBAC) para os Fisioterapeutas.
- [ ] **Trilha de Auditoria (Audit Logs):** Criar interceptors/middlewares no NestJS que gravem em banco automaticamente `[Quem, O quê, Quando, Qual IP]` para todas as ações em prontuários e acessos a mídia.
- [ ] **Serviço de Mídia (Zero-Trust):** Lógica no NestJS para comunicar com o MinIO e gerar **Pre-Signed URLs** temporárias. Nenhum vídeo deve ser público.

## 🏥 Fase 3: Integrações e Processamento Complexo
Aqui estão os principais desafios técnicos que darão brilho ao TCC (ótimo para a banca avaliar).
- [ ] **Listener HL7 v2:** Subir um servidor TCP (no ecossistema do NestJS) para escutar e processar mensagens `ADT^A01` do sistema de gestão hospitalar, sincronizando dados de pacientes no banco.
- [ ] **Uploads Resilientes (Chunking):** Criar endpoint HTTP para receber fragmentos pequenos de arquivos (Chunks) vindos dos pacientes, armazenando temporariamente.
- [ ] **Filas e Processamento Assíncrono:** Usar filas (ex: *BullMQ* com Redis) para pegar os chunks armazenados e fazer o *Assembly* (montagem) do arquivo final `.mp4` no MinIO em background.

## 🖥️ Fase 4: Frontend Web (Portal do Fisioterapeuta)
Construção da interface usando Vue.js 3, Composition API e TailwindCSS.
- [ ] **Design System e Layout:** Criação da base visual (Sidebar, Header, sistema de navegação e proteção de rotas).
- [ ] **Painel de Pacientes:** Listagem de pacientes integrados via HL7 e visualização de seus prontuários.
- [ ] **Prescrição de Tratamento:** Interface para o fisioterapeuta montar um plano de reabilitação.
- [ ] **Visualização de Resultados:** Player de vídeo integrado e seguro que consome a URL Pré-assinada para que o profissional avalie os movimentos do paciente.

## 📱 Fase 5: Aplicativo Mobile (Paciente) *
*(Dependendo do escopo do seu TCC, pode ser mockado, apenas uma API, ou desenvolvido em Flutter/React Native).*
- [ ] **Câmera e Compressão:** Gravação nativa e compressão em hardware para diminuir o tamanho do arquivo localmente.
- [ ] **Lógica de Fragmentação:** Dividir o vídeo de 500MB+ em pacotes de, por exemplo, 5MB.
- [ ] **Resiliência de Rede:** Enviar os chunks um a um, com sistema de *retry* em caso de queda de internet.

## 🧪 Fase 6: Validação, Testes e Documentação Acadêmica
Fechamento do projeto provando que a teoria foi aplicada com sucesso.
- [ ] **Testes de Integração:** Simular o envio de mensagens HL7 e garantir a persistência correta.
- [ ] **Testes de Carga (Vídeo):** Simular o envio massivo de chunks para testar se a fila do backend engargala.
- [ ] **Revisão de Segurança (LGPD):** Testar bloqueio de acessos não autorizados a URLs de vídeo expiradas.
- [ ] **Escrita da Monografia:** Documentar a arquitetura distribuída, justificar a abordagem on-premise + zero trust, e demonstrar métricas do processamento assíncrono.
