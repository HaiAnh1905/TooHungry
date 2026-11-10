import { ChangeDetectorRef, Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { IdentityUserService, IdentityRoleService, IdentityUserDto, IdentityRoleDto } from '@abp/ng.identity/proxy';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { AuthLockoutService } from '../../shared/services/auth-lockout.service';
import { TableSignalrService } from '../../shared/services/table-signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FormsModule,
    CoreModule,
    ThemeSharedModule,
    NgxDatatableModule,
    CustomSelectComponent
  ],
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
})
export class Users implements OnInit, OnDestroy {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  private securityAlertSub?: Subscription;

  users: IdentityUserDto[] = [];
  roles: IdentityRoleDto[] = [];
  totalCount = 0;
  loading = false;
  
  pageIndex = 0; // NgxDatatable is 0-indexed for pagination offset
  pageSize = 10;
  
  pageSizeOptions: CustomSelectOption[] = [
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' }
  ];

  isModalVisible = false;
  modalLoading = false;
  form: FormGroup;
  selectedId: string | null = null;
  concurrencyStamp: string | null = null;
  
  modalRoleOptions: CustomSelectOption[] = [];
  adminExistsError = false;
  checkingAdmin = false;
  originalRoleName: string | null = null;
  showPassword = false;

  // Confirmation Modal State
  isConfirmModalVisible = false;
  confirmLoading = false;
  confirmActionType: 'lock' | 'unlock' | 'toggleActive' | 'delete' | null = null;
  confirmTargetUser: IdentityUserDto | null = null;
  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmPromptPrefix = '';
  confirmPromptSuffix = '';
  confirmModalNotice = '';
  confirmNoticeClass = '';
  confirmNoticeIcon = '';
  confirmModalIcon = '';
  confirmModalIconClass = '';
  confirmButtonText = '';
  confirmButtonClass = '';
  confirmButtonIcon = '';

  onTouchStartEye(event: TouchEvent) {
    event.preventDefault();
    this.showPassword = true;
  }

  onTouchEndEye(event: TouchEvent) {
    event.preventDefault();
    this.showPassword = false;
  }

  constructor(
    private userService: IdentityUserService,
    private roleService: IdentityRoleService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private lockoutService: AuthLockoutService,
    private signalrService: TableSignalrService,
    private toaster: ToasterService,
    private localization: LocalizationService
  ) {
    this.form = this.fb.group({
      userName: ['', [Validators.required]],
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      isActive: [true],
      roleNames: [null]
    });

    this.form.get('roleNames')?.valueChanges.subscribe(roleName => {
      if (roleName === 'Administrator' && roleName !== this.originalRoleName) {
        this.checkAdminExists();
      } else {
        this.adminExistsError = false;
        this.checkingAdmin = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();

    this.securityAlertSub = this.signalrService.securityAlert$.subscribe((alert) => {
      const msg = alert.message || this.localization.instant('::SecurityAlertBruteForceDetected') || 'Cảnh báo: Phát hiện tấn công brute-force!';
      this.toaster.error(msg);
      this.playSecurityAlertSound();
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    if (this.securityAlertSub) {
      this.securityAlertSub.unsubscribe();
    }
  }

  isAdminUser(user?: IdentityUserDto | null): boolean {
    if (!user || !user.userName) return false;
    return user.userName.trim().toLowerCase() === 'admin';
  }

  isUserAdminLocked(user: any): boolean {
    if (!user) return false;
    const extraProps = user.extraProperties || {};
    return extraProps['IsAdminLocked'] === true || extraProps['isAdminLocked'] === true;
  }

  isUserLockedOut(user: any): boolean {
    if (!user) return false;
    if (this.isUserAdminLocked(user)) return true;
    if (!user?.lockoutEnd) return false;
    return new Date(user.lockoutEnd).getTime() > Date.now();
  }

  openConfirmModal(type: 'lock' | 'unlock' | 'toggleActive' | 'delete', user: IdentityUserDto): void {
    if (!user || !user.id) return;
    this.confirmActionType = type;
    this.confirmTargetUser = user;
    this.confirmLoading = false;
    const userName = user.userName || '';

    switch (type) {
      case 'lock':
        this.confirmModalTitle = this.localization.instant('::ConfirmLockTitle') || 'Xác nhận khóa tài khoản';
        this.confirmPromptPrefix = this.localization.instant('::ConfirmLockPrefix') || 'Bạn có chắc chắn muốn khóa tài khoản';
        this.confirmPromptSuffix = this.localization.instant('::ConfirmQuestionSuffix') || ' không?';
        this.confirmModalNotice = this.localization.instant('::ConfirmLockNotice') || 'Tài khoản sẽ bị vô hiệu hóa quyền truy cập cho đến khi được Admin mở khóa thủ công.';
        this.confirmNoticeClass = 'notice-warning';
        this.confirmNoticeIcon = 'fa fa-triangle-exclamation';
        this.confirmModalIcon = 'fa fa-lock';
        this.confirmModalIconClass = 'bg-danger text-white';
        this.confirmButtonText = this.localization.instant('::ConfirmLockBtn') || 'Khóa tài khoản';
        this.confirmButtonClass = 'btn-danger';
        this.confirmButtonIcon = 'fa fa-lock';
        break;

      case 'unlock':
        this.confirmModalTitle = this.localization.instant('::ConfirmUnlockTitle') || 'Xác nhận mở khóa tài khoản';
        this.confirmPromptPrefix = this.localization.instant('::ConfirmUnlockPrefix') || 'Bạn có chắc chắn muốn mở khóa cho tài khoản';
        this.confirmPromptSuffix = this.localization.instant('::ConfirmQuestionSuffix') || 'không?';
        this.confirmModalNotice = this.localization.instant('::ConfirmUnlockNotice') || 'Tài khoản sẽ được khôi phục quyền đăng nhập vào hệ thống ngay lập tức.';
        this.confirmNoticeClass = 'notice-warning';
        this.confirmNoticeIcon = 'fa fa-unlock';
        this.confirmModalIcon = 'fa fa-unlock';
        this.confirmModalIconClass = 'bg-warning text-white';
        this.confirmButtonText = this.localization.instant('::ConfirmUnlockBtn') || 'Mở khóa';
        this.confirmButtonClass = 'btn-warning text-dark';
        this.confirmButtonIcon = 'fa fa-unlock';
        break;

      case 'toggleActive':
        const willDeactivate = user.isActive;
        this.confirmModalTitle = this.localization.instant(willDeactivate ? '::ConfirmDeactivateTitle' : '::ConfirmActivateTitle')
          || (willDeactivate ? 'Xác nhận vô hiệu hóa tài khoản' : 'Xác nhận kích hoạt tài khoản');
        this.confirmPromptPrefix = this.localization.instant(willDeactivate ? '::ConfirmDeactivatePrefix' : '::ConfirmActivatePrefix')
          || (willDeactivate ? 'Bạn có chắc chắn muốn vô hiệu hóa tài khoản' : 'Bạn có chắc chắn muốn kích hoạt lại tài khoản');
        this.confirmPromptSuffix = this.localization.instant('::ConfirmQuestionSuffix') || 'không?';
        this.confirmModalNotice = this.localization.instant(willDeactivate ? '::ConfirmDeactivateNotice' : '::ConfirmActivateNotice')
          || (willDeactivate ? 'Người dùng sẽ tạm thời không thể đăng nhập vào hệ thống trong thời gian này.' : 'Người dùng sẽ có thể đăng nhập và sử dụng hệ thống bình thường.');
        this.confirmNoticeClass = willDeactivate ? 'notice-secondary' : 'notice-success';
        this.confirmNoticeIcon = willDeactivate ? 'fa fa-circle-exclamation' : 'fa fa-circle-check';
        this.confirmModalIcon = willDeactivate ? 'fa fa-power-off' : 'fa fa-check';
        this.confirmModalIconClass = willDeactivate ? 'bg-secondary text-white' : 'bg-success text-white';
        this.confirmButtonText = this.localization.instant(willDeactivate ? '::ConfirmDeactivateBtn' : '::ConfirmActivateBtn')
          || (willDeactivate ? 'Vô hiệu hóa' : 'Kích hoạt');
        this.confirmButtonClass = willDeactivate ? 'btn-secondary' : 'btn-success';
        this.confirmButtonIcon = willDeactivate ? 'fa fa-power-off' : 'fa fa-check';
        break;

      case 'delete':
        this.confirmModalTitle = this.localization.instant('::ConfirmDeleteTitle') || 'Xác nhận xóa tài khoản';
        this.confirmPromptPrefix = this.localization.instant('::ConfirmDeletePrefix') || 'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản';
        this.confirmPromptSuffix = this.localization.instant('::ConfirmQuestionSuffix') || 'không?';
        this.confirmModalNotice = this.localization.instant('::ConfirmDeleteNotice') || 'Mọi dữ liệu liên quan sẽ bị xóa và hành động này không thể hoàn tác!';
        this.confirmNoticeClass = 'notice-danger';
        this.confirmNoticeIcon = 'fa fa-triangle-exclamation';
        this.confirmModalIcon = 'fa fa-trash';
        this.confirmModalIconClass = 'bg-danger text-white';
        this.confirmButtonText = this.localization.instant('::ConfirmDeleteBtn') || 'Xóa tài khoản';
        this.confirmButtonClass = 'btn-danger';
        this.confirmButtonIcon = 'fa fa-trash';
        break;
    }

    this.isConfirmModalVisible = true;
    this.cdr.detectChanges();
  }

  closeConfirmModal(): void {
    this.isConfirmModalVisible = false;
    this.confirmActionType = null;
    this.confirmTargetUser = null;
    this.confirmLoading = false;
  }

  executeConfirmedAction(): void {
    if (!this.confirmTargetUser || !this.confirmActionType) return;
    const user = this.confirmTargetUser;
    this.confirmLoading = true;

    switch (this.confirmActionType) {
      case 'lock':
        this.performLock(user);
        break;
      case 'unlock':
        this.performUnlock(user);
        break;
      case 'toggleActive':
        this.performToggleActive(user);
        break;
      case 'delete':
        this.performDelete(user);
        break;
    }
  }

  lockUser(user: IdentityUserDto): void {
    if (!user.id || this.isAdminUser(user)) {
      this.toaster.error(this.localization.instant('::CannotLockAdmin') || 'Không thể khóa tài khoản Quản trị viên!');
      return;
    }
    this.openConfirmModal('lock', user);
  }

  unlockUser(user: IdentityUserDto): void {
    if (!user.id) return;
    if (this.isAdminUser(user)) {
      this.toaster.error(this.localization.instant('::CannotLockAdmin') || 'Không thể thao tác trên tài khoản Quản trị viên!');
      return;
    }
    this.openConfirmModal('unlock', user);
  }

  performLock(user: IdentityUserDto): void {
    this.lockoutService.lockUser(user.id!, 'Quản trị viên khóa thủ công từ giao diện').subscribe({
      next: (res) => {
        const localizedMsg = this.localization.instant('::AccountLockedSuccess');
        const msg = (localizedMsg && !localizedMsg.includes('AccountLockedSuccess'))
          ? localizedMsg
          : (res.message || 'Khóa tài khoản thành công!');
        this.toaster.success(msg);
        this.closeConfirmModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Lock error detail:', err);
        const errorMsg = err?.error?.error?.message || err?.error?.message || (err?.status === 0 ? 'Không thể kết nối đến máy chủ Backend!' : (this.localization.instant('::AccountLockFailed') || 'Không thể khóa tài khoản.'));
        this.toaster.error(errorMsg);
        this.confirmLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  performUnlock(user: IdentityUserDto): void {
    this.lockoutService.unlockUser(user.id!, 'Quản trị viên mở khóa từ UI').subscribe({
      next: (res) => {
        const localizedMsg = this.localization.instant('::AccountUnlockedSuccess');
        const msg = (localizedMsg && !localizedMsg.includes('AccountUnlockedSuccess'))
          ? localizedMsg
          : (res.message || 'Mở khóa tài khoản thành công!');
        this.toaster.success(msg);
        this.closeConfirmModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Unlock error detail:', err);
        const errorMsg = err?.error?.error?.message || err?.error?.message || (err?.status === 0 ? 'Không thể kết nối đến máy chủ Backend!' : 'Không thể mở khóa tài khoản.');
        this.toaster.error(errorMsg);
        this.confirmLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private playSecurityAlertSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Audio autoplay might be restricted by browser policy
    }
  }

  loadRoles() {
    this.userService.getAssignableRoles().subscribe({
      next: res => {
        this.roles = res.items || [];
        this.modalRoleOptions = this.roles.map(r => ({
          value: r.name!,
          label: r.name!
        }));
      },
      error: () => {
        this.roles = [];
        this.modalRoleOptions = [];
      }
    });
  }

  loadUsers() {
    this.loading = true;
    this.cdr.detectChanges();
    
    this.userService.getList({
      skipCount: this.pageIndex * this.pageSize,
      maxResultCount: this.pageSize
    }).subscribe({
      next: (res) => {
        this.users = res.items || [];
        this.totalCount = res.totalCount || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setPage(pageInfo: any) {
    this.pageIndex = pageInfo.offset;
    this.loadUsers();
  }
  
  changePageSize(newSize: number) {
    this.pageSize = newSize;
    this.pageIndex = 0;
    this.loadUsers();
  }
  
  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }
  
  firstPage() {
    this.pageIndex = 0;
    this.loadUsers();
  }
  
  prevPage() {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.loadUsers();
    }
  }
  
  nextPage() {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.loadUsers();
    }
  }
  
  lastPage() {
    this.pageIndex = this.totalPages - 1;
    this.loadUsers();
  }
  
  get fromRecord(): number {
    return this.totalCount === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }
  
  get toRecord(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalCount);
  }

  openModal(user?: IdentityUserDto) {
    this.showPassword = false;
    this.selectedId = user?.id || null;
    this.concurrencyStamp = user?.concurrencyStamp || null;
    if (user) {
      this.userService.getRoles(user.id!).subscribe(res => {
        const userRoles = res.items || [];
        this.originalRoleName = userRoles.length > 0 ? (userRoles[0].name || null) : null;
        this.form.patchValue({
          userName: user.userName,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          password: '',
          roleNames: this.originalRoleName
        });
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
        this.isModalVisible = true;
      });
    } else {
      this.originalRoleName = null;
      this.form.reset({ isActive: true, roleNames: null });
      this.form.get('password')?.setValidators([Validators.required]);
      this.form.get('password')?.updateValueAndValidity();
      this.isModalVisible = true;
    }
  }

  checkAdminExists() {
    this.checkingAdmin = true;
    this.adminExistsError = false;
    this.cdr.detectChanges();
    
    const adminRole = this.roles.find(r => r.name === 'Administrator');
    if (!adminRole) {
      this.checkingAdmin = false;
      this.cdr.detectChanges();
      return;
    }

    this.userService.getList({ maxResultCount: 2, roleId: adminRole.id } as any).subscribe({
      next: (res) => {
        const admins = res.items || [];
        const otherAdmins = admins.filter(u => u.id !== this.selectedId);
        if (otherAdmins.length > 0) {
          this.adminExistsError = true;
        }
        this.checkingAdmin = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.checkingAdmin = false;
        this.cdr.detectChanges();
      }
    });
  }

  save() {
    if (this.form.invalid || this.adminExistsError || this.checkingAdmin) {
      Object.values(this.form.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.modalLoading = true;
    const val = { 
      ...this.form.value,
      concurrencyStamp: this.concurrencyStamp
    };
    
    // Convert single role string to array for API
    const roleNames = val.roleNames ? [val.roleNames] : [];
    val.roleNames = roleNames;
    
    // Delete empty password to avoid backend validation error during update
    if (this.selectedId && !val.password) {
      delete val.password;
    }
    
    if (this.selectedId) {
      const selectedRole = roleNames.length > 0 ? roleNames[0] : null;
      const roleChanged = selectedRole !== this.originalRoleName;

      this.userService.update(this.selectedId, val).subscribe({
        next: () => {
          if (roleChanged) {
            this.userService.updateRoles(this.selectedId!, { roleNames }).subscribe({
              next: () => {
                this.modalLoading = false;
                this.isModalVisible = false;
                this.loadUsers();
              },
              error: () => {
                this.modalLoading = false;
                this.cdr.detectChanges();
              }
            });
          } else {
            this.modalLoading = false;
            this.isModalVisible = false;
            this.loadUsers();
          }
        },
        error: () => {
          this.modalLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.userService.create(val).subscribe({
        next: (res) => {
          this.userService.updateRoles(res.id!, { roleNames }).subscribe({
            next: () => {
              this.modalLoading = false;
              this.isModalVisible = false;
              this.loadUsers();
            },
            error: () => {
              this.modalLoading = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {
          this.modalLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleActive(user: IdentityUserDto, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.isAdminUser(user)) {
      this.toaster.warn(this.localization.instant('::CannotDeactivateAdmin') || 'Không thể vô hiệu hóa tài khoản Quản trị viên.');
      return;
    }
    this.openConfirmModal('toggleActive', user);
  }

  deleteUser(user: IdentityUserDto): void {
    if (!user.id || this.isAdminUser(user)) {
      this.toaster.error(this.localization.instant('::CannotDeleteAdmin') || 'Không thể xóa tài khoản Quản trị viên!');
      return;
    }
    this.openConfirmModal('delete', user);
  }

  performToggleActive(user: IdentityUserDto): void {
    const updateInput = {
      ...user,
      isActive: !user.isActive
    };
    this.userService.update(user.id!, updateInput as any).subscribe({
      next: () => {
        const successMsg = !user.isActive
          ? (this.localization.instant('::AccountActivatedSuccess') || 'Kích hoạt tài khoản thành công!')
          : (this.localization.instant('::AccountDeactivatedSuccess') || 'Vô hiệu hóa tài khoản thành công!');
        this.toaster.success(successMsg);
        this.closeConfirmModal();
        this.loadUsers();
      },
      error: (err) => {
        const errorMsg = err?.error?.error?.message || this.localization.instant('::CannotUpdateStatus') || 'Không thể cập nhật trạng thái!';
        this.toaster.error(errorMsg);
        this.confirmLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  performDelete(user: IdentityUserDto): void {
    this.userService.delete(user.id!).subscribe({
      next: () => {
        this.toaster.success(this.localization.instant('::UserDeletedSuccess') || 'Xóa tài khoản thành công!');
        this.closeConfirmModal();
        this.loadUsers();
      },
      error: (err) => {
        const errorMsg = err?.error?.error?.message || this.localization.instant('::UserDeleteFailed') || 'Không thể xóa tài khoản!';
        this.toaster.error(errorMsg);
        this.confirmLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}











