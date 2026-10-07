> Contrato atualizado: upload/init exige totalChunks; upload/complete retorna HTTP 202. Consulte docs/seguranca-e-operacao.md para consulta de estado e limites.

# Contexto do Backend e Regras de Negócio (SITF - Mobile)

*Instrução para a IA do Mobile: Leia este documento com extrema atenção. Ele descreve a arquitetura exata do backend (NestJS/Postgres) que já está rodando. Use estas informações para projetar os modelos (Models), os Repositórios (Dio) e o fluxo de Telas (UI/UX) do aplicativo Flutter.*

---

## 1. Visão Geral do Produto (Teleabilitação)
O app é focado em **Pacientes**. O Fisioterapeuta cria "Sessões de Treino" (Prescrições) no painel web, adicionando múltiplos exercícios (com séries e repetições) para o paciente.
O paciente abre o app, visualiza o treino do dia, posiciona a câmera do celular e grava a execução. Uma IA local (Visão Computacional no app) deve avaliar erros posturais, e o vídeo é enviado em "pedaços" (chunks) para nosso servidor privado (MinIO).

## 2. Estrutura de Dados (Models Esperados no App)

**Session (Sessão/Prescrição):**
Representa o bloco de treino.
- `id` (String UUID)
- `title` (String) - Ex: "Treino de Ombro"
- `status` (String) - Ex: "PENDENTE", "CONCLUIDO"
- `sessionExercises` (List<SessionExercise>) - Lista de exercícios da sessão.

**SessionExercise (Exercício da Sessão):**
- `id` (String UUID)
- `sets` (Int) - Número de séries (ex: 3)
- `reps` (String) - Repetições (ex: "10 a 12")
- `exercise` (Exercise) - O exercício em si.

**Exercise (Exercício Base):**
- `id` (String UUID)
- `title` (String) - Ex: "Agachamento Livre"
- `category` (Object) - Categoria do exercício.
- `rules` (List<ExerciseRule>) - Array de regras biomecânicas.
- `countRules` (List<ExerciseCountRule>) - Array de regras de contagem de repetições (State Machine).

**ExerciseCountRule (Métrica de Contagem):**
- `jointA`, `jointB`, `jointC` (Strings): Pontos do movimento primário a ser monitorado (ex: `LEFT_HIP`, `LEFT_KNEE`, `LEFT_ANKLE`).
- `angleMin` (Double): Ângulo inferior do gatilho (ex: 90 graus).
- `angleMax` (Double): Ângulo superior do gatilho (ex: 180 graus).
- `validationPlane` (String): `ABSOLUTE` (3D total), `FRONTAL` (2D X-Y), `SAGITTAL` (2D Y-Z) ou `TRANSVERSE` (2D X-Z).
- **Lógica no App:** O celular deve verificar todas as métricas contidas em `countRules`. Quando o ângulo de *qualquer* regra atingir o `angleMin` (projetado no `validationPlane` especificado), ele arma o gatilho. Quando atingir o `angleMax`, ele soma +1 Repetição e volta a aguardar o Min. Isso permite contar exercícios bilaterais perfeitamente.

**ExerciseRule (Regra Biomecânica da IA):**
- `jointA`, `jointB`, `jointC` (Strings) - Marcos anatômicos (ex: `LEFT_SHOULDER`, `LEFT_ELBOW`, `LEFT_WRIST`). O `jointB` é sempre o vértice do ângulo.
- `conditionOperator` (String) - `GREATER_THAN` (Maior que) ou `LESS_THAN` (Menor que).
- `targetAngle` (Double) - Ângulo limite em graus (ex: 90.0).
- `validationPlane` (String): Plano de projeção. `ABSOLUTE`, `FRONTAL` (X-Y), `SAGITTAL` (Y-Z), `TRANSVERSE` (X-Z). Se não for `ABSOLUTE`, você deve ignorar o eixo perpendicular antes de calcular o atan2 vetorial.
- `feedbackMessage` (String) - O que a IA deve "falar" ou mostrar na tela caso o paciente atinja a condição de erro.
- **Lógica no App (Avaliação Postural):** A cada frame (ou a cada X frames para economizar bateria), a IA deve:
  1. Pegar as coordenadas 3D das juntas `A`, `B` e `C`.
  2. "Achatar" as coordenadas para 2D dependendo do `validationPlane` (Ex: se for `SAGITTAL`, pegar apenas `Y` e `Z` e ignorar `X`).
  3. Calcular o ângulo no vértice `B`.
  4. Comparar o ângulo calculado com o `targetAngle` usando o `conditionOperator`. Exemplo: Se a regra diz `LESS_THAN 90` e o ângulo medido for `85`, a regra foi **violada**.
  5. Se violada: Disparar um TTS (Text-to-Speech) ou alerta visual com a `feedbackMessage`. Além disso, deve instanciar um objeto `ExecutionNote` gravando o `timestampSeconds` exato do vídeo em que ocorreu o erro para salvar no banco depois.

**ExecutionNote (Nota da IA):**
- `timestampSeconds` (Double) - Segundo exato do vídeo onde o erro ocorreu (ex: 14.5)
- `description` (String) - A mensagem de erro identificada.

---

## 3. Rotas da API (Dio HTTP Client)
Base URL Padrão para Emulador Android: `http://10.0.2.2:3000/api/v1`

### A. Autenticação
- **Rota:** `POST /auth/login`
- **Body:** `{ "email": "paciente@email.com", "password": "senha" }`
- **Comportamento:** A API não retorna o token no body, ela envia um Cookie `HttpOnly` (`Authentication=...`).
- **Ação no Flutter:** O Dio *DEVE* estar configurado com `dio_cookie_manager` e `cookie_jar` para salvar esse cookie e enviá-lo automaticamente nas requisições subsequentes.

### B. Listagem de Treinos
- **Rota:** `GET /sessions`
- **Comportamento:** Retorna a lista de Sessões (`Session`). O app deve renderizar uma lista para o paciente escolher qual treino fazer hoje.

### C. Upload de Vídeo (Chunking)
Arquivos grandes de vídeo quebram se enviados de uma vez. O app DEVE fatiar o vídeo gerado pela câmera (ex: pedaços de 5MB) e fazer o upload em etapas:
1. `POST /videos/upload/init` -> Recebe um `{ "uploadId": "uuid..." }`
2. `POST /videos/upload/chunk` (Loop para cada pedaço) -> Payload `FormData` contendo:
   - `uploadId` (Texto)
   - `chunkIndex` (Número do pedaço: 0, 1, 2...)
   - `chunk` (O arquivo/bytes)
3. `POST /videos/upload/complete` -> Payload `{ "uploadId": "uuid...", "fileName": "treino.mp4" }` -> Recebe `{ "videoObjectName": "videos/caminho.mp4" }`

### D. Registro do Diagnóstico (IA Local)
Após o envio do vídeo, o app pega as anotações feitas pela Visão Computacional e finaliza o treino.
- **Rota:** `POST /executions`
- **Body:**
```json
{
  "sessionId": "uuid-da-sessao",
  "videoObjectName": "videos/caminho.mp4",
  "notes": [
    { "timestampSeconds": 10.2, "description": "Amplitude de movimento reduzida" }
  ]
}
```

---

## 4. Telas Necessárias (UI/UX)
Com base nesse backend, crie as seguintes telas no Flutter:
1. **LoginScreen:** Email, Senha e tratamento de erro de acesso negado.
2. **DashboardScreen (Home):** Lista as Sessões Pendentes com Cards modernos.
3. **SessionDetailScreen:** Mostra os detalhes de uma Sessão selecionada (lista de exercícios com o número de Séries e Repetições). Botão grande: "Iniciar Execução".
4. **CameraExecutionScreen:** Tela que liga a câmera (`camera` package). Mostra o nome do exercício atual na tela. Em background, simule ou implemente a Visão Computacional.
5. **UploadProgressScreen:** Uma tela de *feedback* mostrando a barra de progresso do upload dos "chunks" e enviando o POST final para `/executions`. Ao finalizar, redireciona para a Home com mensagem de sucesso.

---

## 5. Guia de Implementação: Gravação e Upload de Vídeo (Chunking) no Flutter

Para evitar timeouts de rede no celular de pacientes e contornar restrições de memória HTTP, o backend exige o envio fatiado do vídeo. 

**Bibliotecas recomendadas:**
- `camera` (para gravar o `.mp4`)
- `dio` (cliente HTTP para suportar *Multipart/FormData*)

**Algoritmo Exato (Exemplo de Lógica em Dart):**

```dart
// 1. Iniciar Sessão de Upload
final initRes = await dio.post('/videos/upload/init');
final uploadId = initRes.data['uploadId'];

// 2. Fatiamento (Chunking) do Arquivo
final file = File(caminhoDoVideoGravado);
final chunkSize = 5 * 1024 * 1024; // Pedaços de 5 MB
final length = await file.length();
final raf = await file.open(mode: FileMode.read);

int chunkIndex = 0;
while (raf.position() < length) {
  // Lẽ apenas 5MB por vez na memória
  final chunk = await raf.read(chunkSize);
  
  final formData = FormData.fromMap({
    'uploadId': uploadId,
    'chunkIndex': chunkIndex.toString(),
    // Envia os bytes lidos como arquivo multipart
    'chunk': MultipartFile.fromBytes(chunk, filename: 'chunk_$chunkIndex'),
  });

  // Envia a fatia
  await dio.post('/videos/upload/chunk', data: formData);
  chunkIndex++;
  
  // Opcional: Atualize uma barra de progresso na UI aqui (raf.position() / length)
}
await raf.close();

// 3. Concluir o Upload
final completeRes = await dio.post('/videos/upload/complete', data: {
  'uploadId': uploadId,
  'fileName': 'execucao_${DateTime.now().millisecondsSinceEpoch}.mp4'
});

// A API retornará o nome interno do vídeo no MinIO
final videoObjectName = completeRes.data['videoObjectName'];

// 4. Salvar o Treino (Registrar Notas da IA e link do vídeo)
await dio.post('/executions', data: {
  "sessionId": sessionId,
  "videoObjectName": videoObjectName,
  "notes": capturedAiNotes // Lista de notas gerada no passo de visão computacional
});
```

A IA do App deve integrar esse fluxo na **UploadProgressScreen**!
