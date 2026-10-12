import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CoreModule,
  ListService,
  LocalizationService,
  PagedResultDto,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Subscription } from 'rxjs';
import { DiningAreaService } from '../proxy/dining-areas/dining-area.service';
import { DiningAreaDto, CreateUpdateDiningAreaDto, GetDiningAreasInput } from '../proxy/dining-areas/models';
import { TableService } from '../proxy/tables/table.service';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-dining-area',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    CustomSelectComponent,
  ],
  templateUrl: './dining-area.component.html',
  styleUrl: './dining-area.component.scss',
  providers: [ListService],
})
export class DiningAreaComponent implements OnInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly diningAreaService = inject(DiningAreaService);
  private readonly tableService = inject(TableService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  data: PagedResultDto<DiningAreaDto> = { items: [], totalCount: 0 };
  readonly allAreas = signal<DiningAreaDto[]>([]);

  // Filter & Search states
  searchTerm = '';
  readonly searchTermSignal = signal<string>('');
  sortBy = 'name asc';

  readonly sortOptions: CustomSelectOption[] = [
    { value: 'name asc', label: '::SortAreaNameAsc', icon: 'fa-sort-alpha-down' },
    { value: 'name desc', label: '::SortAreaNameDesc', icon: 'fa-sort-alpha-down-alt' },
  ];

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 6, label: '6 ::AreasPerPage' },
    { value: 9, label: '9 ::AreasPerPage' },
    { value: 12, label: '12 ::AreasPerPage' },
    { value: 18, label: '18 ::AreasPerPage' },
  ];

  isModalOpen = false;
  isSaving = false;
  form!: FormGroup;
  selectedItem = {} as DiningAreaDto;

  private listSubscription?: Subscription;

  // Computed signals cho thống kê nhanh
  readonly totalAreasCount = computed(() => this.allAreas().length);
  readonly totalTablesCount = computed(() =>
    this.allAreas().reduce((acc, curr) => acc + (curr.tableCount || 0), 0)
  );
  readonly busiestArea = computed(() => {
    const list = [...this.allAreas()];
    if (list.length === 0) return null;
    return list.sort((a, b) => (b.tableCount || 0) - (a.tableCount || 0))[0];
  });

  // Danh sách hiển thị sau khi tìm kiếm
  readonly filteredAreas = computed(() => {
    let list = this.allAreas();
    const term = this.searchTermSignal().trim().toLowerCase();
    if (term) {
      list = list.filter(
        a =>
          a.name?.toLowerCase().includes(term) ||
          a.description?.toLowerCase().includes(term)
      );
    }
    return list;
  });

  // Pagination signals cho Khu vực
  readonly areaPage = signal<number>(1);
  readonly areaPageSize = signal<number>(9);

  readonly areaTotalPages = computed(() => {
    const total = this.filteredAreas().length;
    return Math.ceil(total / this.areaPageSize()) || 1;
  });

  readonly areaFromRecord = computed(() => {
    const total = this.filteredAreas().length;
    if (total === 0) return 0;
    return (this.areaPage() - 1) * this.areaPageSize() + 1;
  });

  readonly areaToRecord = computed(() => {
    const total = this.filteredAreas().length;
    return Math.min(this.areaPage() * this.areaPageSize(), total);
  });

  readonly pagedAreas = computed(() => {
    const list = this.filteredAreas();
    const page = this.areaPage();
    const size = this.areaPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  changeAreaPageSize(newSize: number) {
    this.areaPageSize.set(Number(newSize));
    this.areaPage.set(1);
    this.cdr.markForCheck();
  }

  areaFirstPage() {
    this.areaPage.set(1);
    this.cdr.markForCheck();
  }

  areaPrevPage() {
    if (this.areaPage() > 1) {
      this.areaPage.update(p => p - 1);
      this.cdr.markForCheck();
    }
  }

  areaNextPage() {
    if (this.areaPage() < this.areaTotalPages()) {
      this.areaPage.update(p => p + 1);
      this.cdr.markForCheck();
    }
  }

  areaLastPage() {
    this.areaPage.set(this.areaTotalPages());
    this.cdr.markForCheck();
  }

  ngOnInit() {
    this.list.maxResultCount = 20;

    const streamCreator = (query: GetDiningAreasInput) =>
      this.diningAreaService.getList({
        ...query,
        sorting: this.sortBy,
        filter: this.searchTerm || undefined,
        maxResultCount: 200, // Lấy đầy đủ để hỗ trợ cả Grid và Table
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      this.data = res;
      this.allAreas.set(res.items || []);
      this.cdr.markForCheck();
      this.syncTableCounts();
    });
  }

  syncTableCounts() {
    this.tableService.getList({ maxResultCount: 200 }).subscribe(res => {
      const tables = res.items || [];
      this.allAreas.update(currentAreas =>
        currentAreas.map(a => {
          const count = tables.filter(t => {
            if (t.diningAreaId && a.id && t.diningAreaId.toLowerCase() === a.id.toLowerCase()) return true;
            if (a.name && t.diningAreaName && t.diningAreaName.trim().toLowerCase() === a.name.trim().toLowerCase()) return true;
            if (a.name && t.location && t.location.trim().toLowerCase() === a.name.trim().toLowerCase()) return true;
            return false;
          }).length;
          return { ...a, tableCount: count };
        })
      );
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.listSubscription?.unsubscribe();
  }

  onSearchChange() {
    this.searchTermSignal.set(this.searchTerm);
    this.areaPage.set(1);
    this.list.get();
  }

  onSortChange(val: string) {
    this.sortBy = val;
    this.areaPage.set(1);
    this.list.get();
  }

  buildForm() {
    this.form = this.fb.group({
      name: [this.selectedItem.name || '', [Validators.required, Validators.maxLength(128)]],
      description: [this.selectedItem.description || '', [Validators.maxLength(500)]],
      isActive: [this.selectedItem.isActive ?? true],
    });
  }

  createArea() {
    this.selectedItem = {} as DiningAreaDto;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editArea(area: DiningAreaDto) {
    this.selectedItem = { ...area };
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const input: CreateUpdateDiningAreaDto = {
      name: this.form.value.name?.trim(),
      description: this.form.value.description?.trim() || undefined,
      isActive: this.form.value.isActive ?? true,
    };

    const request = this.selectedItem.id
      ? this.diningAreaService.update(this.selectedItem.id, input)
      : this.diningAreaService.create(input);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.toaster.success(
          this.selectedItem.id
            ? this.localizationService.instant('::AreaUpdateSuccess', input.name || '')
            : this.localizationService.instant('::AreaCreateSuccess', input.name || '')
        );
        this.list.get();
        this.cdr.markForCheck();
      },
      error: err => {
        this.isSaving = false;
        this.toaster.error(err?.error?.message || err?.message || this.localizationService.instant('::AreaSaveError'));
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(area: DiningAreaDto) {
    if (area.isActive) {
      this.confirmation
        .warn(
          this.localizationService.instant('::DisableAreaConfirmMessage', area.name || ''),
          this.localizationService.instant('::DisableAreaConfirmTitle')
        )
        .subscribe((status: Confirmation.Status) => {
          if (status === Confirmation.Status.confirm && area.id) {
            this.diningAreaService.deactivate(area.id).subscribe({
              next: () => {
                this.toaster.success(this.localizationService.instant('::DisableAreaSuccess', area.name || ''));
                this.list.get();
                this.cdr.markForCheck();
              },
              error: err => {
                this.toaster.error(err?.error?.message || err?.message || this.localizationService.instant('::DisableAreaError'));
                this.cdr.markForCheck();
              },
            });
          }
        });
    } else {
      if (area.id) {
        this.diningAreaService.activate(area.id).subscribe({
          next: () => {
            this.toaster.success(this.localizationService.instant('::EnableAreaSuccess', area.name || ''));
            this.list.get();
            this.cdr.markForCheck();
          },
          error: err => {
            this.toaster.error(err?.error?.message || err?.message || this.localizationService.instant('::EnableAreaError'));
            this.cdr.markForCheck();
          },
        });
      }
    }
  }

  deleteArea(area: DiningAreaDto) {
    if ((area.tableCount || 0) > 0) {
      this.toaster.warn(
        this.localizationService.instant('::AreaHasTablesWarning', area.name || '', (area.tableCount || 0).toString())
      );
      return;
    }

    const confirmMsg = this.localizationService.instant('::DeleteAreaConfirmMessage', area.name || '');
    const confirmTitle = this.localizationService.instant('::DeleteAreaConfirmTitle');

    this.confirmation
      .warn(confirmMsg, confirmTitle)
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm && area.id) {
          this.diningAreaService.delete(area.id).subscribe({
            next: () => {
              this.toaster.success(this.localizationService.instant('::DeleteAreaSuccess', area.name || ''));
              this.list.get();
              this.cdr.markForCheck();
            },
            error: err => {
              this.toaster.error(err?.error?.message || err?.message || this.localizationService.instant('::DeleteAreaError'));
              this.cdr.markForCheck();
            },
          });
        }
      });
  }

  goToTablesInArea(area: DiningAreaDto) {
    this.router.navigate(['/tables']);
  }

  getAreaIcon(areaName: string): string {
    const lower = (areaName || '').toLowerCase();
    if (lower.includes('vip')) return 'fa-crown';
    if (lower.includes('sân vườn') || lower.includes('garden') || lower.includes('ngoài')) return 'fa-leaf';
    if (lower.includes('rooftop') || lower.includes('thượng') || lower.includes('ban công')) return 'fa-cloud-sun';
    if (lower.includes('tầng 2') || lower.includes('lầu 2')) return 'fa-layer-group';
    if (lower.includes('tầng 1') || lower.includes('trệt')) return 'fa-door-open';
    if (lower.includes('quầy') || lower.includes('bar')) return 'fa-wine-glass-alt';
    return 'fa-map-marker-alt';
  }
}
