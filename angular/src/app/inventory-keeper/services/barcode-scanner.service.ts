import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { BarcodeScanEvent } from '../models/inventory-keeper.models';
import { IBarcodeScannerService } from '../contracts/inventory-keeper.contracts';

@Injectable({
  providedIn: 'root',
})
export class BarcodeScannerService implements IBarcodeScannerService, OnDestroy {
  private readonly scannedSubject = new Subject<BarcodeScanEvent>();
  readonly scanned$: Observable<BarcodeScanEvent> = this.scannedSubject.asObservable();

  private buffer: string[] = [];
  private lastKeyTime = 0;
  private readonly MAX_KEY_INTERVAL_MS = 60; // Ngưỡng nhận diện súng quét barcode HID
  private isListening = false;

  private readonly boundKeydownHandler = this.handleKeydown.bind(this);

  constructor() {
    this.startHidListener();
  }

  /**
   * Kích hoạt chế độ lắng nghe bàn phím toàn cục cho súng quét HID
   */
  startHidListener(): void {
    if (this.isListening || typeof window === 'undefined') {
      return;
    }
    window.addEventListener('keydown', this.boundKeydownHandler, true);
    this.isListening = true;
  }

  /**
   * Tạm dừng lắng nghe bàn phím toàn cục
   */
  stopHidListener(): void {
    if (!this.isListening || typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('keydown', this.boundKeydownHandler, true);
    this.isListening = false;
    this.buffer = [];
  }

  /**
   * Phát kết quả quét từ bất kỳ nguồn nào (HID hoặc Camera)
   */
  emitScanResult(code: string, source: 'HID' | 'CAMERA'): void {
    const trimmed = (code || '').trim();
    if (!trimmed) return;

    this.scannedSubject.next({
      code: trimmed,
      source,
      timestamp: new Date(),
    });
  }

  private handleKeydown(event: KeyboardEvent): void {
    const now = Date.now();
    const interval = now - this.lastKeyTime;
    this.lastKeyTime = now;

    // Phím Enter kết thúc chuỗi mã quét
    if (event.key === 'Enter') {
      if (this.buffer.length >= 3) {
        const scannedCode = this.buffer.join('').trim();
        this.buffer = [];
        if (scannedCode) {
          event.preventDefault();
          this.emitScanResult(scannedCode, 'HID');
        }
      } else {
        this.buffer = [];
      }
      return;
    }

    // Nếu thời gian giữa 2 phím vượt quá ngưỡng súng quét (> 60ms) và đã có buffer -> reset buffer
    if (interval > this.MAX_KEY_INTERVAL_MS && this.buffer.length > 0) {
      this.buffer = [];
    }

    // Chỉ nhận các ký tự đơn (chữ số, chữ cái, dấu gạch nối)
    if (event.key && event.key.length === 1) {
      this.buffer.push(event.key);
    }
  }

  ngOnDestroy(): void {
    this.stopHidListener();
  }
}
