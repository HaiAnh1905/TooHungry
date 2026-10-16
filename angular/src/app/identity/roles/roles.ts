import { ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IdentityRoleService, IdentityRoleDto } from '@abp/ng.identity/proxy';
import { RestService, ConfigStateService, CoreModule } from '@abp/ng.core';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-roles',
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
  templateUrl: './roles.html',
  styleUrls: ['./roles.scss']
})
export class Roles implements OnInit {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

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

  isPermissionModalVisible = false;
  modalLoading = false;
  selectedRoleName = '';
  
  permissionGroups: any[] = [];
  private toaster = inject(ToasterService);
  private configState = inject(ConfigStateService);
  
  constructor(
    private roleService: IdentityRoleService,
    private restService: RestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles() {
    this.loading = true;
    this.cdr.detectChanges();
    
    this.roleService.getList({
      skipCount: this.pageIndex * this.pageSize,
      maxResultCount: this.pageSize
    }).subscribe({
      next: (res) => {
        this.roles = res.items || [];
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
    this.loadRoles();
  }
  
  changePageSize(newSize: number) {
    this.pageSize = newSize;
    this.pageIndex = 0;
    this.loadRoles();
  }
  
  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }
  
  firstPage() {
    this.pageIndex = 0;
    this.loadRoles();
  }
  
  prevPage() {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.loadRoles();
    }
  }
  
  nextPage() {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.loadRoles();
    }
  }
  
  lastPage() {
    this.pageIndex = this.totalPages - 1;
    this.loadRoles();
  }
  
  get fromRecord(): number {
    return this.totalCount === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }
  
  get toRecord(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalCount);
  }

  openPermissions(role: IdentityRoleDto) {
    this.selectedRoleName = role.name!;
    this.modalLoading = true;
    this.isPermissionModalVisible = true;
    
    this.restService.request<void, any>({
      method: 'GET',
      url: `/api/permission-management/permissions?providerName=R&providerKey=${role.name}`
    }).subscribe({
      next: (res) => {
        this.modalLoading = false;
        // Chỉ giữ lại nhóm phân quyền nghiệp vụ của nhà hàng (TooHungry) và phân quyền hệ thống cơ bản (AbpIdentity)
        this.permissionGroups = res.groups.filter((g: any) => g.name === 'TooHungry' || g.name === 'AbpIdentity').map((g: any) => {
          const parents = g.permissions.filter((p: any) => !p.parentName);
          const formattedPermissions = parents.map((parent: any) => {
            const children = g.permissions.filter((p: any) => p.name !== parent.name && p.name.startsWith(parent.name + '.'));
            const isAnyChildGranted = children.some((c: any) => c.isGranted);
            return {
              ...parent,
              isGranted: parent.isGranted || isAnyChildGranted,
              isExpanded: false,
              children
            };
          });
          return {
            ...g,
            formattedPermissions
          };
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.modalLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleParent(group: any, parent: any) {
    const isGranted = parent.isGranted;
    if (parent.children) {
      parent.children.forEach((c: any) => {
        c.isGranted = isGranted;
      });
    }
  }

  childChanged(group: any, parent: any, child: any) {
    if (child.isGranted) {
      // Nếu bất kỳ quyền con nào được bật -> quyền cha (module) phải được bật
      parent.isGranted = true;
    }
  }

  selectAll(granted: boolean) {
    for (const group of this.permissionGroups) {
      for (const parent of group.formattedPermissions) {
        parent.isGranted = granted;
        if (parent.children) {
          parent.children.forEach((c: any) => {
            c.isGranted = granted;
          });
        }
      }
    }
    this.cdr.detectChanges();
  }

  toggleExpandAll(expanded: boolean) {
    for (const group of this.permissionGroups) {
      for (const parent of group.formattedPermissions) {
        parent.isExpanded = expanded;
      }
    }
    this.cdr.detectChanges();
  }

  get isAllSelected(): boolean {
    if (!this.permissionGroups.length) return false;
    for (const group of this.permissionGroups) {
      for (const parent of group.formattedPermissions) {
        if (!parent.isGranted) return false;
        if (parent.children && parent.children.some((c: any) => !c.isGranted)) return false;
      }
    }
    return true;
  }

  get isMasterIndeterminate(): boolean {
    if (!this.permissionGroups.length) return false;
    let anyGranted = false;
    let anyNotGranted = false;
    for (const group of this.permissionGroups) {
      for (const parent of group.formattedPermissions) {
        if (parent.isGranted) anyGranted = true;
        else anyNotGranted = true;
        if (parent.children) {
          for (const c of parent.children) {
            if (c.isGranted) anyGranted = true;
            else anyNotGranted = true;
          }
        }
      }
    }
    return anyGranted && anyNotGranted;
  }

  isIndeterminate(parent: any): boolean {
    if (!parent.children || parent.children.length === 0) return false;
    const checkedCount = parent.children.filter((c: any) => c.isGranted).length;
    return checkedCount > 0 && checkedCount < parent.children.length;
  }

  savePermissions() {
    this.modalLoading = true;
    const permissionsToUpdate: any[] = [];
    
    for (const group of this.permissionGroups) {
      for (const parent of group.formattedPermissions) {
        permissionsToUpdate.push({
          name: parent.name,
          isGranted: !!parent.isGranted
        });
        if (parent.children) {
          for (const child of parent.children) {
            permissionsToUpdate.push({
              name: child.name,
              isGranted: !!child.isGranted
            });
          }
        }
      }
    }

    this.restService.request<any, void>({
      method: 'PUT',
      url: `/api/permission-management/permissions?providerName=R&providerKey=${this.selectedRoleName}`,
      body: { permissions: permissionsToUpdate }
    }).subscribe({
      next: () => {
        this.modalLoading = false;
        this.isPermissionModalVisible = false;
        this.toaster.success('::PermissionsUpdatedSuccessfully');
        this.configState.refreshAppState().subscribe();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.modalLoading = false;
        this.toaster.error(err?.error?.error?.message || '::PermissionsUpdateFailed');
        this.cdr.detectChanges();
      }
    });
  }
}
