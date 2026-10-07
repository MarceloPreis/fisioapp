# Sistema Integrado de Teleabilitação Fisioterapêutica (SITF)
## Documentação de Arquitetura e Engenharia de Software

---

## 1. Visão Geral do Sistema

O **SITF** é uma plataforma distribuída projetada para suportar o acompanhamento assíncrono de reabilitação motora. O sistema prioriza a privacidade do paciente (LGPD/HIPAA) ao adotar uma infraestrutura *on-premise* isolada, garantindo que o armazenamento de vídeos clínicos sensíveis permaneça restrito ao ambiente físico da clínica ou hospital.

### 1.1. Componentes Principais
*   **Aplicação Mobile (Paciente):** Interface para captura, compressão e envio de vídeos de exercícios em blocos (*chunked upload*).
*   **Web App (Fisioterapeuta):** Dashboard administrativo para gestão de prontuários, visualização de progresso e prescrição de novos treinos.
*   **Backend API:** Camada de serviço centralizada em **NestJS** responsável por orquestrar uploads, autenticação, trilhas de auditoria e integração hospitalar.

---

## 2. Escolhas Tecnológicas (Tech Stack)

A arquitetura moderna de saúde (Healthcare IT) exige alta confiabilidade, tipagem estrita e suporte para operações de I/O intensivas.

| Camada | Tecnologia | Justificativa Clínica/Técnica |
| :--- | :--- | :--- |
| **Mobile** | Flutter | Alta performance de renderização, acesso nativo às bibliotecas de compressão de vídeo em iOS e Android. |
| **Frontend Web** | Vue.js 3 + TailwindCSS | Renderização reativa para painéis ricos em dados (dashboards de evolução motora). |
| **Backend** | NestJS (Node.js/TypeScript) | Framework opinativo com injeção de dependência nativa, tipagem estrita com TypeScript e arquitetura modular, essencial para escalar regras de negócio complexas. |
| **Banco de Dados** | PostgreSQL | Integridade transacional (ACID) estrita, essencial para dados de prontuário eletrônico. |
| **Armazenamento** | MinIO | Object storage compatível com S3 rodando *on-premise*, essencial para isolamento de dados em saúde. |

---

## 3. Segurança e Conformidade (LGPD / HIPAA)

Sistemas de saúde exigem protocolos rígidos desde a camada de transporte até o armazenamento de dados.

*   **Criptografia em Trânsito:** Todo tráfego roteado via Cloudflare Tunnel (HTTPS/TLS 1.3).
*   **Trilha de Auditoria Estrita:** Qualquer ação de leitura, criação ou modificação de dados de um paciente gera um registro imutável com carimbo de tempo, usuário e IP.
*   **Arquitetura Zero-Trust para Arquivos:** O MinIO não possui acesso público. A API em NestJS atua como proxy de autorização, gerando URLs pré-assinadas (*Pre-Signed URLs*) exclusivas para a sessão do fisioterapeuta logado.

---

## 4. Interoperabilidade Hospitalar (HL7 v2)

O sistema centraliza o recebimento de mensagens do Sistema de Informação Hospitalar (HIS) integrando um servidor TCP diretamente ao ciclo de vida do módulo NestJS.

### Serviço de Ingestão (HL7 Listener)

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as hl7 from 'simple-hl7';

@Injectable()
export class Hl7ListenerService implements OnModuleInit, OnModuleDestroy {
  private app = hl7.tcp();

  onModuleInit() {
    this.app.use((req, res, next) => {
      const msh = req.msg.getSegment('MSH');
      const pid = req.msg.getSegment('PID');
      
      const msgType = msh.getField(9);
      const patientName = pid.getField(5);
      const patientId = pid.getField(3);

      next();
    });

    this.app.use((err, req, res, next) => {
      const ack = res.ack();
      ack.getSegment('MSA').setField(1, 'AE');
      res.end();
    });

    this.app.start(7777);
  }

  onModuleDestroy() {
  }
}
```

---

## 5. Fluxo de Upload Assíncrono de Vídeos Clínicos

Vídeos de alta resolução gravados pelo paciente são processados em três etapas:

1.  **Compressão no Client (Flutter):** Redução do bitrate mantendo FPS adequado.
2.  **Chunked Upload:** O vídeo é particionado em blocos de 2MB.
3.  **Remontagem no Backend (NestJS):**

### Controlador de Upload (NestJS)

```typescript
import { Controller, Post, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { ChunkUploadDto } from './dto/chunk-upload.dto';
import { AssembleVideoDto } from './dto/assemble-video.dto';

@Controller('api/v1/upload')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('chunk')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body() chunkData: ChunkUploadDto,
  ) {
    await this.videoService.processChunk(file, chunkData);
    return { status: 'success' };
  }

  @Post('assemble')
  async assembleVideo(@Body() assembleData: AssembleVideoDto) {
    const finalPath = await this.videoService.assembleChunks(assembleData);
    return { status: 'assembled', path: finalPath };
  }
}
```

### Serviço de Processamento de Vídeo (NestJS)

```typescript
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ChunkUploadDto } from './dto/chunk-upload.dto';
import { AssembleVideoDto } from './dto/assemble-video.dto';

@Injectable()
export class VideoService {
  async processChunk(file: Express.Multer.File, chunkData: ChunkUploadDto): Promise<void> {
    const { uploadId, chunkIndex } = chunkData;
    const chunkPath = path.join(__dirname, `../../storage/chunks/${uploadId}_${chunkIndex}`);
    
    fs.renameSync(file.path, chunkPath);
  }

  async assembleChunks(assembleData: AssembleVideoDto): Promise<string> {
    const { uploadId, totalChunks } = assembleData;
    const finalPath = path.join(__dirname, `../../storage/videos/${uploadId}.mp4`);
    const writeStream = fs.createWriteStream(finalPath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(__dirname, `../../storage/chunks/${uploadId}_${i}`);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();
    return finalPath;
  }
}
```

---

## 6. Infraestrutura de Implantação (Ambiente de Desenvolvimento)

Para facilitar o desenvolvimento com *hot-reload*, a API NestJS rodará nativamente na máquina hospedeira (*host*), enquanto os serviços de infraestrutura (Banco de Dados e Object Storage) rodam isolados via Docker, com suas respectivas portas mapeadas para acesso via `localhost`.

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: always
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: tele_rehab
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: securepassword

  minio:
    image: minio/minio
    restart: always
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin

volumes:
  pgdata:
  miniodata:
```
