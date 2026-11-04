import { Pipe, PipeTransform } from '@angular/core';

/**
 * Utility function to repair Mojibake text caused by misinterpreting UTF-8 bytes as Windows-1252/ANSI.
 * Example: "[YÃªu cáº§u tÃ­nh tiá» n] KhÃ¡ch thanh toÃ¡n VietQR" -> "[Yêu cầu tính tiền] Khách thanh toán VietQR"
 */
export function fixVietnameseMojibake(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return text || '';

  // Return original immediately if no mojibake markers found
  if (
    !text.includes('Ã') &&
    !text.includes('áº') &&
    !text.includes('á»') &&
    !text.includes('cá°') &&
    !text.includes('tiá»')
  ) {
    return text;
  }

  // 1. Precise dictionary replacements for common POS Vietnamese phrases
  let cleaned = text
    .replace(/YÃªu cá[º°]§u/g, 'Yêu cầu')
    .replace(/tÃ­nh ti[áa][»º][\u2261\u0081\s\?]?n/gi, 'tính tiền')
    .replace(/KhÃ¡ch thanh toÃ¡n/g, 'Khách thanh toán')
    .replace(/KhÃ¡ch/g, 'Khách')
    .replace(/thanh toÃ¡n/g, 'thanh toán')
    .replace(/toÃ¡n/g, 'toán')
    .replace(/tÃ­nh/g, 'tính')
    .replace(/YÃªu/g, 'Yêu')
    .replace(/cá[º°]§u/g, 'cầu')
    .replace(/tiá»[^\s]?n/g, 'tiền')
    .replace(/tiá» n/g, 'tiền');

  // 2. Generic byte reconstructor fallback if other mojibake characters remain
  if (cleaned.includes('Ã') || cleaned.includes('áº') || cleaned.includes('á»')) {
    try {
      const bytes: number[] = [];
      for (let i = 0; i < cleaned.length; i++) {
        const code = cleaned.charCodeAt(i);
        if (code <= 0xff) {
          bytes.push(code);
        } else {
          const enc = new TextEncoder().encode(cleaned[i]);
          bytes.push(...enc);
        }
      }
      cleaned = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
    } catch {
      // Fallback to dictionary cleaned result
    }
  }

  return cleaned;
}

@Pipe({
  name: 'fixMojibake',
  standalone: true,
})
export class FixMojibakePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return fixVietnameseMojibake(value);
  }
}

