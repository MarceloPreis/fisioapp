# Publicação gratuita para validação: Supabase + Render

Esta branch prepara o PostgreSQL e o Storage no Supabase e hospeda NestJS e Vue juntos no Render. Supabase não hospeda diretamente este servidor NestJS. O resultado é um único endereço HTTPS, sem depender do computador do desenvolvedor.

Use um projeto novo, exclusivamente com dados fictícios e vídeos de demonstração sem conteúdo clínico real. `CLOUD_VALIDATION_ONLY=true` reconhece essa restrição; não anonimiza nem verifica os dados enviados. A integração hospitalar fica desativada. A instalação clínica mantém `STORAGE_PROVIDER=minio`.

## 1. Publicar a branch

Revise as alterações e envie a branch `Supabase` ao GitHub. Não inclua `.env`, credenciais, vídeos, backups ou dados de pacientes. `api/.env.supabase.example` é um modelo sem credenciais reais.

## 2. Criar o Supabase Free

1. Crie um projeto Free em https://supabase.com/dashboard.
2. Em **Connect**, selecione **Session pooler**, porta **5432**. Copie a URI administrativa exibida no painel. O pooler de sessão suporta IPv4; não use o pooler de transação para as migrações.
3. Substitua o marcador de senha e codifique caracteres especiais da senha na URI. Não acrescente `sslmode`: o projeto configura TLS verificado por `DB_SSL=true`.
4. Se a conexão exigir uma CA específica, obtenha o certificado no painel e configure `DB_SSL_CA` (PEM) ou `DB_SSL_CA_FILE`. Não desabilite a verificação do certificado.

## 3. Migrar o banco novo

Use uma sessão separada do PowerShell na raiz do repositório. As variáveis abaixo têm precedência sobre o `.env` local:

```powershell
$env:MIGRATION_DATABASE_URL = '<URI administrativa do Session pooler>'
$env:DB_SSL = 'true'
# Se necessário:
# $env:DB_SSL_CA_FILE = 'C:\caminho\supabase-ca.crt'

npm --prefix api ci
npm --prefix api run migration:run
```

As migrações criam o schema, os triggers de imutabilidade e a clínica inicial `00000000-0000-4000-8000-000000000001`. Não use `DB_SYNCHRONIZE=true`. Não importe o banco clínico local. Não use `LEGACY_SINGLE_TENANT_CONFIRMED=true` para contornar erros num banco populado.

Para executar migrações já compiladas, use `npm --prefix api run migration:run:prod` após `npm --prefix api run build`. Migrações usam `MIGRATION_DATABASE_URL` quando configurada; a API nunca usa essa variável como conexão de execução.

Feche essa sessão depois da migração. Não adicione a URI administrativa ao ambiente do Render.

## 4. Provisionar o usuário de execução

1. No **SQL Editor** do Supabase, execute o conteúdo de `api/scripts/supabase-runtime.sql`.
2. Em uma execução separada, configure uma senha exclusiva:

```sql
ALTER ROLE sitf_runtime LOGIN PASSWORD '<senha forte exclusiva>';
```

3. Monte a URI de execução usando o mesmo host do Session pooler, porta 5432, banco `postgres`, usuário `sitf_runtime.<referência do projeto>` e a nova senha codificada na URI.

O script restringe as tabelas à API, habilita RLS e retira acesso de `anon` e `authenticated`. A autorização por clínica continua no NestJS; o usuário de banco não deve ser entregue ao frontend. Auditoria e relatórios têm apenas SELECT/INSERT e conservam os triggers de imutabilidade. A API de produção recusa o proprietário da auditoria e superusuários.

Após migrações futuras, atualize a lista de tabelas do script se necessário e execute novamente as permissões antes de disponibilizar a nova versão.

## 5. Criar o armazenamento privado

1. Em **Storage**, crie `videos` com **Public bucket desativado**.
2. Limite os arquivos a 50 MB e permita `video/mp4`.
3. Copie a URL do projeto (origem HTTPS, sem `/storage/v1`) para `SUPABASE_URL`.
4. Copie a chave secreta de servidor (`sb_secret_...`) para `SUPABASE_SECRET_KEY`. A chave legada `service_role` também é aceita em `SUPABASE_SERVICE_ROLE_KEY`; a chave secreta tem precedência quando ambas existem. Não use chave anon/publishable.

Não crie políticas públicas para o bucket. Uploads são autorizados pelo NestJS e enviados com o SDK oficial; a chave administrativa existe somente no backend. Links de reprodução expiram em até cinco minutos. A API rejeita iniciar se o bucket estiver ausente ou público.

## 6. Publicar no Render Free

1. Acesse https://dashboard.render.com e conecte o repositório GitHub.
2. Escolha **New → Blueprint**, selecione a branch `Supabase` e use `render.yaml` da raiz. Confira **Free** no serviço criado.
3. Preencha as variáveis solicitadas:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | URI do usuário `sitf_runtime`, não do administrador |
| `DB_SSL_CA` | CA PEM se necessária; deixe vazio se a cadeia já for confiável |
| `SUPABASE_URL` | `https://<referência>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Chave secreta de servidor do projeto |
| `CORS_ORIGINS` | Origem HTTPS exata atribuída pelo Render, sem barra final |
| `ADMIN_EMAIL` | Identificador de login do fisioterapeuta de demonstração |
| `ADMIN_PASSWORD` | Senha inicial com pelo menos 12 caracteres |
| `SEED_ADMIN` | `true` somente para provisionar o administrador no primeiro deploy |

O Blueprint solicita `SEED_ADMIN` e gera `JWT_SECRET`. Confirme o domínio atribuído no painel; se ele diferir de `sitf-validation.onrender.com`, ajuste `CORS_ORIGINS` e faça novo deploy. Não use `*`.

Se preferir **New → Web Service**, configure manualmente:

| Campo | Valor |
| --- | --- |
| Branch | `Supabase` |
| Runtime | Node |
| Root Directory | Vazio |
| Plan | Free |
| Build Command | `npm --prefix api ci --include=dev && npm --prefix web ci --include=dev && npm --prefix api run build && npm --prefix web run build` |
| Start Command | `npm --prefix api run start:prod` |
| Health Check Path | `/health` |

Cadastre também todas as variáveis de `render.yaml`; nesse fluxo gere manualmente `JWT_SECRET`, com pelo menos 32 caracteres aleatórios. Use Node 22.22.0 ou uma versão mais recente compatível com as dependências.

As migrações são feitas antes do deploy, com credenciais separadas. O startup não recebe senha administrativa nem executa migrações automaticamente. O build inclui as ferramentas TypeScript mesmo com `NODE_ENV=production`.

## 7. Primeiro acesso

1. Aguarde o deploy terminar e abra `https://<serviço>.onrender.com/health`; deve retornar `{"status":"ok"}`. O endpoint confirma a inicialização, mas não faz monitoramento contínuo das dependências.
2. Abra `/login` e entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
3. Crie um paciente fictício, prescreva exercícios e teste uma execução com MP4 pequeno.
4. Confirme a reprodução pelo fisioterapeuta e atualize uma rota interna para validar o Vue Router.
5. Em **Environment**, mude `SEED_ADMIN=false`, remova `ADMIN_PASSWORD` e faça novo deploy. O Blueprint usa `sync: false` para preservar essa configuração em sincronizações posteriores.
6. Compartilhe o link HTTPS e as contas de teste. Não é necessário configurar Supabase Auth: o projeto continua usando suas contas NestJS e cookie HttpOnly.

## 8. Verificação local

```powershell
npm --prefix api run build
npm --prefix web run build
npm --prefix api test -- --runInBand
npm --prefix api run test:e2e -- --runInBand
```

Para testar o frontend e backend juntos, configure `SERVE_WEB=true`, compile o Vue e inicie a API. Use HTTPS ao testar cookies com `NODE_ENV=production`; para desenvolvimento HTTP local use `NODE_ENV=development`. No modo Vite, `/api` é encaminhado para `localhost:3000`, preservando o caminho relativo `/api/v1`.

Existe também `npm --prefix api run test:supabase:db`, que aceita apenas `TEST_DATABASE_URL` apontando para localhost e um banco vazio com nome terminado em `_tests`. Execute-o exclusivamente num container PostgreSQL descartável: ele cria papéis locais para simular Supabase, aplica todas as migrações e confere RLS, permissões e auditoria com dados sintéticos. Não use o PostgreSQL clínico/local de desenvolvimento; esse teste não remove seus recursos automaticamente.

## Limites e diagnóstico

- Render Free suspende após inatividade. A primeira visita pode levar cerca de um minuto. Não cadastre método de pagamento se quiser evitar cobrança por excedentes; confirme as condições vigentes da conta.
- Render não persiste os fragmentos temporários. Se a instância reiniciar durante upload/montagem ou antes de associar o vídeo à execução, reenvie o arquivo. Vídeos já armazenados persistem no Supabase, mas objetos não associados podem consumir a cota e precisam de limpeza manual após verificar que não são usados.
- O Supabase Free tem cotas de banco, arquivos e tráfego; pode pausar após uma semana de inatividade. Não há garantia de disponibilidade contínua.
- `STORAGE_PROVIDER=minio` mantém 512 MiB por vídeo por padrão; `supabase` limita a até 50 MiB. `MAX_VIDEO_MB` pode reduzir o limite. O frontend consulta `/api/v1/videos/limits`, autenticado, antes do upload.
- **Erro de auditoria:** confira migrações, script de permissões e usuário `sitf_runtime`; não desative o controle.
- **Erro de certificado:** configure a CA; não use `rejectUnauthorized=false`.
- **Login retorna 403:** confira `CORS_ORIGINS` com o endereço real do Render.
- **Erro de armazenamento no startup:** confira projeto, chave de servidor e bucket privado.

Fontes: [Render Free](https://render.com/docs/free), [Blueprint](https://render.com/docs/blueprint-spec), [Supabase PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Storage privado](https://supabase.com/docs/guides/storage/security/access-control), [limites de arquivos](https://supabase.com/docs/guides/storage/uploads/file-limits).
