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

  it('should emit confirmed with formatted reason when valid', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    component.applyPresetNote('::DiscardPresetNote:Damaged');
    component.submit();

    expect(component.isSubmittedAttempt).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith({
      reason: '[Quá hạn sử dụng] Bao bì rách hỏng, biến chất do sự cố bảo quản',
    });
  });

  it('should reset form properly', () => {
    component.selectedCategory = 'DAMAGED';
    component.customNotes = 'Ghi chú test';
    component.isSubmittedAttempt = true;

    component.resetForm();

    expect(component.selectedCategory).toBe('EXPIRED');
    expect(component.customNotes).toBe('');
    expect(component.isSubmittedAttempt).toBe(false);
  });
});
