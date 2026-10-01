import { DealStatus, Operation } from '../enums/property.enums';

/**
 * `sold` only makes sense for sale properties and `rented` only for rent
 * ones; `available` and `reserved` are valid for both operations.
 */
export function isDealStatusAllowedForOperation(
  operation: Operation,
  dealStatus: DealStatus,
): boolean {
  if (dealStatus === DealStatus.SOLD) return operation === Operation.SALE;
  if (dealStatus === DealStatus.RENTED) return operation === Operation.RENT;
  return true;
}
