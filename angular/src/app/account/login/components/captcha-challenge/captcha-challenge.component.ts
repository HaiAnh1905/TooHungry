import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';

@Component({
  selector: 'app-captcha-challenge',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule],
  templateUrl: './captcha-challenge.component.html',
  styleUrl: './captcha-challenge.component.scss',
})
export class CaptchaChallengeComponent {
  @Input() question: string = '';
  @Input() disabled: boolean = false;
  @Output() answerChange = new EventEmitter<string>();
  @Output() refreshRequested = new EventEmitter<void>();

  answer: string = '';

  onAnswerInput(): void {
    this.answerChange.emit(this.answer.trim());
  }

  onRefresh(): void {
    this.answer = '';
    this.answerChange.emit('');
    this.refreshRequested.emit();
  }
}

