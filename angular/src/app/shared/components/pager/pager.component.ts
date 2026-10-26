import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { CustomSelectComponent, CustomSelectOption } from '../custom-select/custom-select.component';

@Component({
  selector: 'app-pager',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, CustomSelectComponent],
  templateUrl: './pager.component.html',
  styleUrl: './pager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent implements OnChanges {
  @Input() totalCount: number | null | undefined = 0;
  @Input() pageSize: number = 10;
  @Input() page: number = 1; // 1-indexed
  @Input() set currentPage(val: number) {
    this.page = val;
  }
  get currentPage(): number {
    return this.page;
  }
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50];
  @Input() showPageSizeSelector: boolean = true;
  @Input() unitKey?: string;
  @Input() list?: any; // Optional ABP ListService adapter
  @Input() set listService(val: any) {
    this.list = val;
  }
  get listService(): any {
    return this.list;
  }

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() offsetChange = new EventEmitter<number>();

  pageSizeSelectOptions: CustomSelectOption[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageSizeOptions']) {
      this.buildPageSizeOptions();
    }

    if (this.list) {
      if (typeof this.list.page === 'number') {
        this.page = this.list.page + 1;
      }
      if (typeof this.list.maxResultCount === 'number') {
        this.pageSize = this.list.maxResultCount;
      }
    }

    if (!this.pageSizeSelectOptions.length) {
      this.buildPageSizeOptions();
    }
  }

  private buildPageSizeOptions(): void {
    const options = this.pageSizeOptions?.length ? this.pageSizeOptions : [5, 10, 20, 50];
    this.pageSizeSelectOptions = options.map(size => ({
      value: size,
      label: `${size} ::RowsPerPage`,
    }));
  }

  get totalPages(): number {
    const total = this.totalCount || 0;
    const size = this.pageSize || 10;
    return Math.max(1, Math.ceil(total / size));
  }

  get fromRecord(): number {
    if (!this.totalCount) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    if (!this.totalCount) return 0;
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  get pages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.page;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  goToPage(newPage: number | string): void {
    if (typeof newPage !== 'number') return;
    if (newPage < 1 || newPage > this.totalPages || newPage === this.page) return;

    this.page = newPage;
    this.pageChange.emit(this.page);
    this.offsetChange.emit(this.page - 1);

    if (this.list) {
      this.list.page = this.page - 1;
    }
  }

  firstPage(): void {
    this.goToPage(1);
  }

  prevPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  lastPage(): void {
    this.goToPage(this.totalPages);
  }

  onPageSizeSelected(newSize: number): void {
    if (!newSize || newSize === this.pageSize) return;
    this.pageSize = Number(newSize);
    this.page = 1;

    this.pageSizeChange.emit(this.pageSize);
    this.pageChange.emit(1);
    this.offsetChange.emit(0);

    if (this.list) {
      this.list.page = 0;
      this.list.maxResultCount = this.pageSize;
    }
  }
}
