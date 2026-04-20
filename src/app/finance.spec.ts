import { TestBed } from '@angular/core/testing';

import { FinanceService } from './finance.service';

describe('Finance', () => {
  let service: FinanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
