import { parseAdmission } from './hl7-parser';
describe('HL7 ADT^A01 (synthetic data)', () => {
  const message = 'MSH|^~\\&|TEST||SITF||20261007120000||ADT^A01|test-1|P|2.5\rPID|1||SYNTHETIC-001^^^TEST||Example^Synthetic||20000101|U\r';
  it('reads demographics', () => expect(parseAdmission(message)).toEqual({ fullName: 'Synthetic Example', medicalRecordNumber: 'SYNTHETIC-001', birthDate: '2000-01-01' }));
  it('rejects unsupported events and invalid dates', () => {
    expect(() => parseAdmission(message.replace('ADT^A01', 'ADT^A03'))).toThrow();
    expect(() => parseAdmission(message.replace('20000101', '20000231'))).toThrow();
  });
});
