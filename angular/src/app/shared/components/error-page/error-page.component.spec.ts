import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorPageComponent } from './error-page.component';
import { UserRoleNavigationService } from '../../services/user-role-navigation.service';

describe('ErrorPageComponent', () => {
  let component: ErrorPageComponent;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockLocation: { back: ReturnType<typeof vi.fn> };
  let mockRoleNavService: {
    getDefaultHomeRoute: ReturnType<typeof vi.fn>;
    getDefaultHomeLabelKey: ReturnType<typeof vi.fn>;
  };
  let mockActivatedRoute: {
    snapshot: {
      data: Record<string, any>;
      queryParams: Record<string, any>;
    };
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockRouter = { navigate: vi.fn() };
    mockLocation = { back: vi.fn() };
    mockRoleNavService = {
      getDefaultHomeRoute: vi.fn().mockReturnValue('/waiter/tables'),
      getDefaultHomeLabelKey: vi.fn().mockReturnValue('ErrorPages.BackToTableList'),
    };
    mockActivatedRoute = {
      snapshot: {
        data: {},
        queryParams: {},
      },
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: Location, useValue: mockLocation },
        { provide: UserRoleNavigationService, useValue: mockRoleNavService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    component = runInInjectionContext(injector, () => new ErrorPageComponent());
  });

  afterEach(() => {
    if (component) {
      component.ngOnDestroy();
    }
    vi.useRealTimers();
  });

  it('should initialize with default 404 configuration', () => {
    component.ngOnInit();

    expect(component.activeConfig().statusCode).toBe(404);
    expect(component.activeConfig().badgeText).toBe('HTTP 404 NOT FOUND');
    expect(component.countdown()).toBe(5);
    expect(component.isPaused()).toBe(false);
  });

  it('should initialize with 403 status from route data', () => {
    mockActivatedRoute.snapshot.data = { status: 403 };
    component.ngOnInit();

    expect(component.activeConfig().statusCode).toBe(403);
    expect(component.activeConfig().badgeText).toBe('HTTP 403 FORBIDDEN');
    expect(component.activeConfig().iconType).toBe('security-lock');
  });

  it('should initialize with 500 status and create a Trace ID', () => {
    mockActivatedRoute.snapshot.data = { status: 500 };
    component.ngOnInit();

    expect(component.activeConfig().statusCode).toBe(500);
    expect(component.activeConfig().showTraceId).toBe(true);
    expect(component.traceId()).toMatch(/^ERR-\d+/);
  });

  it('should count down and trigger goHome when reaching 0', () => {
    component.ngOnInit();
    expect(component.countdown()).toBe(5);

    vi.advanceTimersByTime(2000);
    expect(component.countdown()).toBe(3);

    vi.advanceTimersByTime(3000);
    expect(component.countdown()).toBe(0);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/waiter/tables']);
  });

  it('should pause countdown when mouse enters and resume when mouse leaves', () => {
    component.ngOnInit();
    expect(component.countdown()).toBe(5);

    // Hover card
    component.onMouseEnter();
    expect(component.isPaused()).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(component.countdown()).toBe(5); // Did not decrease

    // Leave card
    component.onMouseLeave();
    expect(component.isPaused()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(component.countdown()).toBe(4);
  });

  it('should allow manual pause toggle and not resume on mouseleave if manually paused', () => {
    component.ngOnInit();

    // User clicks Pause
    component.togglePause();
    expect(component.manuallyPaused()).toBe(true);
    expect(component.isPaused()).toBe(true);

    // Mouse leaves card
    component.onMouseLeave();
    expect(component.isPaused()).toBe(true); // Still paused!

    // Advance time
    vi.advanceTimersByTime(2000);
    expect(component.countdown()).toBe(5);

    // User clicks Resume
    component.togglePause();
    expect(component.manuallyPaused()).toBe(false);
    expect(component.isPaused()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(component.countdown()).toBe(4);
  });

  it('should navigate to home on goHome() and clean up timer', () => {
    component.ngOnInit();
    component.goHome();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/waiter/tables']);
  });

  it('should call location.back() on goBack() when history has entries', () => {
    (globalThis as any).window = {
      history: { length: 2 },
      location: { reload: vi.fn() },
    };
    component.ngOnInit();
    component.goBack();

    expect(mockLocation.back).toHaveBeenCalled();
  });

  it('should fallback to goHome() on goBack() when history is empty', () => {
    (globalThis as any).window = {
      history: { length: 1 },
      location: { reload: vi.fn() },
    };
    component.ngOnInit();
    component.goBack();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/waiter/tables']);
  });

  it('should return correct role-based homeButtonLabelKey', () => {
    component.ngOnInit();
    expect(component.homeButtonLabelKey).toBe('ErrorPages.BackToTableList');
  });

  it('should copy traceId and set copied signal temporarily', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    mockActivatedRoute.snapshot.data = { status: 500 };
    component.ngOnInit();

    component.copyTraceId();
    expect(mockClipboard.writeText).toHaveBeenCalledWith(component.traceId());

    await Promise.resolve();
    expect(component.copied()).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(component.copied()).toBe(false);
  });
});
