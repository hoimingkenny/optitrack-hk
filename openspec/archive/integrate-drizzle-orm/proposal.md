# Change: Integrate Drizzle ORM for Type-Safe Database Operations

## Why

The current implementation uses the Supabase JavaScript client directly for all database operations in `utils/supabase.ts`. While functional, this approach has limitations:

- **No type safety at query level**: Queries return `any` and require manual casting to `Trade` type
- **No schema validation**: TypeScript types and database schema can drift apart
- **Verbose query building**: Each CRUD operation requires manual query construction
- **Limited query composition**: Complex queries are harder to build and maintain
- **No migration tooling**: Schema changes require manual SQL scripts

Drizzle ORM provides:
- **Full type inference**: Queries are fully typed based on schema definitions
- **Schema as code**: Single source of truth for both TypeScript types and database schema
- **SQL-like syntax**: Familiar query building without abstracting away SQL
- **Lightweight**: No runtime overhead, generates optimal SQL
- **Built-in migrations**: Schema changes are tracked and versioned
- **Supabase compatibility**: Works seamlessly with Supabase PostgreSQL

## What Changes

### **Database Layer Architecture**
- Add Drizzle ORM alongside existing Supabase client
- Supabase client remains for **authentication only**
- Drizzle handles **all database queries**

### New Files & Structure
```
db/
├── index.ts              # Drizzle client initialization
├── schema.ts             # Table definitions (source of truth)
├── migrations/           # Auto-generated migration files
└── migrate.ts            # Migration runner script
```

### Schema Definition
Define `options_trades` table in TypeScript:

```typescript
// db/schema.ts
import { pgTable, uuid, text, numeric, integer, timestamp, date } from 'drizzle-orm/pg-core';

export const optionsTrades = pgTable('options_trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  stockSymbol: text('stock_symbol').notNull(),
  direction: text('direction').notNull(), // 'Sell Put' | 'Sell Call' | 'Buy Put' | 'Buy Call'
  strikePrice: numeric('strike_price').notNull(),
  expiryDate: date('expiry_date').notNull(),
  premium: numeric('premium').notNull(),
  contracts: integer('contracts').notNull(),
  sharesPerContract: integer('shares_per_contract').notNull().default(500),
  fee: numeric('fee').notNull().default('0'),
  totalPremium: numeric('total_premium').generatedAlwaysAs(/* computed */),
  stockPrice: numeric('stock_price').notNull(),
  hsi: numeric('hsi').notNull(),
  tradeDate: timestamp('trade_date', { withTimezone: true }).notNull().defaultNow(),
  closePremium: numeric('close_premium'),
  closeFee: numeric('close_fee').default('0'),
  closeStockPrice: numeric('close_stock_price'),
  closeHsi: numeric('close_hsi'),
  status: text('status').notNull().default('Open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Refactored Data Access Layer
Replace manual Supabase queries with Drizzle:

**Before (current):**
```typescript
export async function getTrades(userId: string) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('trade_date', { ascending: false });

  if (error) throw error;
  return data as Trade[];
}
```

**After (with Drizzle):**
```typescript
export async function getTrades(userId: string) {
  return db
    .select()
    .from(optionsTrades)
    .where(eq(optionsTrades.userId, userId))
    .orderBy(desc(optionsTrades.tradeDate));
  // Returns fully typed Trade[] automatically
}
```

### Migration Strategy
1. **Phase 1**: Add Drizzle alongside Supabase (no breaking changes)
2. **Phase 2**: Migrate queries one by one with feature flags
3. **Phase 3**: Remove Supabase query code, keep auth only

## Impact

### Affected Specs
- None directly - this is an infrastructure change

### Affected Code
| File | Change Type |
|------|-------------|
| `utils/supabase.ts` | Refactor - Auth only |
| `db/index.ts` | **New** - Drizzle client |
| `db/schema.ts` | **New** - Schema definitions |
| `db/migrations/` | **New** - Migration files |
| `utils/types/trades.ts` | Remove - Types inferred from schema |
| `package.json` | Add dependencies |
| `.env.local` | Add `DATABASE_URL` |

### New Dependencies
```json
{
  "drizzle-orm": "^0.38.x",
  "postgres": "^3.4.x"
}
```

### Dev Dependencies
```json
{
  "drizzle-kit": "^0.30.x"
}
```

### New npm Scripts
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

### Environment Variables
```env
# Add direct PostgreSQL connection for Drizzle
DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Incremental migration with feature flags |
| Learning curve for team | Drizzle has SQL-like syntax, minimal learning |
| Connection pooling issues | Use Supabase connection pooler (port 6543) |
| Migration conflicts | Use `drizzle-kit push` for dev, migrations for prod |
| Type mismatches during migration | Run both systems in parallel, compare outputs |

## Success Criteria

1. ✅ All existing CRUD operations work identically
2. ✅ Full type inference on all database queries
3. ✅ Schema changes tracked via migrations
4. ✅ No manual type casting required
5. ✅ Supabase auth continues to work
6. ✅ No performance regression
7. ✅ Drizzle Studio accessible for development

## Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Setup | 1 day | Install deps, configure Drizzle, create schema |
| Migration | 2-3 days | Refactor all queries to use Drizzle |
| Testing | 1 day | Verify all operations, compare outputs |
| Cleanup | 0.5 day | Remove old Supabase query code |

**Total: ~5 days**

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle with Supabase Guide](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)
- [Drizzle Kit (migrations)](https://orm.drizzle.team/kit-docs/overview)

---

**Created**: December 28, 2025  
**Status**: Proposed  
**Author**: Auto-generated
