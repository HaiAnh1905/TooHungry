import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { TableDto } from '../../proxy/tables/models';
import { TableReservationService } from '../../proxy/reservations/table-reservation.service';
import { TableReservationDto, CreateTableReservationDto } from '../../proxy/reservations/models';

@Component({
  selector: 'app-table-reservation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './table-reservation-modal.component.html',
  styleUrl: './table-reservation-modal.component.scss',
})
export class TableReservationModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly reservationService = inject(TableReservationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);

  @Input() table: TableDto | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() reservationCreated = new EventEmitter<TableReservationDto>();

  readonly isSaving = signal(false);

  // Min date: today, Max date: today + 7 days
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.table) {
      this.resetForm();
    }
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private timeRangeValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    const [hours, minutes] = control.value.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    // Allowed between 09:00 and 22:59
    if (hours < 9 || hours > 22) {
      return { outsideOpeningHours: true };
    }
    return null;
  }

  resetForm(): void {
    const today = new Date();
    const nextHour = new Date();
    nextHour.setHours(Math.max(9, Math.min(22, today.getHours() + 1)), 0, 0, 0);

    const timeString = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;

    this.form.reset({
      customerName: '',
      customerPhone: '',
      reservationDate: this.formatDate(today),
      reservationTime: timeString,
      guestCount: this.table?.capacity || 4,
      note: '',
    });

    // Update guestCount validator max capacity
    const capacity = this.table?.capacity || 100;
    this.form.get('guestCount')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(capacity),
    ]);
    this.form.get('guestCount')?.updateValueAndValidity();
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (this.form.invalid || !this.table?.id) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const val = this.form.value;

    // Combine date and time to ISO string
    const [year, month, day] = val.reservationDate.split('-').map(Number);
    const [hours, minutes] = val.reservationTime.split(':').map(Number);
    const resDate = new Date(year, month - 1, day, hours, minutes, 0);

    const input: CreateTableReservationDto = {
      tableId: this.table.id,
      customerName: val.customerName.trim(),
      customerPhone: val.customerPhone.trim(),
      reservationTime: resDate.toISOString(),
      guestCount: val.guestCount,
      note: val.note?.trim() || null,
    };

    this.reservationService.create(input).subscribe({
      next: created => {
        this.isSaving.set(false);
        this.toaster.success(
          this.localizationService.instant('::ReservationSuccess', this.table?.name || '')
        );
        this.reservationCreated.emit(created);
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
}
