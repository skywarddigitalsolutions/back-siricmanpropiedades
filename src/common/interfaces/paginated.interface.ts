/**
 * Generic paginated response envelope shared by admin and public listing
 * endpoints: the page of `items` plus the `total` count matching the filters
 * (before pagination).
 */
export interface Paginated<T> {
  items: T[];
  total: number;
}
