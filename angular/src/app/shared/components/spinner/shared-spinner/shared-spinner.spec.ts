import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedSpinner } from './shared-spinner';

describe('SharedSpinner', () => {
  let component: SharedSpinner;
  let fixture: ComponentFixture<SharedSpinner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedSpinner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedSpinner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
