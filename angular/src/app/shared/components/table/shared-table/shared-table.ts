import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';

export interface ColumnItem {
  name: string;
  key: string;
  sortOrder?: string | null;
  sortFn?: any;
  customTemplate?: TemplateRef<any>;
}

@Component({
  selector: 'app-shared-table',
  standalone: true,
  imports: [CommonModule, NzTableModule],
  templateUrl: './shared-table.html',
  styleUrls: []
})
export class SharedTableComponent {
  @Input() data: any[] = [];
  @Input() columns: ColumnItem[] = [];
  @Input() loading = false;
  @Input() totalCount = 0;
  @Input() pageIndex = 1;
  @Input() pageSize = 10;
  
  @Output() queryParamsChange = new EventEmitter<any>();

  onQueryParamsChange(params: any): void {
    this.queryParamsChange.emit(params);
  }
}
