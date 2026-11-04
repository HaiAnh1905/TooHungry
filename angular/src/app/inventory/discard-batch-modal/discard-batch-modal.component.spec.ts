/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { LocalizationService } from '@abp/ng.core';
import { DiscardBatchModalComponent } from './discard-batch-modal.component';

describe('DiscardBatchModalComponent', () => {
  let component: DiscardBatchModalComponent;
  let mockLocalizationService: any;

  beforeEach(() => {
    mockLocalizationService = {
      instant: vi.fn((key: string) => {
        const dict: Record<string, string> = {
          '::DiscardReason:Expired': 'Quá hạn sử dụng',
          '::DiscardReason:Damaged': 'Hư hỏng / biến chất trong quá trình lưu kho',
          '::DiscardPresetNote:ExpiredShort': 'Quá hạn dùng',
          '::DiscardPresetNote:Expired': 'Hết hạn sử dụng, không còn an toàn để chế biến',
          '::DiscardPresetNote:DamagedShort': 'Hư hỏng bao bì',
          '::DiscardPresetNote:Damaged': 'Bao bì rách hỏng, biến chất do sự cố bảo quản',
          '::DiscardPresetNote:SensoryFailedShort': 'Lỗi cảm quan',
          '::DiscardPresetNote:SensoryFailed': 'Kiểm nghiệm cảm quan không đạt tiêu chuẩn xuất bếp',
          '::DiscardSafeBatchConfirmTitle': 'Xác nhận xuất hủy nguyên liệu còn hạn',
          '::DiscardSafeBatchConfirmSubtitle': 'Cảnh báo an toàn: Lô nguyên liệu vẫn đang trong thời hạn sử dụng đạt chuẩn',
          '::BackToReview': 'Quay lại kiểm tra',
          '::ConfirmDiscardSafeBtn': 'Tôi chắc chắn muốn xuất hủy',
        };
        return dict[key] || key;
      }),
    };

    const injector = Injector.create({
      providers: [
        { provide: DiscardBatchModalComponent, useClass: DiscardBatchModalComponent },
        { provide: LocalizationService, useValue: mockLocalizationService },
      ],
    });

    component = injector.get(DiscardBatchModalComponent);
    component.batch = {
      id: 'batch-1',
      batchCode: 'LOT-2026-BEEF',
      remainingQuantity: 5,
    } as any;
  });

  it('should initialize with default categories and 3 note presets', () => {
    expect(component.selectedCategory).toBe('EXPIRED');
    expect(component.customNotes).toBe('');
    expect(component.defaultNotePresets.length).toBe(3);
    expect(component.isSubmittedAttempt).toBe(false);
    expect(component.isSafeConfirmModalOpen).toBe(false);
  });

  it('should apply preset note when applyPresetNote is called', () => {
    component.applyPresetNote('::DiscardPresetNote:Expired');

    expect(mockLocalizationService.instant).toHaveBeenCalledWith('::DiscardPresetNote:Expired');
    expect(component.customNotes).toBe('Hết hạn sử dụng, không còn an toàn để chế biến');
  });

  it('should not emit confirmed if customNotes is empty', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    component.customNotes = '   ';
    component.submit();

    expect(component.isSubmittedAttempt).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit confirmed directly if batch is NOT safe (e.g. no expiry date)', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    component.applyPresetNote('::DiscardPresetNote:Damaged');
    component.submit();

    expect(component.isSubmittedAttempt).toBe(true);
    expect(component.isSafeConfirmModalOpen).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith({
      reason: '[Quá hạn sử dụng] Bao bì rách hỏng, biến chất do sự cố bảo quản',
      batches: [component.batch],
    });
  });

  it('should open safe confirm modal instead of directly emitting if batch is in safe status', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    // Future expiry date (e.g. 15 days ahead)
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    component.batch = {
      id: 'batch-safe-1',
      batchCode: 'LOT-2026-SAFE',
      remainingQuantity: 10,
      expiryDate: futureDate,
      storageType: 1, // Standard dry / cold > 3 days is Safe
    } as any;

    component.applyPresetNote('::DiscardPresetNote:Damaged');
    component.submit();

    expect(component.isSubmittedAttempt).toBe(true);
    // Double confirmation modal must open
    expect(component.isSafeConfirmModalOpen).toBe(true);
    // Should NOT emit yet
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit confirmed when user confirms in the secondary safe modal', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    component.batch = {
      id: 'batch-safe-1',
      batchCode: 'LOT-2026-SAFE',
      remainingQuantity: 10,
      expiryDate: futureDate,
    } as any;

    component.applyPresetNote('::DiscardPresetNote:Damaged');
    component.submit();

    expect(component.isSafeConfirmModalOpen).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();

    // User clicks confirm in safe modal
    component.confirmSafeDiscard();

    expect(component.isSafeConfirmModalOpen).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith({
      reason: '[Quá hạn sử dụng] Bao bì rách hỏng, biến chất do sự cố bảo quản',
      batches: [component.batch],
    });
  });

  it('should close safe confirm modal and NOT emit when user clicks back to review', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    component.batch = {
      id: 'batch-safe-1',
      batchCode: 'LOT-2026-SAFE',
      remainingQuantity: 10,
      expiryDate: futureDate,
    } as any;

    component.applyPresetNote('::DiscardPresetNote:Damaged');
    component.submit();

    expect(component.isSafeConfirmModalOpen).toBe(true);

    // User cancels safe confirm
    component.cancelSafeConfirm();

    expect(component.isSafeConfirmModalOpen).toBe(false);
    expect(emitSpy).not.toHaveBeenCalled();
    // Notes and form state are preserved
    expect(component.customNotes).toBe('Bao bì rách hỏng, biến chất do sự cố bảo quản');
  });

  it('should open safe confirm modal in bulk discard if at least one batch is safe', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    component.batches = [
      { id: 'b1', batchCode: 'LOT-EXPIRED', expiryDate: pastDate } as any,
      { id: 'b2', batchCode: 'LOT-SAFE', expiryDate: futureDate } as any,
    ];
    component.batch = undefined;

    expect(component.isBulk).toBe(true);
    expect(component.safeBatchesCount).toBe(1);

    component.applyPresetNote('::DiscardPresetNote:SensoryFailed');
    component.submit();

    expect(component.isSafeConfirmModalOpen).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();

    component.confirmSafeDiscard();
    expect(emitSpy).toHaveBeenCalledWith({
      reason: '[Quá hạn sử dụng] Kiểm nghiệm cảm quan không đạt tiêu chuẩn xuất bếp',
      batches: component.batches,
    });
  });

  it('should correctly identify safe batches via isBatchSafe helper', () => {
    expect(component.isBatchSafe(undefined)).toBe(false);
    expect(component.isBatchSafe({} as any)).toBe(false);

    // Explicit safe tag
    expect(component.isBatchSafe({ fefoStatus: 'Safe' } as any)).toBe(true);
    expect(component.isBatchSafe({ fefoStatus: 'safe' } as any)).toBe(true);

    // Expired
    const past = new Date(Date.now() - 1000).toISOString();
    expect(component.isBatchSafe({ expiryDate: past } as any)).toBe(false);

    // Fresh storage (0) unexpired is always safe
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(component.isBatchSafe({ expiryDate: future, storageType: 0 } as any)).toBe(true);

    // Standard storage > 3 days
    const future10d = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(component.isBatchSafe({ expiryDate: future10d, storageType: 1 } as any)).toBe(true);

    // Standard storage <= 3 days (warning/critical, not safe)
    const future2d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(component.isBatchSafe({ expiryDate: future2d, storageType: 1 } as any)).toBe(false);
  });

  it('should reset form properly', () => {
    component.selectedCategory = 'DAMAGED';
    component.customNotes = 'Ghi chú test';
    component.isSubmittedAttempt = true;
    component.isSafeConfirmModalOpen = true;

    component.resetForm();

    expect(component.selectedCategory).toBe('EXPIRED');
    expect(component.customNotes).toBe('');
    expect(component.isSubmittedAttempt).toBe(false);
    expect(component.isSafeConfirmModalOpen).toBe(false);
  });
});
