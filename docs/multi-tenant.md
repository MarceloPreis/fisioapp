# Isolamento por clínica

Uma conta pertence a uma clínica. E-mails continuam únicos globalmente; profissionais de clínicas diferentes usam contas distintas. Exercícios e categorias são privados nesta versão. Não há seleção de clínica, biblioteca global, administração super-root ou RLS.

## Modelo e autorização

`Tenant` tem UUID, nome, CNPJ opcional e data de criação. Usuários, pacientes, agendamentos, categorias, exercícios, sessões, execuções e auditoria têm `tenantId` obrigatório. Regras de exercício, itens de sessão e notas de execução herdam a clínica do pai; não têm endpoints independentes. O banco verifica a igualdade da clínica nas relações centrais com FKs compostas e no vínculo sessão–exercício com trigger. A propriedade da clínica é imutável para preservar o histórico e os objetos de mídia.

Os tokens contêm `tenantId`. A estratégia JWT confirma a clínica do usuário no banco; tokens anteriores à migração precisam de novo login. O tenant vem do contexto autenticado, nunca de parâmetros enviados pelo cliente. Serviços recusam contexto ausente. A role de paciente continua limitada ao próprio prontuário; agendamentos continuam editáveis e removíveis apenas pelo proprietário, dentro da clínica.

As buscas, planos semanais, geração de sessões, dashboard e URLs de vídeos respeitam o tenant. Novos uploads usam `tenants/{tenantId}/videos/{userId}/{uploadId}.mp4` no MinIO local. Objetos antigos ligados a execuções permanecem acessíveis pelo endpoint autorizado da execução, sem mover vídeos. Uploads antigos ainda em andamento devem ser reiniciados: metadados sem clínica não são aceitos nem retomados automaticamente.

## Migração de uma instalação existente

1. Pare as escritas da aplicação e preserve a configuração local de forma segura.
2. Execute `npm --prefix api run backup:database`. O script gera um dump criptografado em `api/.backups/`, autentica os bytes salvos e restaura o dump em um container PostgreSQL temporário sem rede. Esse container é removido ao final. Docker e a imagem `postgres:15-alpine` são necessários. Configure `BACKUP_DB_CONTAINER` se o container local tiver outro nome.
3. Confirme que todos os dados existentes pertencem à mesma organização. Se não pertencerem, não use o preenchimento automático: prepare antes um mapeamento de propriedade.
4. Defina `LEGACY_SINGLE_TENANT_CONFIRMED=true` apenas para o comando de migração e execute `npm --prefix api run migration:run`.
5. Reinicie a API e faça novo login. `synchronize` permanece desabilitado em todos os ambientes.

A clínica inicial é `00000000-0000-4000-8000-000000000001`, chamada “Clínica SITF”. A migração é transacional, bloqueia escritas nas tabelas afetadas e não deixa um tenant padrão implícito para novos registros. O preenchimento da auditoria usa o valor inicial da nova coluna, preservando o trigger de imutabilidade existente.

O backup usa AES-256-GCM e scrypt. A senha vem de `BACKUP_ENCRYPTION_PASSWORD`, com fallback para `DB_PASSWORD`/`POSTGRES_PASSWORD`; preserve a senha utilizada para recuperar o arquivo. O formato é `SITF1` (5 bytes), salt (16), IV (12), tag (16) e ciphertext de um arquivo `pg_dump -Fc`. A rotina não exporta dados para serviços externos nem imprime SQL clínico. Backups ficam fora do Git. A reversão automática da migração é recusada; uma restauração deve ser planejada para preservar dados posteriores à migração.

## Configuração e novas clínicas

`ADMIN_TENANT_ID` é obrigatório ao habilitar `SEED_ADMIN`. `HL7_TENANT_ID` é obrigatório com `HL7_ENABLED=true`, e a clínica deve existir. Cada listener corresponde a uma integração de clínica configurada; mensagens não escolhem o tenant. O upsert HL7 usa `(tenantId, medicalRecordNumber)`.

Para provisionar outra clínica, um operador autorizado cria o registro em `tenants` e uma conta em `users` com o respectivo `tenantId`, usando hash bcrypt para a senha. Não há endpoint público de provisionamento. `cnpj` pode ser nulo para profissionais independentes. Os pacientes criados pela API recebem a clínica autenticada e suas contas mobile recebem a mesma clínica.

## Verificações

- `npm --prefix api run build`
- `npm --prefix api test -- --runInBand`
- `npm --prefix api run test:e2e -- --runInBand`
- `npm --prefix api run test:tenant:db`

O teste de banco cria um schema temporário dentro de uma transação, migra dados sintéticos e verifica isolamento, geração semanal, dashboard, auditoria e constraints. Tudo é revertido ao final; não consulta prontuários existentes.
