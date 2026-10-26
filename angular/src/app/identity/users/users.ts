import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { IdentityUserService, IdentityRoleService, IdentityUserDto, IdentityRoleDto } from '@abp/ng.identity/proxy';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ThemeSharedModule } from '@abp/ng.theme.shared';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';
import { CoreModule } from '@abp/ng.core';

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
export class Users implements OnInit {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

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
    private cdr: ChangeDetectorRef
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

  toggleActive(user: IdentityUserDto, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const updateInput = {
      ...user,
      isActive: !user.isActive
    };
    this.userService.update(user.id!, updateInput as any).subscribe(() => {
      this.loadUsers();
    });
  }
}











