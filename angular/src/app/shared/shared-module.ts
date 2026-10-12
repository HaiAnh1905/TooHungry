import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedTableComponent } from './components/table/shared-table/shared-table';
import { SharedModalComponent } from './components/modal/shared-modal/shared-modal';
import { SharedSpinnerComponent } from './components/spinner/shared-spinner/shared-spinner';
import { NzModalModule } from 'ng-zorro-antd/modal';

@NgModule({
  imports: [
    CommonModule,
    SharedTableComponent,
    SharedModalComponent,
    SharedSpinnerComponent,
    NzModalModule
  ],
  exports: [
    SharedTableComponent,
    SharedModalComponent,
    SharedSpinnerComponent,
    NzModalModule
  ]
})
export class SharedModule { }
