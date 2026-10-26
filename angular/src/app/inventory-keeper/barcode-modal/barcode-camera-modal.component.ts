import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule } from '@abp/ng.theme.shared';
import { BarcodeScannerService } from '../services/barcode-scanner.service';

@Component({
  selector: 'app-barcode-camera-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './barcode-camera-modal.component.html',
  styleUrls: ['./barcode-camera-modal.component.scss'],
})
export class BarcodeCameraModalComponent implements OnDestroy {
  private readonly barcodeScannerService = inject(BarcodeScannerService);

  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() scanned = new EventEmitter<string>();

  manualCode = '';
  hasCameraError = false;
  cameraErrorMessage = '';
  private stream: MediaStream | null = null;
  private scanIntervalId: any = null;

  async onModalOpen(): Promise<void> {
    this.hasCameraError = false;
    this.cameraErrorMessage = '';
    this.manualCode = '';
    await this.startCamera();
  }

  async startCamera(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.hasCameraError = true;
      this.cameraErrorMessage = 'Thiết bị không hỗ trợ camera web (MediaDevices API).';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = this.stream;
        await this.videoRef.nativeElement.play();
        this.startDetection();
      }
    } catch (err: any) {
      this.hasCameraError = true;
      this.cameraErrorMessage = err?.message || 'Không thể truy cập camera. Vui lòng cấp quyền camera cho trình duyệt.';
    }
  }

  private startDetection(): void {
    if (typeof window === 'undefined') return;

    // Sử dụng Native BarcodeDetector API nếu trình duyệt hỗ trợ
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a'],
        });

        this.scanIntervalId = setInterval(async () => {
          if (!this.videoRef?.nativeElement || this.videoRef.nativeElement.readyState < 2) {
            return;
          }

          try {
            const barcodes = await barcodeDetector.detect(this.videoRef.nativeElement);
            if (barcodes && barcodes.length > 0) {
              const detectedCode = barcodes[0].rawValue;
              if (detectedCode) {
                this.handleSuccessScan(detectedCode);
              }
            }
          } catch {
            // bỏ qua lỗi frame
          }
        }, 300);
      } catch {
        // Fallback: để người dùng nhập tay nếu BarcodeDetector khởi tạo thất bại
      }
    }
  }

  handleSuccessScan(code: string): void {
    const trimmed = (code || '').trim();
    if (!trimmed) return;

    this.playBeepSound();
    this.barcodeScannerService.emitScanResult(trimmed, 'CAMERA');
    this.scanned.emit(trimmed);
    this.close();
  }

  submitManualCode(): void {
    const trimmed = this.manualCode.trim();
    if (!trimmed) return;
    this.handleSuccessScan(trimmed);
  }

  private playBeepSound(): void {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1200Hz beep
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      }
    } catch {
      // Bỏ qua nếu audio context bị block
    }
  }

  close(): void {
    this.stopCamera();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private stopCamera(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.srcObject = null;
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
