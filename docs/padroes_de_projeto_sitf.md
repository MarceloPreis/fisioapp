# Padrões de Projeto - SITF

Este documento detalha os padrões de projeto (Design Patterns) adotados no Sistema Integrado de Teleabilitação Fisioterapêutica (SITF).

## 1. Backend API (NestJS)

O framework NestJS resolve nativamente e impõe o uso dos padrões de projeto corporativos essenciais, garantindo escalabilidade.

### 1.1. Pattern: Injeção de Dependência (Dependency Injection) e Singleton
O NestJS gerencia o ciclo de vida das instâncias das classes. Serviços (como a manipulação de vídeos ou acesso ao DB) são instanciados uma única vez (Singleton) e injetados de maneira automática via construtor, facilitando o desacoplamento e a criação de testes automatizados.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) {}

  findAll(): Promise<Patient[]> {
    return this.patientRepository.find();
  }
}
```

### 1.2. Pattern: Service Layer (Camada de Serviço)
No SITF, isolamos estritamente as regras de negócios das requisições web. Controladores apenas recebem e respondem, enquanto Serviços (como o `VideoService`) realizam o trabalho de junção de chunks, autenticação em serviços, e manipulação no banco.

### 1.3. Pattern: Data Transfer Object (DTO)
Garante tipagem, contrato e validação para dados que entram na API (payloads JSON ou arquivos multipart).

```typescript
import { IsString, IsInt } from 'class-validator';

export class ChunkUploadDto {
  @IsString()
  uploadId: string;

  @IsInt()
  chunkIndex: number;
}
```

## 2. Frontend Web (Vue.js 3)

### 2.1. Pattern: Composables (Composition API)
Extrai lógicas de estado, chamadas de API e reatividade de dentro dos componentes visuais, permitindo a reutilização global de funcionalidades. 

```javascript
import { ref } from 'vue';
import httpClient from '@/utils/httpClient';

export function usePatients() {
  const patients = ref([]);
  const isLoading = ref(false);

  const fetchPatients = async () => {
    isLoading.value = true;
    try {
      const response = await httpClient.get('/api/patients');
      patients.value = response.data;
    } finally {
      isLoading.value = false;
    }
  };

  return { 
    patients, 
    isLoading, 
    fetchPatients 
  };
}
```

## 3. Mobile (Flutter)

### 3.1. Pattern: BLoC / Cubit (State Management)
Separa completamente a interface do usuário (Widgets) da lógica de negócios (como a compressão de vídeo e chamadas HTTP).

```dart
import 'package:bloc/bloc.dart';
import 'video_repository.dart';

abstract class VideoState {}
class VideoInitial extends VideoState {}
class VideoUploading extends VideoState {}
class VideoSuccess extends VideoState {}
class VideoFailure extends VideoState {}

class VideoCubit extends Cubit<VideoState> {
  final VideoRepository repository;

  VideoCubit(this.repository) : super(VideoInitial());

  Future<void> uploadChunk(String filePath) async {
    emit(VideoUploading());
    try {
      await repository.sendChunk(filePath);
      emit(VideoSuccess());
    } catch (e) {
      emit(VideoFailure());
    }
  }
}
```
