import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserModal } from './user-modal';

describe('UserModal', () => {
  let component: UserModal;
  let fixture: ComponentFixture<UserModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
