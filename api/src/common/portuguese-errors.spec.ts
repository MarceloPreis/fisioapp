import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { PortugueseExceptionFilter, portugueseValidationPipe, validationMessages } from './portuguese-errors';

class LoginInput {
  @IsString()
  @MinLength(12)
  password!: string;
}

describe('Respostas em português', () => {
  it('traduz validações reais e rejeita campos extras sem expor valores', async () => {
    await expect(portugueseValidationPipe().transform({ password: 'secret', extra: 'private' }, {
      type: 'body', metatype: LoginInput,
    })).rejects.toMatchObject({ response: { message: ['Campo informado: não é permitido.', 'Senha: texto muito curto.'] } });
  });

  it('traduz validações aninhadas', () => {
    expect(validationMessages([{ property: 'exercises', children: [{ property: 'sets', constraints: { isInt: 'sets must be an integer number' } }] }]))
      .toEqual(['Séries: deve ser um número inteiro.']);
  });

  it.each([
    [new UnauthorizedException(), 401, 'Entre no sistema para continuar.'],
    [new NotFoundException('Cannot GET /missing'), 404, 'Registro não encontrado.'],
    [new BadRequestException('Validation failed (uuid is expected)'), 400, 'Os dados enviados são inválidos.'],
    [new BadRequestException('Paciente já cadastrado.'), 400, 'Paciente já cadastrado.'],
    [new Error('private database details'), 500, 'Não foi possível concluir a operação. Tente novamente.'],
  ])('preserva status e apresenta mensagem localizada', (error, statusCode, message) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    new PortugueseExceptionFilter().catch(error, { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as any);
    expect(status).toHaveBeenCalledWith(statusCode);
    expect(json).toHaveBeenCalledWith({ statusCode, message });
  });
});
