# Seção de Desenvolvimento - Estrutura da Dissertação (TCC)

Abaixo está a proposta de estruturação para o capítulo de **Desenvolvimento** da sua dissertação, projetada para destacar o projeto SITF como um ecossistema multicamadas, focando nas decisões técnicas e arquiteturais.

---

## Capítulo X: Desenvolvimento do Ecossistema da Plataforma

**X.1. Concepção do Ecossistema Multicamadas**
*   **Descrição:** Introduzir a seção explicando a transição de um aplicativo isolado para uma plataforma completa. Abordar as necessidades divergentes dos atores principais: o **paciente** (foco em usabilidade móvel, captura de vídeo e conectividade intermitente) e o **fisioterapeuta** (foco em visualização em telas maiores, segurança, auditoria e prescrição clínica).
*   **O que escrever:** Justificativa da divisão do sistema em camadas independentes (Frontend Web, Aplicativo Mobile, API Central, Serviço de Armazenamento Seguro e Módulo de Integração HL7).

**X.2. Arquitetura Orientada à Privacidade (On-Premise e Zero-Trust)**
*   **Descrição:** Detalhar a decisão técnica de não utilizar serviços de nuvem pública convencional (como AWS S3 público ou Firebase) devido às restrições legais (LGPD/HIPAA).
*   **O que escrever:** Explicar a infraestrutura em contêineres (*Docker*) hospedada localmente (*On-Premise*) nas clínicas. Apresentar a estratégia de *Zero-Trust* utilizando o **MinIO** para armazenamento de mídia, onde nenhum vídeo tem URL fixa ou pública.

**X.3. Camada de Integração e Interoperabilidade em Saúde**
*   **Descrição:** Descrever como a plataforma se insere organicamente no ambiente hospitalar preexistente.
*   **O que escrever:** Detalhar o funcionamento do *Listener TCP* desenvolvido no backend (NestJS) para capturar e decodificar passivamente mensagens do protocolo **HL7 v2 (Eventos ADT)**. Explicar como a plataforma processa a admissão de pacientes sem demandar recadastramento manual.

**X.4. Camada de Lógica e Processamento Assíncrono (Backend)**
*   **Descrição:** Abordar as escolhas feitas no backend (Node.js/NestJS) para suportar a carga de trabalho intensiva.
*   **O que escrever:**
    *   **Resiliência em Redes Instáveis:** Explicar a implementação do upload via fragmentação (*Chunking*). Mostrar como o envio de vídeos de alta resolução por celulares é quebrado em pedaços menores (ex: 5MB), garantindo que quedas de internet não causem a perda total do upload.
    *   **Processamento Assíncrono (*Assembly*):** Detalhar como filas de processamento em *background* juntam os *chunks* no servidor e salvam no MinIO, mantendo as requisições HTTP rápidas e a interface responsiva.

**X.5. Mecanismos de Segurança e Rastreabilidade (Audit Trail)**
*   **Descrição:** Explicar a camada de controle de acessos focada em dados sensíveis de saúde.
*   **O que escrever:** Detalhar como o sistema gera URLs pré-assinadas temporárias (Pre-Signed URLs) válidas por um tempo curtíssimo (ex: 15 minutos). Abordar o desenvolvimento dos *middlewares* de auditoria que registram um histórico inalterável (quem, quando, endereço de IP e o que visualizou/alterou).

**X.6. Camada de Apresentação (Frontend Web e Mobile)**
*   **Descrição:** Explicar as interfaces desenvolvidas para interagir com a API complexa.
*   **O que escrever:** 
    *   **O Portal do Profissional (Vue.js 3):** Abordar a decisão pelo uso de um framework reativo, o design de componentes e o reprodutor de vídeos seguros protegido por sessão (JWT).
    *   **A Interface do Paciente:** Abordar o fluxo de gravação de movimentos e feedback ao usuário durante a transmissão assíncrona dos vídeos.

**X.7. Desafios Técnicos e Soluções Adotadas**
*   **Descrição:** Subseção muito valorizada por bancas avaliadoras. Retrata a maturidade do engenheiro de software frente aos problemas.
*   **O que escrever:** Citar dificuldades reais do desenvolvimento. (Ex: O gargalo de memória no Node.js ao juntar chunks muito grandes; o desafio de decodificar a sintaxe complexa do HL7 v2; ou como garantir a fluidez do Player de Vídeo sem expor a URL permanentemente).
