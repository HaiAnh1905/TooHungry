/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BarcodeScannerService } from './barcode-scanner.service';
import { BarcodeScanEvent } from '../models/inventory-keeper.models';

describe('BarcodeScannerService', () => {
  let service: BarcodeScannerService;

  beforeEach(() => {
    service = new BarcodeScannerService();
  });

  afterEach(() => {
    service.stopHidListener();
  });

  it('should emit scanned event when emitScanResult is called with CAMERA source', () => {
    let emittedEvent: BarcodeScanEvent | undefined;
    service.scanned$.subscribe(event => {
      emittedEvent = event;
    });

    service.emitScanResult('BATCH-20261019-001', 'CAMERA');

    expect(emittedEvent).toBeDefined();
    expect(emittedEvent?.code).toBe('BATCH-20261019-001');
    expect(emittedEvent?.source).toBe('CAMERA');
  });

  it('should simulate HID fast keyboard strokes and emit HID scan event on Enter', () => {
    let emittedEvent: BarcodeScanEvent | undefined;
    service.scanned$.subscribe(event => {
      emittedEvent = event;
    });

    const code = 'BATCH-001';
    for (const char of code) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emittedEvent).toBeDefined();
    expect(emittedEvent?.code).toBe('BATCH-001');
    expect(emittedEvent?.source).toBe('HID');
  });

  it('should ignore input when string length is less than 3 characters before Enter', () => {
    let emittedEvent: BarcodeScanEvent | undefined;
    service.scanned$.subscribe(event => {
      emittedEvent = event;
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emittedEvent).toBeUndefined();
  });
});
