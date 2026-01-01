# Drizzle ORM Integration - Implementation Tasks

## Phase 1: Setup & Configuration ✅

### Task 1.1: Install Dependencies
- [x] Install `drizzle-orm` and `postgres` packages
- [x] Install `drizzle-kit` as dev dependency
- [x] Verify package versions are compatible

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### Task 1.2: Create Drizzle Configuration
- [x] Create `drizzle.config.ts` in project root
- [x] Configure schema path, output directory, and database connection

### Task 1.3: Set Up Environment Variables
- [x] Add `DATABASE_URL` to `.env.local`
- [x] Get connection string from Supabase dashboard (Settings → Database → Connection string)
- [x] Use connection pooler URL (port 6543) for serverless compatibility

### Task 1.4: Create Database Directory Structure
- [x] Create `db/` directory
- [x] Create `db/index.ts` - Drizzle client initialization
- [x] Create `db/schema.ts` - Table definitions

---

## Phase 2: Schema Definition ✅

### Task 2.1: Define `options_trades` Table Schema
- [x] Create table schema matching existing database structure
- [x] Define all columns with correct types (snake_case matching database)
- [x] Add constraints (notNull, defaults, checks)
- [x] Handle computed column `total_premium`

### Task 2.2: Export Type Definitions
- [x] Export `Trade` type inferred from schema
- [x] Export `NewTrade` type for inserts
- [x] Export `TradeDirection` and `TradeStatus` enums
- [x] Export all helper types (TradeFilters, PNLResult, TradeSummary, StockSummary)

### Task 2.3: Introspect Existing Database (Optional)
- [ ] Run `drizzle-kit introspect` to generate schema from existing DB
- [ ] Compare with manually created schema
- [ ] Resolve any discrepancies

---

## Phase 3: Refactor Data Access Layer ✅

### Task 3.1: Create Trade Repository
- [x] Create `db/repositories/trades.ts`
- [x] Implement `getTrades(userId)` with Drizzle
- [x] Implement `getTradeById(id, userId)` with Drizzle
- [x] Implement `createTrade(userId, input)` with Drizzle
- [x] Implement `closeTrade(id, userId, closeData)` with Drizzle
- [x] Implement `updateTrade(id, userId, updates)` with Drizzle
- [x] Implement `deleteTrade(id, userId)` with Drizzle

### Task 3.2: Implement Query Functions
- [x] Implement `searchTradesBySymbol(userId, symbol)`
- [x] Implement `filterTradesByStatus(userId, status)`
- [x] Implement `getUniqueStockSymbols(userId)`
- [x] Implement `getTradesByStock(userId, symbol)`
- [x] Implement `getOpenTrades(userId)`
- [x] Implement `batchUpdateTradeStatuses(userId, updates)`

### Task 3.3: Refactor `utils/supabase.ts`
- [x] Remove all trade CRUD functions
- [x] Keep authentication functions only (`signUp`, `signIn`, `signOut`, `getCurrentUser`)

---

## Phase 4: Update Consuming Code ✅

### Task 4.1: Update Page Components
- [x] Update `app/page.tsx` to import from Drizzle repository
- [x] Update `app/trades/page.tsx` to import from Drizzle repository
- [x] Replace Supabase calls with Drizzle repository calls

### Task 4.2: Update Component Type Imports
- [x] Update `components/trades/TradeCard.tsx` to use types from `db/schema`
- [x] Update `components/trades/PNLSummary.tsx` to use types from `db/schema`
- [x] Update `components/trades/TradeFilters.tsx` to use types from `db/schema`
- [x] Update `components/trades/TradeForm.tsx` to use types from `db/schema`
- [x] Update `components/trades/CloseTradeModal.tsx` to use types from `db/schema`

### Task 4.3: Update Helper Functions
- [x] Update `utils/helpers/pnl-calculator.ts` to import from `db/schema`
- [x] Update `utils/helpers/status-calculator.ts` to import from `db/schema`
- [x] Add string numeric parsing for PostgreSQL numeric fields
- [x] Update `formatHKD` to handle string | number types

---

## Phase 5: Testing & Validation 🔄

### Task 5.1: Functional Testing
- [ ] Test create trade flow
- [ ] Test read trades (list and single)
- [ ] Test update trade
- [ ] Test close trade
- [ ] Test delete trade
- [ ] Test filter/search operations

### Task 5.2: Type Safety Validation
- [x] Verify no `any` types in query results
- [x] Verify TypeScript errors on incorrect field access
- [x] Verify insert validation catches missing required fields

### Task 5.3: Performance Testing
- [ ] Compare query execution times
- [ ] Check connection pooling behavior
- [ ] Monitor for connection leaks

---

## Phase 6: Cleanup & Documentation

### Task 6.1: Remove Deprecated Code
- [ ] Remove `utils/types/trades.ts` (types now in schema) - ⚠️ Keep for now as reference
- [x] Removed trade functions from `utils/supabase.ts`
- [x] Updated imports across codebase

### Task 6.2: Update Documentation
- [ ] Update `DATABASE_SETUP.md` with Drizzle instructions
- [ ] Add Drizzle usage examples to README
- [x] Document new npm scripts in package.json

### Task 6.3: Set Up Drizzle Studio
- [x] Configure Drizzle Studio access (`npm run db:studio`)
- [ ] Test Drizzle Studio connection

---

## Checklist Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Setup | 4 tasks | ✅ Complete |
| 2. Schema | 3 tasks | ✅ Complete |
| 3. Data Access | 3 tasks | ✅ Complete |
| 4. Update Code | 3 tasks | ✅ Complete |
| 5. Testing | 3 tasks | 🔄 Ready for Testing |
| 6. Cleanup | 3 tasks | 🟡 Partial (1/3 complete) |

---

## Next Steps

1. **Test the application**: Run `npm run dev` and test all CRUD operations
2. **Verify database connection**: Use `npm run db:studio` to explore the database
3. **Test functionality**:
   - Create a new trade
   - View all trades
   - Close a trade position
   - Delete a trade
   - Filter trades by status/symbol
4. **Monitor for issues**: Check browser console and terminal for any errors

---

**Last Updated**: December 29, 2025  
**Status**: Implementation Complete - Ready for Testing
