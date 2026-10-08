import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

const labels: Record<string, string> = {
  email: 'E-mail', password: 'Senha', fullName: 'Nome completo', title: 'Título',
  description: 'Descrição', birthDate: 'Data de nascimento', medicalRecordNumber: 'Número do prontuário',
  patientId: 'Paciente', exerciseId: 'Exercício', categoryId: 'Categoria', sets: 'Séries', reps: 'Repetições',
  startTime: 'Início', endTime: 'Fim', scheduledDate: 'Data agendada', recurrenceDays: 'Dias da semana',
  content: 'Conteúdo', exercises: 'Exercícios', routines: 'Rotinas', notes: 'Observações',
};

export function validationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap(error => {
    const label = labels[error.property] || 'Campo informado';
    const messages = Object.keys(error.constraints || {}).map(constraint => {
      const details: Record<string, string> = {
        isString: 'deve ser um texto.', isNumber: 'deve ser um número.', isInt: 'deve ser um número inteiro.',
        isBoolean: 'deve ser verdadeiro ou falso.', isUUID: 'deve conter um identificador válido.',
        isDateString: 'deve conter uma data válida.', isArray: 'deve ser uma lista.',
        minLength: 'texto muito curto.', maxLength: 'excede o tamanho permitido.',
        min: 'está abaixo do mínimo permitido.', max: 'excede o máximo permitido.',
        arrayMinSize: 'precisa conter mais itens.', arrayMaxSize: 'excede a quantidade permitida de itens.',
        arrayUnique: 'não pode conter itens repetidos.', matches: 'possui um formato inválido.',
        isIn: 'possui uma opção inválida.', nestedValidation: 'possui dados inválidos.',
        whitelistValidation: 'não é permitido.', isEmail: 'deve conter um endereço de e-mail válido.',
      };
      return `${label}: ${details[constraint] || 'possui um valor inválido.'}`;
    });
    return [...messages, ...validationMessages(error.children || [])];
  });
}

export function portugueseValidationPipe() {
  return new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    exceptionFactory: errors => new BadRequestException(validationMessages(errors)),
  });
}

const defaults: Record<number, string> = {
  400: 'Os dados enviados são inválidos.', 401: 'Entre no sistema para continuar.',
  403: 'Você não tem permissão para realizar esta ação.', 404: 'Registro não encontrado.',
  405: 'Ação não permitida.', 408: 'O tempo de espera terminou. Tente novamente.',
  409: 'Esta ação conflita com os dados existentes.', 413: 'O arquivo excede o tamanho permitido.',
  415: 'Formato de arquivo não permitido.', 422: 'Não foi possível processar os dados enviados.',
  429: 'Muitas tentativas. Aguarde um momento e tente novamente.',
  500: 'Não foi possível concluir a operação. Tente novamente.',
  502: 'O serviço está temporariamente indisponível.', 503: 'O serviço está temporariamente indisponível.',
};

@Catch()
export class PortugueseExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const original = typeof body === 'string' ? body : (body as { message?: string | string[] } | undefined)?.message;
    const translate = (message: string) => {
      if (/^(Bad Request|Unauthorized|Forbidden|Not Found|Cannot |Validation failed|Internal Server Error|Internal server error|Payload Too Large|File too large|Unexpected field|Too Many Requests|Service Unavailable|Bad Gateway|Request Timeout|Unprocessable Entity|Method Not Allowed|Unsupported Media Type)/i.test(message)) {
        return defaults[status] || defaults[500];
      }
      return message;
    };
    const message = status >= 500 ? defaults[status] || defaults[500]
      : Array.isArray(original) ? original.map(translate) : original ? translate(original) : defaults[status] || defaults[500];
    host.switchToHttp().getResponse().status(status).json({ statusCode: status, message });
  }
}
