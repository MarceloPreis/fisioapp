# Roteiro de teste do SITF — Fisioterapeuta

Olá! Queremos avaliar se o sistema facilita sua rotina de acompanhamento e prescrição. Siga as atividades abaixo e registre erros, dúvidas e sugestões. O objetivo é avaliar o sistema; se algo não estiver claro, isso também é um resultado importante.

**Duração sugerida:** 45 a 60 minutos.

**Link de acesso:** ____________________  
**Usuário de teste:** ____________________  
**Data e nome do avaliador:** ____________________  
**Dispositivo e navegador:** ____________________

## Antes de começar

- A equipe deve fornecer um ambiente de testes, acesso de fisioterapeuta e, para a etapa opcional, acesso de paciente fictício e uma sessão com execução de demonstração.
- Use somente dados fictícios. Não inclua nomes, prontuários, imagens ou vídeos de pacientes reais. Não reutilize senhas pessoais.
- Use um paciente chamado **Paciente Teste — [suas iniciais]**, prontuário **TESTE-[iniciais]-[data]** e nascimento **15/05/1990**. Se o prontuário já existir, acrescente um número.
- Os exercícios e as quantidades deste roteiro são exemplos para testar a interface, sem finalidade de atendimento clínico.
- Em cada etapa, marque **OK**, **Com dificuldade**, **Falhou** ou **Não testado**. Se ficar bloqueado, registre onde parou e continue nas etapas possíveis.

## 1. Entrar e conhecer a tela inicial

1. Acesse o link e entre com as credenciais fornecidas.
2. Localize pacientes, exercícios, modelos e sessões de treino.
3. Observe os indicadores e a agenda na tela inicial.

**Esperado:** acesso ao painel profissional, navegação compreensível e carregamento sem erros. Os números devem ser compatíveis com os dados de teste disponíveis.

**Resultado / observações:** ____________________

## 2. Cadastrar e localizar um paciente

1. Em **Pacientes**, abra o cadastro e tente salvar sem preencher os campos obrigatórios.
2. Preencha os dados fictícios indicados acima e salve.
3. Busque o paciente por parte do nome e pelo prontuário.
4. Edite o nome acrescentando “Validação”, salve e atualize a página.

**Esperado:** campos obrigatórios sinalizados, paciente encontrado e alteração preservada após atualizar. Confirme sempre o nome antes de abrir um plano ou relatório.

**Resultado / observações:** ____________________

## 3. Preparar exercícios

1. Em **Categorias**, crie “Categoria Teste — [iniciais]”.
2. Em **Exercícios**, crie “Exercício Teste A — [iniciais]”, vincule a categoria e escreva uma orientação curta e fictícia.
3. Crie também “Exercício Teste B — [iniciais]”.
4. Busque o exercício A, altere a descrição e confirme que a mudança foi salva.
5. Avalie se os campos permitem orientar o paciente com clareza. Se avaliar regras de movimento e métricas de contagem, registre quais configurações utilizou e eventuais dúvidas.

**Esperado:** exercícios localizáveis, categoria correta e descrição preservada. A configuração deve ser compreensível para o profissional.

**Resultado / observações:** ____________________

## 4. Montar o plano semanal

1. Na lista de pacientes, abra **Plano Semanal** do paciente fictício.
2. Crie “Treino Teste A” para segunda e quarta, com o exercício A: **2 séries de 10 repetições**.
3. Crie “Treino Teste B” para terça e quinta, com o exercício B: **3 séries de 8 repetições**.
4. Aplique as alterações do formulário e clique em **Salvar plano** na tela principal.
5. Atualize a página e confira dias, exercícios e quantidades.
6. Edite o treino A para 3 séries e confira a atualização em todos os dias vinculados. Salve o plano.
7. Desvincule o treino A somente da quarta-feira, salve e confirme que ele continua na segunda.
8. Faça uma nova alteração e tente sair sem salvar. Confira o aviso e escolha permanecer na tela para salvar ou descartar conscientemente.

**Esperado:** o plano persiste após salvar; editar um treino afeta seus dias vinculados; desvincular um dia preserva os demais; sair com alterações pendentes gera aviso.

**Resultado / observações:** ____________________

## 5. Agendar e consultar sessões

1. Em sessões de treino, use **Nova Sessão** para agendar uma sessão avulsa para o paciente fictício, com data e exercícios conhecidos.
2. No seletor de paciente, digite parte do nome e escolha explicitamente o resultado da busca.
3. Filtre a lista pelo paciente e confira título, data, exercícios e status. Edite a sessão avulsa e confirme a alteração.
4. Clique em **Gerar sessões da semana** e confira as sessões do paciente conforme os dias do plano salvo.
5. Repita a geração e verifique se as mesmas sessões foram duplicadas.
6. Altere e salve o plano semanal. Confira que as sessões já geradas mantêm sua configuração anterior.

**Esperado:** agendamento no paciente e na data corretos, filtros funcionais e geração sem duplicação. Alterar o plano não modifica automaticamente sessões já geradas.

**Nota à equipe:** a geração é global. Prepare um ambiente com apenas cadastros fictícios. Para conferir datas, considere a semana de domingo a sábado usada na geração, embora a grade do plano apareça de segunda a domingo.

**Resultado / observações:** ____________________

## 6. Registrar a evolução

1. Em **Pacientes → Ver progresso**, confirme o nome do paciente.
2. Abra **Novo relatório**, com título “Avaliação inicial — teste” e texto “Registro fictício para avaliação do sistema”.
3. Teste a pré-visualização, salve e atualize a página.
4. Crie um segundo relatório: “Reavaliação — teste”. Confira a ordem, o autor e a data dos registros.
5. Abra outro relatório, digite um rascunho e tente fechar sem salvar. Confira a confirmação de descarte.

**Esperado:** os dois relatórios permanecem no histórico, com o mais recente primeiro. Nesta versão, relatórios salvos não têm edição ou exclusão; correções devem ser registradas em um novo relatório.

**Resultado / observações:** ____________________

## 7. Conferir a experiência do paciente e os resultados — opcional

Realize esta etapa se a equipe tiver disponibilizado acesso de paciente e dados de demonstração. Caso contrário, marque **Não testado**.

1. Em outro navegador ou janela privativa, entre como paciente fictício e abra suas sessões.
2. Confira se título, data, exercícios, séries e repetições correspondem à prescrição.
3. Avalie se as instruções são compreensíveis para uma pessoa sem conhecimento técnico.
4. No acesso profissional, abra **Ver Resultados** de uma sessão com execução de demonstração.
5. Confira tentativas, datas e observações. Se houver vídeo de demonstração no armazenamento local da clínica, teste reprodução, pausa e navegação pelos horários das observações.
6. Abra também uma sessão sem execução.

**Esperado:** o paciente vê suas sessões; o profissional consulta os resultados corretos. Ausência de execução ou de vídeo deve ser informada claramente. A gravação e o envio só serão avaliados se esse fluxo estiver preparado pela equipe.

**Resultado / observações:** ____________________

## 8. Encerrar e avaliar a facilidade de uso

1. Teste as principais telas no tamanho de tela que costuma usar no consultório.
2. Confira legibilidade, rolagem, botões e mensagens.
3. Saia da conta e tente abrir novamente uma página interna pela barra de endereço.

**Esperado:** interface utilizável no dispositivo escolhido e solicitação de autenticação ao tentar acessar uma página protegida após sair.

**Resultado / observações:** ____________________

## Como registrar um problema

Copie este modelo para cada ocorrência. Capturas devem conter somente dados fictícios; não inclua senhas.

- **Etapa e tela:**
- **O que tentei fazer:**
- **Passos para repetir:**
- **O que esperava:**
- **O que aconteceu / mensagem exibida:**
- **Impacto:** impediu continuar / dificultou / sugestão de melhoria.
- **Captura de tela, se possível:**

## Feedback final

1. De 1 a 5, quão fácil foi usar o sistema? (1 = muito difícil; 5 = muito fácil.)
2. Conseguiu cadastrar o paciente, prescrever e registrar a evolução sem ajuda? Onde precisou de orientação?
3. As informações disponíveis são suficientes para acompanhar um paciente? O que faltou?
4. Algum termo, botão ou mensagem ficou confuso?
5. Quais são as três melhorias mais importantes para sua rotina?
6. Usaria o sistema na rotina profissional? Por quê?

Obrigado pelo teste! Encaminhe os resultados por etapa, os problemas encontrados e suas sugestões à equipe responsável.
