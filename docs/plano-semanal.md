# Plano semanal por paciente

Em **Pacientes → Plano Semanal**, monte os treinos na grade de segunda a domingo. Também há um seletor de paciente em Modelos e Sessões de Treino.

Cada treino corresponde a um único modelo, independentemente da quantidade de dias vinculados. Por exemplo, A em segunda/quarta e B em terça/quinta produzem dois modelos com `recurrenceDays: [1, 3]` e `[2, 4]`. Editar um treino atualiza todos os seus dias. Desvincular remove somente o dia escolhido; remover o último dia retira o treino do plano.

O formulário aplica alterações localmente. **Salvar Plano Semanal** persiste o conjunto completo. Sair com alterações pendentes exige confirmação. Uma semana sem treinos representa descanso.

## API

- `GET /api/v1/patients/:id/weekly-plan`: retorna `{ patient, routines }`, com os modelos e seus exercícios.
- `PUT /api/v1/patients/:id/weekly-plan`: recebe `{ routines: [{ id?, title, recurrenceDays, exercises: [{ exerciseId, sets, reps }] }] }`.

Ambos exigem autenticação com perfil `PHYSIO`. O PUT valida exercícios existentes, dias entre 0 e 6, séries entre 1 e 200 e títulos distintos por paciente. Um `id` informado deve pertencer a um modelo atual do paciente. A substituição é transacional e altera apenas modelos; sessões agendadas, execuções e vídeos permanecem preservados. O salvamento recria os IDs dos modelos e devolve os novos registros.

A geração global continua usando a semana atual de domingo a sábado, considerando o calendário de `America/Sao_Paulo`. Cada sessão é identificada por paciente, título e data. Datas são gravadas como `YYYY-MM-DD`, sem conversão de fuso. Geração e substituição do plano compartilham uma trava transacional para evitar duplicações em chamadas simultâneas. Editar modelos não altera sessões já geradas.

## Verificação

Execute os builds de `api` e `web`, os testes unitários e HTTP da API. Para verificar persistência, concorrência e rollback no PostgreSQL, execute `node scripts/verify-weekly-plan.cjs` dentro de `api`, com `TEST_DATABASE_URL` apontando exclusivamente para um banco local descartável cujo nome termine em `_tests`. O script cria apenas fixtures sintéticas e recusa bancos fora desse padrão. Use um banco de testes novo para cada execução.
