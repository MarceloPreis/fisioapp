# Evolução do paciente

Na lista de pacientes, a ação **Ver progresso** abre `/patients/:id/progress`. O fisioterapeuta da clínica pode consultar o histórico e adicionar vários relatórios, com título e conteúdo Markdown. A tela tem pré-visualização, autor, data e ordenação dos registros mais recentes primeiro. Rascunhos permanecem na tela em caso de erro; sair com texto não salvo exige confirmação.

O botão **Novo relatório** abre um modal com cabeçalho e rodapé fixos, conteúdo com rolagem interna, foco no título e fechamento por Cancelar, botão de fechar ou Escape. Texto não salvo exige confirmação de descarte. O histórico permanece na tela principal.

Cada relatório salvo permanece no histórico. Não há edição ou exclusão nesta versão; correções e novas observações devem ser registradas em outro relatório. Pacientes com relatórios não podem ser excluídos, preservando seu histórico clínico.

## Backend

- `GET /api/v1/patients/:patientId/reports`: paciente (ID e nome) e relatórios da clínica autenticada.
- `POST /api/v1/patients/:patientId/reports`: `{ title, content }`, com título de 1 a 200 caracteres e texto de 1 a 100.000 caracteres após trim.

As rotas exigem JWT e role PHYSIO. A clínica e o autor vêm da autenticação. A migração `PatientReports1791400000000` cria `patient_reports`, com FKs compostas para paciente e autor na mesma clínica, índice de histórico e trigger que impede alteração, exclusão ou truncamento. A inclusão gera auditoria de tentativa e conclusão com usuário, IP, tenant, identificador e data, sem registrar o conteúdo clínico nos logs.

O Markdown fica no PostgreSQL local. A visualização usa [Marked](https://marked.js.org/using_advanced) e [DOMPurify](https://github.com/cure53/DOMPurify), com uma lista explícita de elementos de texto permitidos. Scripts, atributos HTML, imagens, iframes e recursos externos são removidos da exibição. Nenhum laudo é enviado a serviços externos para processamento ou renderização.

## Verificação

Os testes unitários validam isolamento, contexto de autor e conteúdo. Os testes HTTP verificam autenticação, autorização, payloads e auditoria. `npm --prefix api run test:tenant:db` verifica a migração, vários relatórios, persistência Markdown e restrições do histórico em um schema temporário com dados sintéticos e rollback.
