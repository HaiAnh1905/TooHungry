import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { TableDto } from '../../proxy/tables/models';
import { TableReservationService } from '../../proxy/reservations/table-reservation.service';
import { TableReservationDto, UpdateTableReservationDto } from '../../proxy/reservations/models';

@Component({
  selector: 'app-table-reservation-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './table-reservation-detail-modal.component.html',
  styleUrl: './table-reservation-detail-modal.component.scss',
})
export class TableReservationDetailModalComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly reservationService = inject(TableReservationService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() table: TableDto | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updated = new EventEmitter<TableReservationDto>();
  @Output() checkedIn = new EventEmitter<TableReservationDto>();
  @Output() cancelled = new EventEmitter<TableReservationDto>();

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentReservation = signal<TableReservationDto | null>(null);

  readonly minDate: string;
  readonly maxDate: string;

  form: FormGroup;

  constructor() {
    const today = new Date();
    this.minDate = this.formatDate(today);

    const max = new Date();
    max.setDate(today.getDate() + 7);
    this.maxDate = this.formatDate(max);

    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.maxLength(128)]],
      customerPhone: ['', [Validators.required, Validators.pattern(/^[0-9+() -]{8,20}$/)]],
      reservationDate: [this.minDate, [Validators.required]],
      reservationTime: ['18:00', [Validators.required, this.timeRangeValidator]],
      guestCount: [2, [Validators.required, Validators.min(1)]],
      note: ['', [Validators.maxLength(512)]],
    });
    this.form.get('reservationDate')?.valueChanges.subscribe(() => {
      this.form.get('reservationTime')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    if (this.table?.id) {
      this.loadActiveReservation(this.table.id);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] || changes['table']) && this.visible && this.table?.id) {
      this.loadActiveReservation(this.table.id);
    }
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private timeRangeValidator = (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) return null;
    const [hours, minutes] = control.value.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    if (hours < 9 || hours > 22) {
      return { outsideOpeningHours: true };
    }

    const dateControl = control.parent?.get('reservationDate');
    if (dateControl?.value) {
      const today = new Date();
      const todayStr = this.formatDate(today);
      if (dateControl.value === todayStr) {
        const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();
        const selectedTotalMinutes = hours * 60 + minutes;
        if (selectedTotalMinutes < currentTotalMinutes - 5) {
          return { timeInPast: true };
        }
      }
    }

    return null;
  };

  loadActiveReservation(tableId: string): void {
    this.isLoading.set(true);
    this.reservationService.getActiveByTableId(tableId).subscribe({
      next: res => {
        this.isLoading.set(false);
        this.currentReservation.set(res);
        if (res) {
          const resDate = new Date(res.reservationTime);
          const dateStr = this.formatDate(resDate);
          const timeStr = `${String(resDate.getHours()).padStart(2, '0')}:${String(resDate.getMinutes()).padStart(2, '0')}`;

          this.form.patchValue({
            customerName: res.customerName || '',
            customerPhone: res.customerPhone || '',
            reservationDate: dateStr,
            reservationTime: timeStr,
            guestCount: res.guestCount || this.table?.capacity || 2,
            note: res.note || '',
          });

          const capacity = this.table?.capacity || 100;
          this.form.get('guestCount')?.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(capacity),
          ]);
          this.form.get('guestCount')?.updateValueAndValidity();
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  save(): void {
    const res = this.currentReservation();
    if (this.form.invalid || !res?.id) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const val = this.form.value;

    // Gửi định dạng local ISO (YYYY-MM-DDTHH:mm:ss) thay vì UTC để tránh bị trừ lệch múi giờ (UTC+7)
    const localDateTimeStr = `${val.reservationDate}T${val.reservationTime}:00`;

    const input: UpdateTableReservationDto = {
      customerName: val.customerName.trim(),
      customerPhone: val.customerPhone.trim(),
      reservationTime: localDateTimeStr,
      guestCount: val.guestCount,
      note: val.note?.trim() || null,
    };

    this.reservationService.update(res.id, input).subscribe({
      next: updated => {
        this.isSaving.set(false);
        this.toaster.success(
          this.localizationService.instant('::UpdateReservationSuccess', this.table?.name || '')
        );
        this.updated.emit(updated);
        this.close();
      },
      error: err => {
        this.isSaving.set(false);
        const errorMsg =
          err?.error?.error?.message ||
          err?.message ||
          this.localizationService.instant('::DefaultErrorMessage');
        this.toaster.error(errorMsg);
      },
    });
  }

  checkIn(): void {
    const res = this.currentReservation();
    if (!res?.id) return;

    this.isSaving.set(true);
    this.reservationService.checkIn(res.id).subscribe({
      next: checkedInDto => {
        this.isSaving.set(false);
        this.toaster.success(
          this.localizationService.instant('::CheckInSuccess', this.table?.name || '')
        );
        this.checkedIn.emit(checkedInDto);
        this.close();
      },
      error: err => {
        this.isSaving.set(false);
        const errorMsg =
          err?.error?.error?.message ||
          err?.message ||
          this.localizationService.instant('::DefaultErrorMessage');
        this.toaster.error(errorMsg);
      },
    });
  }

  cancel(): void {
    const res = this.currentReservation();
    if (!res?.id) return;

    this.confirmation
      .warn(
        this.localizationService.instant(
          '::CancelReservationConfirmMessage',
          this.table?.name || ''
        ),
        this.localizationService.instant('::CancelReservationConfirmTitle')
      )
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          const currentRes = this.currentReservation();
          if (!currentRes?.id) return;
          this.isSaving.set(true);
          this.reservationService.cancel(currentRes.id).subscribe({
            next: cancelledDto => {
              this.isSaving.set(false);
              this.toaster.success(
                this.localizationService.instant(
                  '::CancelReservationSuccess',
                  this.table?.name || ''
                )
              );
              this.cancelled.emit(cancelledDto);
              this.close();
            },
            error: err => {
              this.isSaving.set(false);
              const errorMsg =
                err?.error?.error?.message ||
                err?.message ||
                this.localizationService.instant('::DefaultErrorMessage');
              this.toaster.error(errorMsg);
            },
          });
        }
      });
  }
}
