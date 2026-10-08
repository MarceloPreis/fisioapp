---
name: Diretrizes Visuais e Frontend (SITF)
description: Padrões de UI/UX, tokens de cores, anti-padrões e bibliotecas a serem adotadas na camada Web (Vue 3 / Tailwind). Utilize obrigatoriamente ao criar componentes, fluxos de interface e telas.
---

# Diretrizes Visuais e Frontend

## 1. Stack e Bibliotecas Base
- **Framework Core:** Vue.js 3 (Composition API via `<script setup>`).
- **Estilização:** Tailwind CSS v3+.
- **Ícones:** Lucide Vue (preferencial) ou Heroicons.
- **Roteamento e Estado:** Vue Router + Pinia para comunicação reativa via REST com a API NestJS.

## 2. Tokens de Design (Paleta de Cores Médica)
A identidade deve transmitir exclusividade clínica, sendo minimalista, focada na usabilidade e sem distrações visuais excessivas.
- **Primary (Confiança):** Blue-800 (`#1E40AF`). Utilizado para navegação primária, botões de ação final, e elementos de destaque que remetem a segurança médica.
- **Secondary (Apoio):** Teal-600 (`#0D9488`). Utilizado para sinalizar progresso (ex: evolução de exercícios) e interações não-críticas.
- **Fundo Global (Canvas):** Slate-50 (`#F8FAFC`). O sistema não deve usar branco puro como fundo geral da aplicação para evitar cansaço visual (*eye strain*) durante o expediente do profissional.
- **Fundo de Cartões (Containers):** Branco Puro (`#FFFFFF`) aplicado em cards, separando visualmente as áreas de dados do fundo cinza.
- **Texto e Tipografia:**
  - Primário (Títulos e Dados Base): Slate-900 (`#0F172A`).
  - Secundário (Labels e Dados Menores): Slate-500 (`#64748B`).
- **Feedbacks Semânticos:**
  - Sucesso/Ok: Green-600 (`#16A34A`).
  - Alerta/Pendência: Amber-600 (`#D97706`).
  - Erro/Risco: Red-600 (`#DC2626`).

## 3. Anti-Padrões Visuais (Restrições)
- **NÃO utilize estilizações agressivas ou estéticas temáticas "Dark/Sci-Fi"**: A antiga diretriz estética (Star Trek) foi **revogada**. Foque puramente no paradigma contemporâneo "Healthcare SaaS".
- **NÃO desconsidere áreas de toque seguras:** Elementos clicáveis, primordiais no mobile, exigem áreas mínimas de contato confortáveis (`48x48 px`).
- **NÃO sacrifique o contraste:** Textos miúdos e com contrastes rebaixados inviabilizam a certificação de acessibilidade.

## 4. Tipografia
- **Font-family padrão:** `Inter` (sans-serif).
- **Corpo legível:** Textos em parágrafo não devem ser menores que `16px` para garantir conformidade em acessibilidade clínica.

## 5. Estrutura Modular
O Web App destina-se ao painel administrativo. 
A arquitetura visual primária é baseada em *Master Layout* composto por um **Menu Lateral (Sidebar)** abrigando as rotas (Dashboard, Pacientes, Prescrições, Auditoria) e um **Conteúdo Principal (Main Content)** desenhado predominantemente com Cards organizados em *CSS Grid* ou *Flexbox*.

## 6. Formulários de Cadastro em Modal
- Formulários de cadastro devem abrir em modal a partir da ação da listagem ou da tela de contexto. O cadastro de relatórios de evolução do paciente segue obrigatoriamente esse padrão; não deve aparecer como formulário inline no histórico.
- Use fundo branco, cantos arredondados, sombra e backdrop slate-900/50. O cabeçalho deve conter título e botão de fechar; o rodapé deve conter Cancelar e a ação primária de salvar.
- O modal deve ser responsivo, ter altura limitada à viewport e rolagem interna no conteúdo, mantendo cabeçalho e ações acessíveis.
- Garanta nome acessível, foco inicial no primeiro campo, foco contido no modal e retorno à ação que o abriu. Escape deve solicitar fechamento, respeitando a confirmação de descarte de alterações.
- Preserve o rascunho em caso de erro, confirme o descarte de texto não salvo e bloqueie fechamento e envio duplicado durante o salvamento.

## 7. Componentes de Filtro e Busca
- **Padrão Visual:** Formulários de filtro (ex: filtragem de listas, tabelas ou relatórios) devem utilizar os componentes nativos do sistema ao invés de inputs HTML puros para garantir coesão visual e comportamental (ex: `AppButton`, `DateRangePicker`, `PatientSelect`).
- **Labels:** Não utilize `<label>` soltos externamente aos componentes customizados que já possuem propriedade de label ou placeholder acessível interno (como `hide-label` ou `placeholder` do `PatientSelect`). Isso evita poluição visual e redundância.
- **Layout:** Os filtros devem preferencialmente se apresentar de forma compacta (inline) usando flexbox com `flex-wrap`, `items-center` e gap apropriado, similar ao container de ações de um `<DataTable>` ou `<form class="flex flex-wrap items-center gap-3">`. Elementos não devem ocupar linhas inteiras desnecessariamente.
