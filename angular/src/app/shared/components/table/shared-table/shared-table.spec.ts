import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedTableComponent } from './shared-table';

describe('SharedTableComponent', () => {
  let component: SharedTableComponent;
  let fixture: ComponentFixture<SharedTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
