/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleChange } from '@angular/core';
import { PagerComponent } from './pager.component';

describe('PagerComponent', () => {
  let component: PagerComponent;

  beforeEach(() => {
    component = new PagerComponent();
  });

  it('should initialize with default options [5, 10, 20, 50] when pageSize is 10', () => {
    component.pageSize = 10;
    component.totalCount = 100;
    component.ngOnChanges({});

    expect(component.pageSizeSelectOptions.length).toBe(4);
    expect(component.pageSizeSelectOptions.map(o => o.value)).toEqual([5, 10, 20, 50]);
    expect(component.totalPages).toBe(10);
    expect(component.fromRecord).toBe(1);
    expect(component.toRecord).toBe(10);
  });

  it('should include custom pageSize in options if not present (e.g. pageSize = 8)', () => {
    component.pageSize = 8;
    component.totalCount = 10;
    component.ngOnChanges({
      pageSize: new SimpleChange(undefined, 8, true),
    });

    const values = component.pageSizeSelectOptions.map(o => o.value);
    expect(values).toContain(8);
    expect(values).toEqual([5, 8, 10, 20, 50]);
    expect(component.fromRecord).toBe(1);
    expect(component.toRecord).toBe(8);
    expect(component.totalPages).toBe(2);
  });

  it('should respect custom pageSizeOptions when provided', () => {
    component.pageSize = 8;
    component.pageSizeOptions = [4, 8, 12, 16];
    component.totalCount = 10;
    component.ngOnChanges({
      pageSizeOptions: new SimpleChange(undefined, [4, 8, 12, 16], true),
      pageSize: new SimpleChange(undefined, 8, true),
    });

    const values = component.pageSizeSelectOptions.map(o => o.value);
    expect(values).toEqual([4, 8, 12, 16]);
  });

  it('should emit pageChange and update page when goToPage is called', () => {
    component.pageSize = 10;
    component.totalCount = 50;
    component.page = 1;

    const pageChangeSpy = vi.spyOn(component.pageChange, 'emit');
    component.goToPage(3);

    expect(component.page).toBe(3);
    expect(pageChangeSpy).toHaveBeenCalledWith(3);
    expect(component.fromRecord).toBe(21);
    expect(component.toRecord).toBe(30);
  });

  it('should emit pageSizeChange when onPageSizeSelected is called', () => {
    component.pageSize = 10;
    component.page = 2;

    const sizeSpy = vi.spyOn(component.pageSizeChange, 'emit');
    const pageSpy = vi.spyOn(component.pageChange, 'emit');

    component.onPageSizeSelected(20);

    expect(component.pageSize).toBe(20);
    expect(component.page).toBe(1);
    expect(sizeSpy).toHaveBeenCalledWith(20);
    expect(pageSpy).toHaveBeenCalledWith(1);
  });
});
