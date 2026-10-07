import { BadRequestException } from '@nestjs/common';

export function parseAdmission(message: string) {
  const segments = message.split('\r').filter(Boolean).map(segment => segment.split('|'));
  const msh = segments.find(segment => segment[0] === 'MSH');
  const pid = segments.find(segment => segment[0] === 'PID');
  if (!msh || msh[8] !== 'ADT^A01' || !pid) throw new BadRequestException('Mensagem ADT^A01 inválida.');
  const medicalRecordNumber = pid[3]?.split('^')[0];
  const name = pid[5]?.split('^');
  const dob = pid[7];
  if (!medicalRecordNumber || medicalRecordNumber.length > 128 || !name?.[0] || !/^\d{8}$/.test(dob || '')) throw new BadRequestException('PID inválido.');
  const birthDate = `${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6, 8)}`;
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate) throw new BadRequestException('Data inválida.');
  return { fullName: [...name.slice(1, 3), name[0]].filter(Boolean).join(' '), medicalRecordNumber, birthDate };
}
