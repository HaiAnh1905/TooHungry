import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@Component({
  selector: 'app-shared-spinner',
  standalone: true,
  imports: [CommonModule, NzSpinModule],
  templateUrl: './shared-spinner.html',
  styleUrls: []
})
export class SharedSpinnerComponent {
  @Input() spinning = true;
  @Input() tip = 'Đang tải...';
  @Input() size: 'small' | 'default' | 'large' = 'default';
}
