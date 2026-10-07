---
name: Contexto de Produto e Regras de Negócio (SITF)
description: Descreve o escopo, as regras de negócio e a visão do produto SITF (Teleabilitação). Deve ser invocada sempre que o agente for planejar e criar novas features.
---

# Contexto de Produto (SITF)

## Visão do Produto
O **Sistema Integrado de Teleabilitação Fisioterapêutica (SITF)** resolve o problema de acompanhamento remoto de pacientes em reabilitação motora. Para assegurar total aderência às normas de privacidade (LGPD/HIPAA), o sistema é construído como uma solução *on-premise*, onde o servidor principal fica fisicamente no consultório/clínica do fisioterapeuta, sem exposição de mídia a provedores de nuvem pública.

## Casos de Uso Centrais
1. **Integração Hospitalar (HL7):** Escuta passiva e recepção de dados demográficos de pacientes do hospital central via mensagens de rede TCP (padrão HL7 v2 - Eventos ADT^A01).
2. **Prescrição e Visualização (Profissional Web):** Um Web App seguro onde o fisioterapeuta cadastra planos de tratamento, acessa o histórico e avalia visualmente o progresso reproduzindo os vídeos dos pacientes.
3. **Gravação e Envio (Paciente Mobile):** Aplicativo mobile focado em gravar os movimentos guiados. Dada a alta resolução (vídeos >500MB), os arquivos sofrem compressão no celular e são fragmentados, sendo transmitidos em pequenos pedaços (Chunked Uploads) para o servidor da clínica.

## Regras de Negócio Críticas
- **Segurança de Mídia (Zero-Trust):** Vídeos não têm URLs fixas públicas. O acesso a eles exige geração dinâmica de URLs pré-assinadas temporárias (Pre-Signed URLs geradas via MinIO) pela API, validadas pela sessão JWT do fisioterapeuta.
- **Trilha de Auditoria Obrigatória:** Visualizações de vídeo, prescrições de treinos e modificações de prontuário devem gerar registros inalteráveis de log indicando usuário, IP e momento do acesso.
- **Processamento Assíncrono:** O servidor Web (NestJS) deve responder quase instantaneamente à chegada dos fragmentos de vídeo. A montagem (`assembly`) dos pedaços do vídeo em um único arquivo `.mp4` deve acontecer em background para não sobrecarregar as respostas à rede ou desconectar o mobile por *timeout*.

## Instrução ao Agente:
Mantenha rigorosa observância a este contexto em momentos de **Planejamento de Arquitetura**, **Revisão de Código** e **Design de Banco de Dados**. Nenhuma nova funcionalidade pode transpor o isolamento dos dados dos pacientes.
