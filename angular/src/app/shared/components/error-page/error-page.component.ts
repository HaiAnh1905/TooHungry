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
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { UserRoleNavigationService } from '../../services/user-role-navigation.service';

export type SupportedErrorCode = 0 | 404 | 403 | 500 | 505;

export interface ErrorPageConfig {
  statusCode: SupportedErrorCode;
  titleKey: string;
  descriptionKey: string;
  badgeText: string;
  iconType: 'empty-table' | 'security-lock' | 'server-disconnect' | 'network-offline';
  showRetryButton: boolean;
  showBackButton: boolean;
  showTraceId: boolean;
}

export const ERROR_PAGE_CONFIGS: Record<number, ErrorPageConfig> = {
  0: {
    statusCode: 0,
    titleKey: 'ErrorPages.0.Title',
    descriptionKey: 'ErrorPages.0.Description',
    badgeText: 'MẤT KẾT NỐI MÁY CHỦ (NETWORK ERROR)',
    iconType: 'network-offline',
    showRetryButton: true,
    showBackButton: true,
    showTraceId: true,
  },
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

export const ERROR_PAGE_LOCALIZATION: Record<string, Record<string, string>> = {
  vi: {
    'ErrorPages.0.Title': 'Không thể kết nối đến máy chủ',
    'ErrorPages.0.Description': 'Hệ thống không thể kết nối tới máy chủ backend. Vui lòng kiểm tra lại dịch vụ API hoặc đường truyền mạng rồi thử lại.',
    'ErrorPages.404.Title': 'Không tìm thấy trang yêu cầu',
    'ErrorPages.404.Description': 'Đường dẫn bạn truy cập không tồn tại hoặc đã được chuyển sang địa chỉ mới trong nhà hàng.',
    'ErrorPages.403.Title': 'Truy cập bị từ chối',
    'ErrorPages.403.Description': 'Tài khoản của bạn không có đủ quyền hạn để truy cập vào phân hệ này. Vui lòng liên hệ Quản lý nhà hàng.',
    'ErrorPages.500.Title': 'Hệ thống gặp sự cố kỹ thuật',
    'ErrorPages.500.Description': 'Đã xảy ra lỗi nội bộ máy chủ khi xử lý yêu cầu. Đội ngũ kỹ thuật đã được thông báo để khắc phục.',
    'ErrorPages.505.Title': 'Giao thức không được hỗ trợ',
    'ErrorPages.505.Description': 'Phiên bản HTTP của trình duyệt không được máy chủ hỗ trợ. Vui lòng thử tải lại hoặc cập nhật trình duyệt.',
    'ErrorPages.AutoRedirectNotice': 'Hệ thống sẽ tự động đưa bạn về trang làm việc sau {0} giây...',
    'ErrorPages.PauseCountdown': 'Tạm dừng',
    'ErrorPages.ResumeCountdown': 'Tiếp tục',
    'ErrorPages.BackToHome': 'Quay về trang chính của tôi',
    'ErrorPages.BackToTableList': 'Quay về Danh sách bàn',
    'ErrorPages.BackToDashboard': 'Quay về Dashboard',
    'ErrorPages.BackToTableManagement': 'Quay về Quản lý bàn',
    'ErrorPages.BackToOrders': 'Quay về Quản lý đơn hàng',
    'ErrorPages.BackToDishes': 'Quay về Quản lý món ăn',
    'ErrorPages.BackToInventory': 'Quay về Quản lý kho',
    'ErrorPages.BackToUserManagement': 'Quay về Quản lý người dùng',
    'ErrorPages.BackToLogin': 'Quay về Đăng nhập',
    'ErrorPages.BackToPreviousPage': 'Quay lại trang trước',
    'ErrorPages.Retry': 'Thử lại',
    'ErrorPages.CopyTraceId': 'Sao chép mã lỗi',
    'ErrorPages.Copied': 'Đã sao chép!',
    'ErrorPages.TraceIdLabel': 'Mã tham chiếu lỗi',
  },
  en: {
    'ErrorPages.0.Title': 'Cannot Connect to Server',
    'ErrorPages.0.Description': 'The system cannot reach the backend server. Please verify that the backend API service is running and try again.',
    'ErrorPages.404.Title': 'Page Not Found',
    'ErrorPages.404.Description': 'The requested link does not exist or has been relocated to a new address.',
    'ErrorPages.403.Title': 'Access Forbidden',
    'ErrorPages.403.Description': 'Your account does not have sufficient permissions to access this area. Please contact your restaurant manager.',
    'ErrorPages.500.Title': 'Server Error Occurred',
    'ErrorPages.500.Description': 'An internal server error occurred while processing your request. The technical team has been notified.',
    'ErrorPages.505.Title': 'HTTP Version Not Supported',
    'ErrorPages.505.Description': 'The HTTP version used in your request is not supported by the server. Please try refreshing or updating your browser.',
    'ErrorPages.AutoRedirectNotice': 'System will automatically redirect you to your workspace in {0} seconds...',
    'ErrorPages.PauseCountdown': 'Pause',
    'ErrorPages.ResumeCountdown': 'Resume',
    'ErrorPages.BackToHome': 'Back to My Home',
    'ErrorPages.BackToTableList': 'Back to Tables',
    'ErrorPages.BackToDashboard': 'Back to Dashboard',
    'ErrorPages.BackToTableManagement': 'Back to Table Management',
    'ErrorPages.BackToOrders': 'Back to Orders',
    'ErrorPages.BackToDishes': 'Back to Dishes',
    'ErrorPages.BackToInventory': 'Back to Inventory',
    'ErrorPages.BackToUserManagement': 'Back to User Management',
    'ErrorPages.BackToLogin': 'Back to Login',
    'ErrorPages.BackToPreviousPage': 'Back to Previous Page',
    'ErrorPages.Retry': 'Retry',
    'ErrorPages.CopyTraceId': 'Copy Error Code',
    'ErrorPages.Copied': 'Copied!',
    'ErrorPages.TraceIdLabel': 'Error Reference ID',
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
  private readonly localizationService = inject(LocalizationService, { optional: true });
  readonly roleNavService = inject(UserRoleNavigationService);

  @Input() statusCodeInput?: number;
  @Input() errorStatus?: number;
  readonly status = signal<number | undefined>(undefined);
  destroy$?: any;

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
    // 1. Phân giải mã trạng thái HTTP (hỗ trợ cả 0, 403, 404, 500, 505)
    let resolvedStatus: number = 404;

    if (this.statusCodeInput !== undefined) {
      resolvedStatus = Number(this.statusCodeInput);
    } else if (this.errorStatus !== undefined) {
      resolvedStatus = Number(this.errorStatus);
    } else if (this.status() !== undefined) {
      resolvedStatus = Number(this.status());
    } else if (this.route?.snapshot?.data?.['status'] !== undefined) {
      resolvedStatus = Number(this.route.snapshot.data['status']);
    } else if (this.route?.snapshot?.queryParams?.['status'] !== undefined) {
      resolvedStatus = Number(this.route.snapshot.queryParams['status']);
    }

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

  /**
   * Hàm dịch từ khóa i18n linh hoạt:
   * 1. Ưu tiên tra cứu qua ABP LocalizationService nếu backend đã nạp resource.
   * 2. Nếu ABP trả về nguyên mã key hoặc backend chưa restart, tự động dùng từ điển nội bộ (hỗ trợ cả vi & en).
   * 3. Thay thế tham số {0} nếu có (ví dụ số giây đếm ngược).
   */
  translate(key: string, param?: string | number): string {
    if (!key) {
      return '';
    }

    const currentLang = this.localizationService?.currentLang?.toLowerCase();
    const lang = currentLang?.startsWith('en') ? 'en' : 'vi';

    let result = '';

    if (this.localizationService) {
      const prefixedKey = key.startsWith('::') ? key : `::${key}`;
      const res = this.localizationService.instant(prefixedKey);
      if (
        res &&
        res !== prefixedKey &&
        res !== key &&
        !res.startsWith('::') &&
        !res.startsWith('ErrorPages.')
      ) {
        result = res;
      }
    }

    if (!result) {
      const cleanKey = key.replace(/^::/, '');
      const dict = ERROR_PAGE_LOCALIZATION[lang] || ERROR_PAGE_LOCALIZATION['vi'];
      result = dict[cleanKey] || cleanKey;
    }

    if (param !== undefined && param !== null) {
      result = result.replace('{0}', String(param));
    }

    return result;
  }
}

