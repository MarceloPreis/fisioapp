# Design System e Diretrizes de UI/UX - SITF

Este documento estabelece as diretrizes de design de interface (UI) e experiência do usuário (UX) para o Sistema Integrado de Teleabilitação Fisioterapêutica (SITF), abrangendo o Web App (Fisioterapeuta) e o App Mobile (Paciente).

## 1. Identidade Visual e Conceito

A identidade segue o padrão de mercado para aplicações modernas de saúde (Healthcare IT). O foco absoluto é em **acessibilidade, clareza, confiança e redução da carga cognitiva**. 

A interface deve transmitir uma sensação clínica, limpa e altamente profissional, facilitando a visualização de dados e prontuários médicos. Sem exageros visuais que possam distrair o profissional.

## 2. Paleta de Cores (Color Palette)

As cores foram selecionadas para garantir um alto contraste (aderência às normas de acessibilidade WCAG) e passar calma ao paciente.

*   **Cor Primária (Medical Blue):** `#1E40AF` (Tailwind `blue-800`). Usada em botões principais, cabeçalhos de destaque e navegação ativa. O azul remete a confiança, higiene e tecnologia em saúde.
*   **Cor Secundária (Soft Teal):** `#0D9488` (Tailwind `teal-600`). Ideal para indicar destaques positivos, métricas de progresso na reabilitação e botões de ação secundária.
*   **Cores de Fundo (Backgrounds):**
    *   **Geral:** `#F8FAFC` (Tailwind `slate-50`) - Tom off-white que diminui a fadiga visual do fisioterapeuta em longas jornadas de trabalho.
    *   **Containers/Cards:** `#FFFFFF` (Branco puro) - Para gerar contraste direto com o fundo geral.
*   **Texto (Typography):**
    *   **Texto Principal:** `#0F172A` (Tailwind `slate-900`) - Preto suave, excelente legibilidade.
    *   **Texto Auxiliar/Mudo:** `#64748B` (Tailwind `slate-500`) - Para metadados e datas.
*   **Status Clínico / Feedbacks:**
    *   **Sucesso** (Ex: Exercício concluído): `#16A34A` (Tailwind `green-600`).
    *   **Alerta** (Ex: Dor moderada relatada, vídeo aguardando revisão): `#D97706` (Tailwind `amber-600`).
    *   **Urgência/Erro** (Ex: Dor aguda relatada, falha no upload): `#DC2626` (Tailwind `red-600`).

## 3. Tipografia

A fonte principal deve ser minimalista, sem serifa (sans-serif) e otimizada para telas e dashboards densos.
*   **Família Sugerida:** `Inter` (para Web) e `Roboto` / `San Francisco` nativo para Mobile.
*   **Escala Tipográfica:**
    *   **H1 (Títulos de Página):** 24px (1.5rem), Semi-bold.
    *   **H2 (Títulos Internos/Cards):** 18px (1.125rem), Medium.
    *   **Corpo (Body):** 16px (1rem), Regular (Garante conforto de leitura).
    *   **Tamanho Menor (Labels/Hints):** 14px (0.875rem), Regular.

## 4. Estrutura de Layout do Web App (Vue 3 + Tailwind)

O painel do fisioterapeuta utilizará um "Master Layout" com navegação lateral (Sidebar).

*   **Sidebar (Navegação):**
    *   **Dashboard:** Visão geral rápida dos pacientes e últimas atualizações.
    *   **Pacientes:** Acesso a prontuários (dados em Tabela) e barra de busca ágil.
    *   **Prescrições:** Área para construção e acompanhamento de treinos em vídeo.
    *   **Auditoria:** Registro de logs vitais para aderência às conformidades (LGPD).
*   **Área de Conteúdo (Main):**
    *   O layout interno das páginas é construído sobre *Cards* brancos, com cantos arredondados (`rounded-lg`) e sombras discretas (`shadow-sm`), proporcionando organização e separação das sessões do paciente.

## 5. Diretrizes para o App Mobile (Flutter)

A interface para o paciente exige foco na Acessibilidade Física, visto que podem existir pacientes com motricidade reduzida, tendinites ou mais velhos.

*   **Áreas de Toque (Touch Targets):** Padrão de tamanho mínimo de botões interagíveis deve ser de `48x48 dp`.
*   **Bottom Navigation (Menu Inferior):** Sem menus escondidos "Hambúrguer". Uso de uma barra inferior simples (Ex: "Meu Treino", "Histórico", "Perfil").
*   **Clareza em Processos Demorados:** O envio de vídeo com uploads particionados (chunked) deve ser acompanhado de uma barra de progresso clara e amigável.
*   **Feedback Háptico:** Usar uma leve vibração ao iniciar ou concluir com sucesso o envio dos vídeos dos exercícios.
