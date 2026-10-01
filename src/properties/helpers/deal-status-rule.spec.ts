import { isDealStatusAllowedForOperation } from './deal-status-rule';
import { DealStatus, Operation } from '../enums/property.enums';

describe('isDealStatusAllowedForOperation', () => {
  it.each([
    [Operation.SALE, DealStatus.AVAILABLE, true],
    [Operation.SALE, DealStatus.RESERVED, true],
    [Operation.SALE, DealStatus.SOLD, true],
    [Operation.SALE, DealStatus.RENTED, false],
    [Operation.RENT, DealStatus.AVAILABLE, true],
    [Operation.RENT, DealStatus.RESERVED, true],
    [Operation.RENT, DealStatus.RENTED, true],
    [Operation.RENT, DealStatus.SOLD, false],
  ])('%s + %s -> %s', (operation, dealStatus, expected) => {
    expect(isDealStatusAllowedForOperation(operation, dealStatus)).toBe(
      expected,
    );
  });
});
