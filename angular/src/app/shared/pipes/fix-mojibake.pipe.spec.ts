import { describe, it, expect } from 'vitest';
import { FixMojibakePipe, fixVietnameseMojibake } from './fix-mojibake.pipe';

describe('FixMojibakePipe & fixVietnameseMojibake', () => {
  const pipe = new FixMojibakePipe();

  it('should repair Vietnamese mojibake order note with payment method bracket', () => {
    const raw = '[YÃªu cáº§u tÃ­nh tiá» n] KhÃ¡ch thanh toÃ¡n VietQR [VietQr: VietQR Napas 247]';
    const result = fixVietnameseMojibake(raw);
    expect(result).toBe('[Yêu cầu tính tiền] Khách thanh toán VietQR [VietQr: VietQR Napas 247]');
    expect(pipe.transform(raw)).toBe(result);
  });

  it('should handle variations with OEM/special characters', () => {
    const raw = '[YÃªu cá°§u tÃ­nh tiá»\u2261n] KhÃ¡ch thanh toÃ¡n VietQR [VietQr: VietQR Napas 247]';
    const result = fixVietnameseMojibake(raw);
    expect(result).toBe('[Yêu cầu tính tiền] Khách thanh toán VietQR [VietQr: VietQR Napas 247]');
  });

  it('should preserve already valid Vietnamese UTF-8 text unchanged', () => {
    const valid = 'Không cay, nhiều đá, phục vụ cùng lúc';
    expect(fixVietnameseMojibake(valid)).toBe(valid);
    expect(pipe.transform(valid)).toBe(valid);
  });

  it('should safely handle empty, null or undefined input', () => {
    expect(fixVietnameseMojibake('')).toBe('');
    expect(fixVietnameseMojibake(null)).toBe('');
    expect(fixVietnameseMojibake(undefined)).toBe('');
  });
});

