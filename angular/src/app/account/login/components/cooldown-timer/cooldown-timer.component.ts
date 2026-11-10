import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@abp/ng.core';

@Component({
  selector: 'app-cooldown-timer',
  standalone: true,
  imports: [CommonModule, CoreModule],
  templateUrl: './cooldown-timer.component.html',
  styleUrl: './cooldown-timer.component.scss',
})
export class CooldownTimerComponent {
  @Input() formattedTime: string = '00:00';
  @Input() remainingSeconds: number = 0;
  @Input() lockoutLevel: number = 1;
  @Input() customMessage: string = '';
  @Input() isAdminLocked: boolean = false;

  @Output() backToLoginRequested = new EventEmitter<void>();

  onBackToLogin(): void {
    this.backToLoginRequested.emit();
  }
}

