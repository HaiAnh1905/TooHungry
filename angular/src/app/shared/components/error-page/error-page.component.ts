import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  signal,
  computed,
  inject,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CoreModule } from '@abp/ng.core';
import { UserRoleNavigationService } from '../../services/user-role-navigation.service';

export interface ErrorPageConfig {
  statusCode: 404 | 403 | 500 | 505;
  titleKey: string;
  descriptionKey: string;
  badgeText: string;
  iconType: 'empty-table' | 'security-lock' | 'server-disconnect';
  showRetryButton: boolean;
  showBackButton: boolean;
  showTraceId: boolean;
}

export const ERROR_PAGE_CONFIGS: Record<number, ErrorPageConfig> = {
  404: {
    statusCode: 404,
    titleKey: 'ErrorPages.404.Title',
    descriptionKey: 'ErrorPages.404.Description',
    badgeText: 'HTTP 404 NOT FOUND',
    iconType: 'empty-table',
    showRetryButton: false,
    showBackButton: true,
    showTraceId: false,
  },
  403: {
    statusCode: 403,
    titleKey: 'ErrorPages.403.Title',
    descriptionKey: 'ErrorPages.403.Description',
    badgeText: 'HTTP 403 FORBIDDEN',
    iconType: 'security-lock',
    showRetryButton: false,
    showBackButton: true,
    showTraceId: false,
  },
  500: {
    statusCode: 500,
    titleKey: 'ErrorPages.500.Title',
    descriptionKey: 'ErrorPages.500.Description',
    badgeText: 'HTTP 500 INTERNAL SERVER ERROR',
    iconType: 'server-disconnect',
    showRetryButton: true,
    showBackButton: true,
    showTraceId: true,
  },
  505: {
    statusCode: 505,
    titleKey: 'ErrorPages.505.Title',
    descriptionKey: 'ErrorPages.505.Description',
    badgeText: 'HTTP 505 VERSION NOT SUPPORTED',
    iconType: 'server-disconnect',
    showRetryButton: true,
    showBackButton: true,
    showTraceId: true,
  },
};

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, RouterModule, CoreModule],
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  readonly roleNavService = inject(UserRoleNavigationService);

  @Input() statusCodeInput?: number;
  @Input() customTitle?: string;
  @Input() customMessage?: string;
  @Input() traceIdInput?: string;
  @Input() autoRedirectDuration: number = 5;

  readonly countdown = signal<number>(5);
  readonly countdownStr = computed(() => this.countdown().toString());
  readonly isPaused = signal<boolean>(false);
  readonly manuallyPaused = signal<boolean>(false);
  private readonly hoverPaused = signal<boolean>(false);
  private readonly tabPaused = signal<boolean>(false);

  readonly progressPercent = computed(() => {
    const duration = this.autoRedirectDuration > 0 ? this.autoRedirectDuration : 5;
    return Math.max(0, Math.min(100, (this.countdown() / duration) * 100));
  });

  readonly copied = signal<boolean>(false);
  readonly traceId = signal<string>('');
  readonly activeConfig = signal<ErrorPageConfig>(ERROR_PAGE_CONFIGS[404]);

  private timerInterval: any = null;

  ngOnInit(): void {
    // 1. Phân giải mã trạng thái HTTP từ Input -> Route Data -> Route QueryParams -> 404
    const resolvedStatus =
      this.statusCodeInput ||
      this.route.snapshot.data['status'] ||
      Number(this.route.snapshot.queryParams['status']) ||
      404;

    const config = ERROR_PAGE_CONFIGS[resolvedStatus] || ERROR_PAGE_CONFIGS[404];
    this.activeConfig.set(config);

    // 2. Thiết lập thời gian đếm ngược ban đầu
    const duration = this.autoRedirectDuration > 0 ? this.autoRedirectDuration : 5;
    this.countdown.set(duration);

    // 3. Khởi tạo Trace ID nếu cấu hình cho phép
    if (config.showTraceId) {
      const paramTrace = this.traceIdInput || this.route.snapshot.queryParams['traceId'];
      if (paramTrace) {
        this.traceId.set(String(paramTrace));
      } else {
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.traceId.set(`ERR-${timestamp}-${randomHex}`);
      }
    }

    // 4. Kích hoạt đồng hồ đếm ngược tự động phục hồi
    this.startCountdownTimer();
  }

  ngOnDestroy(): void {
    this.cleanupTimer();
  }

  /**
   * Bắt sự kiện chuột rê vào card lỗi để tạm dừng đếm ngược
   */
  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.hoverPaused.set(true);
    this.syncPausedState();
  }

  /**
   * Bắt sự kiện chuột rời khỏi card lỗi để tiếp tục đếm ngược
   */
  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hoverPaused.set(false);
    this.syncPausedState();
  }

  /**
   * Bắt sự kiện chuyển tab trình duyệt: Tạm dừng khi tab ẩn
   */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document !== 'undefined') {
      this.tabPaused.set(document.hidden);
      this.syncPausedState();
    }
  }

  private syncPausedState(): void {
    this.isPaused.set(this.manuallyPaused() || this.hoverPaused() || this.tabPaused());
  }

  private startCountdownTimer(): void {
    this.cleanupTimer();

    this.timerInterval = setInterval(() => {
      if (this.isPaused()) {
        return;
      }

      const current = this.countdown();
      if (current <= 1) {
        this.countdown.set(0);
        this.cleanupTimer();
        this.goHome();
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  private cleanupTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Đảo trạng thái tạm dừng / tiếp tục thủ công qua nút bấm
   */
  togglePause(): void {
    const nextManualState = !this.manuallyPaused();
    this.manuallyPaused.set(nextManualState);
    this.syncPausedState();
  }

  /**
   * Điều hướng về trang làm việc chuẩn theo vai trò
   */
  goHome(): void {
    this.cleanupTimer();
    const targetRoute = this.roleNavService.getDefaultHomeRoute();
    this.router.navigate([targetRoute]);
  }

  /**
   * Quay lại trang trước an toàn trong lịch sử trình duyệt
   */
  goBack(): void {
    this.cleanupTimer();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.goHome();
    }
  }

  /**
   * Tải lại trang (áp dụng cho lỗi 500 / 505)
   */
  retry(): void {
    this.cleanupTimer();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * Sao chép mã đối soát lỗi Trace ID vào clipboard
   */
  copyTraceId(): void {
    const id = this.traceId();
    if (!id || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(id).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  /**
   * Lấy nhãn bản dịch nút điều hướng chính theo vai trò
   */
  get homeButtonLabelKey(): string {
    return this.roleNavService.getDefaultHomeLabelKey();
  }
}
