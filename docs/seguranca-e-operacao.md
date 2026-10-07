# Segurança e operação

A API e as migrações carregam `api/.env` e, como alternativa, `.env` da raiz, independentemente do diretório de execução. `DB_USER`, `DB_PASSWORD` e `DB_NAME` têm precedência; instalações existentes podem continuar usando `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`. Variáveis exportadas no ambiente têm precedência sobre os arquivos. Não há senha de banco padrão.

## Acesso

JWT usa cookie HttpOnly, oito horas de validade e chave aleatória por processo no desenvolvimento quando não configurada. Em produção `JWT_SECRET` exige 32 caracteres. A estratégia confere conta e vínculo com paciente em cada requisição. Login permite 20 tentativas por IP em 15 minutos, em memória; múltiplas réplicas exigem limitação compartilhada.

Cadastros e prescrições exigem PHYSIO. Pacientes acessam somente as próprias sessões e execuções e não podem alterar o título da prescrição. Séries enviadas precisam pertencer à sessão e ter o tamanho prescrito. URLs de vídeo são exclusivas do fisioterapeuta e expiram em cinco minutos. Consultas comuns omitem hashes de senha. Fisioterapeutas compartilham o escopo da clínica; não há segregação entre clínicas.

`CORS_ORIGINS` contém origens explícitas separadas por vírgulas. Mutações com Origin não autorizado são rejeitadas. Clientes nativos sem Origin continuam exigindo JWT. Use HTTPS e frontend/API no mesmo site. Não habilite confiança irrestrita em cabeçalhos de proxy. Não registre corpos, cookies ou URLs assinadas no proxy.

## Banco e auditoria

Execute `npm run migration:run` em `api/` com uma conta de migração. Faça backup antes de migrar um banco existente. A migração cria tabelas ausentes e os controles; não reconcilia schemas antigos divergentes. Reversão automática está bloqueada. Apenas o administrador legado conhecido é promovido; demais contas sem vínculo exigem provisionamento explícito.

`DB_SYNCHRONIZE=false` é o padrão; sincronização automática é proibida em produção. `DB_SSL=true` valida certificados. Configure uma CA confiável quando necessária.

Auditoria grava usuário, IP, ação, rota, identificador e horário, sem conteúdo clínico. Tentativa é gravada antes da mutação; conclusão, antes da resposta. Gerar URL de vídeo também é auditado. Se a tentativa falhar, o serviço não executa a operação. A conclusão pode falhar após persistência; nesse caso a tentativa permanece registrada e o cliente deve reconciliar o estado antes de repetir uma criação.

O trigger `sitf_audit_no_mutation` rejeita UPDATE, DELETE e TRUNCATE. Em produção a API exige o trigger e recusa usuário superusuário ou proprietário da tabela. Separe contas de execução e migração: conceda USAGE no schema, permissões necessárias nas tabelas clínicas e apenas SELECT/INSERT em `audit_events`. Administradores do banco ainda podem alterar a estrutura; proteção contra administradores exige auditoria independente na infraestrutura local.

Proteja PostgreSQL, MinIO, backups e `temp_uploads/` com volumes locais criptografados. O Compose é para desenvolvimento, com portas vinculadas a localhost.

## Upload atualizado

Todos os endpoints exigem autenticação:

1. `POST /videos/upload/init`: `{ "totalChunks": 2 }`; retorna `uploadId` vinculado ao usuário.
2. `POST /videos/upload/chunk`: multipart com `uploadId`, `chunkIndex` (a partir de zero) e arquivo `chunk`. Limite de 8 MiB por chunk; repetições idênticas são aceitas, conteúdo conflitante é rejeitado.
3. `POST /videos/upload/complete`: `{ "uploadId": "UUID", "fileName": "video.mp4" }`. Confere todos os chunks e limite de 512 MiB; retorna HTTP 202 com `processing`.
4. `GET /videos/upload/:id`: estado `pending`, `processing`, `complete` ou `failed`; `videoObjectName` aparece apenas após conclusão.
5. `POST /executions`: associação exige proprietário correto do vídeo e da sessão.

O frontend envia chunks de 4 MiB e aguarda processamento por até dez minutos. Vídeo permanece opcional. Seleção de MP4 está implementada; gravação e compressão nativas continuam a cargo do aplicativo mobile, ausente deste repositório.

Montagem usa streaming com backpressure e fila serial em uma instância da API. Chunks e metadados locais permitem retomar trabalhos `processing` após reinício. Há três uploads ativos por usuário. Uploads antigos fora de processamento são limpos na inicialização ou abertura de upload; chunks são removidos após processamento. Várias réplicas exigem fila compartilhada e coordenação externa.

O cabeçalho MP4 é conferido; não há validação completa de codecs, antivírus ou transcodificação. MinIO deve ser alcançável pelos clientes na infraestrutura local. Novas chaves usam `videos/<userId>/<uploadId>.mp4`; vídeos antigos continuam reproduzíveis pelas execuções existentes.

## Agenda e HL7

GET/POST/PUT/DELETE de `/appointments` são exclusivos do fisioterapeuta. Agenda da clínica é compartilhada; edição/exclusão exigem o responsável. Google OAuth não está registrado; módulos legados também bloqueiam seu uso.

HL7 fica desativado por padrão. Habilite `HL7_ENABLED=true` e configure `HL7_HOST`, `HL7_PORT` e `HL7_ALLOWED_IPS`. O padrão é localhost:2575. Use rede privada protegida ou túnel TLS local; o listener não implementa TLS próprio.

Recebe um frame MLLP por conexão, até 64 KiB, timeout de 30 segundos. Suporta ADT^A01 com separadores padrão, PID-3 (prontuário), PID-5 (nome) e PID-7 (nascimento). Faz upsert por prontuário, preserva vínculo de usuário e grava auditoria na mesma transação. Retorna ACK AA/AE sem registrar conteúdo. Outros eventos, codificações e múltiplos frames exigem adaptação e homologação hospitalar.

## Testes e limitações

Testes HTTP usam JWT/cookies reais e repositórios simulados; uploads usam bytes sintéticos e MinIO simulado. `api/scripts/verify-synthetic-db.cjs` aceita exclusivamente `TEST_DATABASE_URL` local com nome terminado em `_tests` e verifica migração, repetição, omissão de hashes e imutabilidade em PostgreSQL real.

Atualizações compatíveis eliminaram alertas altos e críticos observados na API. Restam alertas moderados transitivos do MinIO e ferramentas de teste. Não foi aplicado `npm audit fix --force`, que propunha regressões de versões principais. Revise as dependências antes da implantação clínica.
