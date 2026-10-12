import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-shared-modal',
  standalone: true,
  imports: [CommonModule, NzModalModule, NzButtonModule],
  templateUrl: './shared-modal.html',
  styleUrls: []
})
export class SharedModalComponent {
  @Input() isVisible = false;
  @Input() title = 'Modal Title';
  @Input() width = 520;
  @Input() confirmLoading = false;
  
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() onOk = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  handleOk(): void {
    this.onOk.emit();
  }

  handleCancel(): void {
    this.isVisibleChange.emit(false);
    this.onCancel.emit();
  }
}
