import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DiningAreaService } from '../../proxy/dining-areas/dining-area.service';
import { DiningAreaDto, CreateUpdateDiningAreaDto } from '../../proxy/dining-areas/models';

@Component({
  selector: 'app-dining-area-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './dining-area-form-modal.component.html',
  styleUrl: './dining-area-form-modal.component.scss',
})
export class DiningAreaFormModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly diningAreaService = inject(DiningAreaService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() areaCreated = new EventEmitter<DiningAreaDto>();

  form: FormGroup = this.buildForm();
  isSaving = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.form.reset({ name: '', description: '' });
      this.isSaving = false;
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]],
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  save(): void {
    if (this.form.invalid || this.isSaving) return;

    this.isSaving = true;
    const input: CreateUpdateDiningAreaDto = {
      name: this.form.get('name')?.value?.trim(),
      description: this.form.get('description')?.value?.trim() || undefined,
    };

    this.diningAreaService.create(input).subscribe({
      next: (created) => {
        this.isSaving = false;
        this.toaster.success(
          this.localizationService.instant('::AreaCreatedSuccess', created.name || ''),
          this.localizationService.instant('::Success')
        );
        this.areaCreated.emit(created);
        this.close();
      },
      error: (err) => {
        this.isSaving = false;
        const msg =
          err?.error?.error?.message ||
          err?.error?.message ||
          this.localizationService.instant('::SaveFailed');
        this.toaster.error(msg, this.localizationService.instant('::Error'));
      },
    });
  }
}
