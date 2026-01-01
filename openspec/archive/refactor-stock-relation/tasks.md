## 1. Database Migration
- [ ] 1.1 Create `stock_id` column in `options` table (nullable initially).
- [ ] 1.2 Backfill `stocks` table from unique `options.stock_symbol` values.
- [ ] 1.3 Backfill `options.stock_id` based on `stock_symbol`.
- [ ] 1.4 Make `stock_id` NOT NULL and add Foreign Key constraint.
- [ ] 1.5 Update unique constraint on `options` to use `stock_id`.
- [ ] 1.6 Drop `stock_symbol` column from `options`.

## 2. Code Updates
- [ ] 2.1 Update `db/schema.ts` definition.
- [ ] 2.2 Update `db/repositories/options.ts` to join `stocks` table.
- [ ] 2.3 Update `db/repositories/option-trades.ts` (if needed).
- [ ] 2.4 Update `CreateOption` logic to find/create stock.

## 3. Verification
- [ ] 3.1 Verify database schema changes.
- [ ] 3.2 Verify existing data integrity.
- [ ] 3.3 Verify new option creation works.
