import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ElementRef,
  HostListener,
  HostBinding,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';

export interface CustomSelectOption<T = any> {
  value: T;
  label?: string;
  icon?: string;
  desc?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    },
  ],
})
export class CustomSelectComponent implements ControlValueAccessor {
  @Input() options: CustomSelectOption[] = [];
  @Input() placeholder: string = '';
  @Input() leadIcon?: string;
  @Input() minWidth: string = '160px';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() placement: 'top' | 'bottom' | 'auto' = 'auto';
  @Input() searchable: boolean = false;
  @Input() disabled: boolean = false;
  @Input() searchPlaceholder: string = 'Tìm kiếm...';
  @Input() maxHeight: string = '200px';

  @Output() selectionChange = new EventEmitter<any>();

  @HostBinding('class.w-100')
  @HostBinding('style.width')
  get hostWidth(): string {
    return this.minWidth === '100%' ? '100%' : 'auto';
  }

  @HostBinding('style.display')
  get hostDisplay(): string {
    return this.minWidth === '100%' ? 'block' : 'inline-block';
  }

  @HostBinding('class.is-open')
  get hostIsOpen(): boolean {
    return this.isOpen;
  }

  @HostBinding('style.z-index')
  get hostZIndex(): string {
    return this.isOpen ? '1060' : 'auto';
  }

  isOpen = false;
  searchQuery = '';
  private _value: any = null;

  @Input()
  set value(val: any) {
    this._value = val;
    this.cdr.markForCheck();
  }
  get value(): any {
    return this._value;
  }

  calculatedPlacement: 'top' | 'bottom' = 'bottom';

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};
  private el = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private localizationService = inject(LocalizationService);

  writeValue(obj: any): void {
    this._value = obj;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  private static activeSelectInstance: CustomSelectComponent | null = null;

  closeDropdown(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.searchQuery = '';
      if (CustomSelectComponent.activeSelectInstance === this) {
        CustomSelectComponent.activeSelectInstance = null;
      }
      this.cdr.markForCheck();
    }
  }

  toggleDropdown(event?: Event) {
    if (this.disabled) return;
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (this.isOpen) {
      this.closeDropdown();
      return;
    }

    // Đóng dropdown khác nếu đang mở
    if (CustomSelectComponent.activeSelectInstance && CustomSelectComponent.activeSelectInstance !== this) {
      CustomSelectComponent.activeSelectInstance.closeDropdown();
    }

    if (this.placement === 'auto') {
      const rect = this.el.nativeElement.getBoundingClientRect();
      const modalDialog = (this.el.nativeElement as HTMLElement).closest(
        '.modal-content, .modal-dialog, .ant-modal-content, .abp-modal-content'
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (modalDialog) {
        const modalRect = modalDialog.getBoundingClientRect();
        const spaceBelowInModal = modalRect.bottom - rect.bottom;
        const spaceAboveInModal = rect.top - modalRect.top;
        if (spaceBelowInModal < 220 && spaceAboveInModal > spaceBelowInModal) {
          this.calculatedPlacement = 'top';
        } else {
          this.calculatedPlacement = 'bottom';
        }
      } else if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        this.calculatedPlacement = 'top';
      } else {
        this.calculatedPlacement = 'bottom';
      }
    } else {
      this.calculatedPlacement = this.placement;
    }
    this.isOpen = true;
    CustomSelectComponent.activeSelectInstance = this;
    this.searchQuery = '';
    this.onTouched();
    this.cdr.markForCheck();
  }

  selectOption(opt: CustomSelectOption, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.value = opt.value;
    this.onChange(this.value);
    this.selectionChange.emit(this.value);
    this.closeDropdown();
  }

  isSelected(opt: CustomSelectOption): boolean {
    if (opt.value === this.value) return true;
    if (
      (opt.value === '' || opt.value === null || opt.value === undefined) &&
      (this.value === '' || this.value === null || this.value === undefined)
    ) {
      return true;
    }
    if (
      typeof opt.value === 'string' &&
      typeof this.value === 'string' &&
      opt.value &&
      this.value &&
      opt.value.toLowerCase() === this.value.toLowerCase()
    ) {
      return true;
    }
    if (
      opt.value !== null &&
      opt.value !== undefined &&
      opt.value !== '' &&
      this.value !== null &&
      this.value !== undefined &&
      this.value !== '' &&
      !isNaN(Number(opt.value)) &&
      !isNaN(Number(this.value)) &&
      Number(opt.value) === Number(this.value)
    ) {
      return true;
    }
    return false;
  }

  getLocalizedText(text?: string): string {
    if (!text) return '';
    if (text.startsWith('::')) {
      return this.localizationService.instant(text);
    }
    if (text.includes('::')) {
      return text.replace(/::([A-Za-z0-9_.-]+)/g, (match, key) =>
        this.localizationService.instant('::' + key)
      );
    }
    return text;
  }

  get selectedOption(): CustomSelectOption | undefined {
    return this.options.find(o => this.isSelected(o));
  }

  get displayLabel(): string {
    const raw = this.selectedOption?.label || this.placeholder || '';
    return this.getLocalizedText(raw);
  }

  get filteredOptions(): CustomSelectOption[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.options;
    }
    const q = this.searchQuery.toLowerCase().trim();
    return this.options.filter(o => {
      const label = this.getLocalizedText(o.label).toLowerCase();
      const desc = this.getLocalizedText(o.desc).toLowerCase();
      return label.includes(q) || desc.includes(q);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isOpen) return;
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('keydown.escape')
  onEscape() {
    if (this.isOpen) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }
}
