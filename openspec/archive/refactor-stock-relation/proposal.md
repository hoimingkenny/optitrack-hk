# Change: Refactor Stock Relation

## Why
Currently, the `options` table stores `stock_symbol` directly as a string. This leads to data duplication and potential inconsistencies. We already have a `stocks` table, but it's not being strictly linked.

## What Changes
- Modify `options` table:
  - Add `stock_id` (UUID) referencing `stocks.id`.
  - Remove `stock_symbol` column.
  - Update unique constraint to use `stock_id` instead of `stock_symbol`.
- Update application logic:
  - When creating an option, lookup or create the stock in `stocks` table first.
  - When querying options, join with `stocks` table to retrieve the symbol.

## Impact
- **Database**: Breaking schema change for `options` table. Requires data migration.
- **Backend**: Repositories and API handlers need updates.
- **Frontend**: Minimal impact if API contract remains similar (input `stock_symbol` resolved on backend), but internal types might change.
