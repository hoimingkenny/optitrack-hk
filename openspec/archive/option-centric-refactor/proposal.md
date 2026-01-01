# Change Proposal: Option-Centric Trade Management Refactor

**Status**: Draft  
**Created**: 2024-12-29  
**Author**: System  
**Type**: Major Refactor

## Executive Summary

Restructure the application from individual trade tracking to **option position tracking**, where each option contract (defined by symbol, direction, strike, expiry) can have multiple associated trades (open, add, reduce, close). This change enables better position management, accurate cost basis tracking, and a more intuitive user experience.

---

## Problem Statement

### Current Architecture Issues

1. **No Position Grouping**: Each trade is treated independently, even if they're for the same option contract
2. **Limited Trade Actions**: Only supports single open/close trades per option
3. **No Averaging**: Cannot track multiple entries/exits at different prices
4. **Poor Navigation**: No way to see the complete history of a position
5. **Inaccurate PNL**: Cannot calculate blended cost basis for partial closes

### User Pain Points

- Cannot see all trades related to the same option in one place
- Cannot add to an existing position (averaging down/up)
- Cannot partially close a position
- Difficult to understand overall exposure per option
- No clear position management workflow

---

## Proposed Solution

### High-Level Architecture

```
BEFORE:
options_trades table → Individual trade records

AFTER:
options table (parent) → Unique option contracts
    ↓ (1:many)
trades table (child) → Individual trade events per option
```

### Key Concepts

1. **Option**: A unique contract defined by (symbol, direction, strike, expiry)
2. **Trade**: An event that affects an option position (OPEN, ADD, REDUCE, CLOSE)
3. **Position**: The net contracts for an option (sum of all trades)
4. **Blended Cost Basis**: Average entry price across multiple trades

---

## Database Schema Changes

### New Table: `options`

**Purpose**: Store unique option contracts

```sql
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Option Contract Details
  stock_symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Sell Put', 'Sell Call', 'Buy Put', 'Buy Call')),
  strike_price NUMERIC NOT NULL,
  expiry_date DATE NOT NULL,
  
  -- Position Status
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Expired', 'Exercised', 'Lapsed')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique option per user
  CONSTRAINT unique_option_per_user UNIQUE (user_id, stock_symbol, direction, strike_price, expiry_date)
);

CREATE INDEX idx_options_user_id ON options(user_id);
CREATE INDEX idx_options_status ON options(status);
CREATE INDEX idx_options_expiry ON options(expiry_date);
```

### New Table: `trades`

**Purpose**: Store individual trade events for each option

```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Trade Details
  trade_type TEXT NOT NULL CHECK (trade_type IN ('OPEN', 'ADD', 'REDUCE', 'CLOSE')),
  trade_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Position Details
  contracts INTEGER NOT NULL CHECK (contracts > 0),
  premium NUMERIC NOT NULL CHECK (premium >= 0),
  shares_per_contract INTEGER NOT NULL DEFAULT 500,
  fee NUMERIC NOT NULL DEFAULT 0,
  
  -- Market Context
  stock_price NUMERIC NOT NULL,
  hsi NUMERIC NOT NULL,
  
  -- Optional
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_option_id ON trades(option_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_trade_date ON trades(trade_date);
CREATE INDEX idx_trades_trade_type ON trades(trade_type);
```

### Migration Strategy

**Phase 1**: Create new tables alongside existing `options_trades`

**Phase 2**: Data migration script
```sql
-- 1. Create options from unique combinations
INSERT INTO options (user_id, stock_symbol, direction, strike_price, expiry_date, status, created_at)
SELECT DISTINCT 
  user_id,
  stock_symbol,
  direction,
  strike_price,
  expiry_date,
  status,
  MIN(created_at) as created_at
FROM options_trades
GROUP BY user_id, stock_symbol, direction, strike_price, expiry_date, status;

-- 2. Create trades from existing records
INSERT INTO trades (option_id, user_id, trade_type, trade_date, contracts, premium, shares_per_contract, fee, stock_price, hsi, created_at)
SELECT 
  o.id as option_id,
  ot.user_id,
  CASE 
    WHEN ot.status = 'Closed' AND ot.close_premium IS NOT NULL THEN 'CLOSE'
    ELSE 'OPEN'
  END as trade_type,
  ot.trade_date,
  ot.contracts,
  ot.premium,
  ot.shares_per_contract,
  ot.fee,
  ot.stock_price,
  ot.hsi,
  ot.created_at
FROM options_trades ot
JOIN options o ON (
  o.user_id = ot.user_id AND
  o.stock_symbol = ot.stock_symbol AND
  o.direction = ot.direction AND
  o.strike_price = ot.strike_price AND
  o.expiry_date = ot.expiry_date
);
```

**Phase 3**: Rename old table for backup
```sql
ALTER TABLE options_trades RENAME TO options_trades_backup;
```

---

## API Changes

### New Routes

#### `/api/options` - List & Create Options

**GET** - List all options for user
```typescript
Response: {
  options: Array<{
    id: string;
    stock_symbol: string;
    direction: string;
    strike_price: number;
    expiry_date: string;
    status: string;
    total_contracts: number;  // Calculated
    net_contracts: number;    // Calculated
    total_pnl: number;        // Calculated
    trades_count: number;     // Calculated
  }>
}
```

**POST** - Create new option with initial trade
```typescript
Request: {
  option: {
    stock_symbol: string;
    direction: string;
    strike_price: number;
    expiry_date: string;
  },
  trade: {
    contracts: number;
    premium: number;
    fee?: number;
    stock_price: number;
    hsi: number;
    trade_date?: string;
    notes?: string;
  }
}

Response: {
  option: Option;
  trade: Trade;
}
```

#### `/api/options/[id]` - Get, Update, Delete Option

**GET** - Get option with all trades
```typescript
Response: {
  option: Option;
  trades: Trade[];
  summary: {
    net_contracts: number;
    total_opened: number;
    total_closed: number;
    avg_entry_premium: number;
    total_fees: number;
    gross_pnl: number;
    net_pnl: number;
    realized_pnl: number;
    unrealized_pnl: number;
  }
}
```

**PATCH** - Update option status
```typescript
Request: {
  status: 'Closed' | 'Expired' | 'Exercised' | 'Lapsed';
}
```

**DELETE** - Delete option (cascade deletes trades)

#### `/api/options/[id]/trades` - Add Trade to Option

**POST** - Add a new trade
```typescript
Request: {
  trade_type: 'OPEN' | 'ADD' | 'REDUCE' | 'CLOSE';
  contracts: number;
  premium: number;
  fee?: number;
  stock_price: number;
  hsi: number;
  trade_date?: string;
  notes?: string;
}

Response: {
  trade: Trade;
  option: Option;  // Updated with new status if needed
}
```

#### `/api/options/[id]/trades/[tradeId]` - Update/Delete Trade

**PATCH** - Update a trade
**DELETE** - Delete a trade

### Deprecated Routes

- `/api/trades` → Use `/api/options` instead
- `/api/trades/[id]` → Use `/api/options/[id]/trades/[tradeId]` instead

---

## Frontend Changes

### Page Structure

#### `/trades` (List View) - MODIFIED

**Current**: Shows individual trades
**New**: Shows unique options with aggregated data

**Components**:
- `OptionsTable.tsx` (replaces `TradesTable.tsx`)
  - Columns: Symbol, Direction, Strike, Expiry, Contracts, Total PNL, Status
  - Each row clickable → navigates to `/option/[id]`
  - Filters: Symbol, Status, Direction, Date Range
  - Sorting: By PNL, Expiry, Symbol

**Data Flow**:
```typescript
// Fetch aggregated options
const response = await fetch('/api/options');
const { options } = await response.json();
```

#### `/option/[id]` (Detail View) - NEW PAGE

**Layout**:

1. **Header Section** (`OptionHeader.tsx`)
   - Option contract details
   - Status badge
   - Position summary metrics
   - Action buttons: Add to Position, Reduce Position, Close Position

2. **Trades History** (`OptionTradesTable.tsx`)
   - Chronological list of all trades
   - Columns: Date, Type, Contracts, Premium, Fee, Stock Price, HSI, Notes
   - Running totals: Cumulative contracts, Average premium

3. **PNL Breakdown** (`OptionPNLSummary.tsx`)
   - Realized vs Unrealized PNL
   - Total fees paid
   - Return percentage
   - Days held

**Modals**:
- `AddTradeModal.tsx` - Add/Reduce/Close position

**Data Flow**:
```typescript
// Fetch option details with all trades
const response = await fetch(`/api/options/${id}`);
const { option, trades, summary } = await response.json();
```

### Component Structure

```
/app/
  option/
    [id]/
      page.tsx              # Option detail page
      
/components/
  options/
    OptionsTable.tsx        # For /trades page (list view)
    OptionHeader.tsx        # Header for detail page
    OptionTradesTable.tsx   # Trades history table
    OptionPNLSummary.tsx    # PNL breakdown component
    AddTradeModal.tsx       # Modal for adding trades
    CreateOptionForm.tsx    # Form to create new option (replaces TradeForm)
    
  trades/                   # Keep for backward compatibility during migration
    TradeCard.tsx           # Archive
    TradeForm.tsx           # Archive
    CloseTradeModal.tsx     # Archive
```

### Repository Layer

```
/db/repositories/
  options.ts                # CRUD for options table
    - createOption(userId, optionData, initialTrade)
    - getOptions(userId, filters?)
    - getOptionById(optionId)
    - updateOptionStatus(optionId, status)
    - deleteOption(optionId)
    
  option-trades.ts          # CRUD for trades table
    - createTrade(optionId, tradeData)
    - getTradesByOption(optionId)
    - updateTrade(tradeId, updates)
    - deleteTrade(tradeId)
    
  trades.ts                 # Archive/deprecate
```

### Utility Functions

```
/utils/helpers/
  option-calculator.ts      # NEW - Calculate aggregated metrics
    - calculateNetContracts(trades)
    - calculateAverageEntryPremium(trades)
    - calculateRealizedPNL(trades)
    - calculateUnrealizedPNL(option, trades)
    - calculateOptionPNL(option, trades)
    
  pnl-calculator.ts         # KEEP - Individual trade PNL
    - calculateTradePNL(trade)
    - formatPNL(pnl)
    - formatHKD(amount)
```

---

## Business Logic

### Trade Type Definitions

#### OPEN
- First trade for an option
- Establishes initial position
- Always positive contracts

#### ADD
- Add to existing position (averaging up/down)
- Same direction as original position
- Increases net contracts

#### REDUCE
- Partial close of position
- Reduces net contracts
- Must not exceed current open contracts

#### CLOSE
- Close entire remaining position
- Sets option status to 'Closed'
- Net contracts becomes zero

### Position Calculations

#### Net Contracts
```typescript
function calculateNetContracts(trades: Trade[]): number {
  return trades.reduce((total, trade) => {
    if (trade.trade_type === 'OPEN' || trade.trade_type === 'ADD') {
      return total + trade.contracts;
    } else if (trade.trade_type === 'REDUCE' || trade.trade_type === 'CLOSE') {
      return total - trade.contracts;
    }
    return total;
  }, 0);
}
```

#### Average Entry Premium
```typescript
function calculateAverageEntryPremium(trades: Trade[]): number {
  const openTrades = trades.filter(t => 
    t.trade_type === 'OPEN' || t.trade_type === 'ADD'
  );
  
  const totalPremiumPaid = openTrades.reduce((sum, trade) => 
    sum + (trade.premium * trade.contracts), 0
  );
  
  const totalContracts = openTrades.reduce((sum, trade) => 
    sum + trade.contracts, 0
  );
  
  return totalContracts > 0 ? totalPremiumPaid / totalContracts : 0;
}
```

#### PNL Calculation
```typescript
interface OptionPNL {
  totalOpened: number;       // Sum of OPEN + ADD contracts
  totalClosed: number;       // Sum of REDUCE + CLOSE contracts
  netContracts: number;      // Opened - Closed
  
  avgEntryPremium: number;   // Weighted average entry price
  avgExitPremium: number;    // Weighted average exit price
  
  totalFees: number;         // Sum of all fees
  
  realizedPNL: number;       // PNL from closed contracts
  unrealizedPNL: number;     // PNL from open contracts (if applicable)
  grossPNL: number;          // Realized + Unrealized
  netPNL: number;            // Gross - Fees
  
  returnPercentage: number;  // Net PNL / Total premium paid
}
```

### Status Management

**Option Status Transitions**:
```
Open → Closed (when fully closed via trades)
Open → Expired (when expiry_date < today and not closed)
Open → Lapsed (when expired worthless)
Open → Exercised (when assigned/exercised)

Closed → [Terminal] (no further changes)
Expired → Lapsed/Exercised (manual update)
```

**Auto-status Update**:
- When final CLOSE trade is added → status = 'Closed'
- Daily cron job checks expiry_date → status = 'Expired' if past

---

## Implementation Plan

### Phase 1: Database & Backend (Week 1)

**Tasks**:
1. ✅ Create `options` table schema
2. ✅ Create `trades` table schema
3. ✅ Write migration script for existing data
4. ✅ Create repositories: `options.ts`, `option-trades.ts`
5. ✅ Implement API routes: `/api/options`, `/api/options/[id]`, `/api/options/[id]/trades`
6. ✅ Create `option-calculator.ts` utility
7. ✅ Write unit tests for repositories and calculators
8. ✅ Run migration on development database

**Deliverables**:
- New database tables with migrated data
- Functional API endpoints
- Passing backend tests

### Phase 2: Frontend Components (Week 2)

**Tasks**:
1. ✅ Create `OptionsTable.tsx` component
2. ✅ Update `/trades` page to use OptionsTable
3. ✅ Create `/option/[id]` page structure
4. ✅ Build `OptionHeader.tsx` component
5. ✅ Build `OptionTradesTable.tsx` component
6. ✅ Build `OptionPNLSummary.tsx` component
7. ✅ Create `AddTradeModal.tsx` component
8. ✅ Update `CreateOptionForm.tsx` (from TradeForm)

**Deliverables**:
- Functional list view showing options
- Functional detail view showing option with trades
- Working modals for adding trades

### Phase 3: Integration & Testing (Week 3)

**Tasks**:
1. ✅ Integrate frontend with new API endpoints
2. ✅ Test complete user flows:
   - Create new option with initial trade
   - View option list
   - Navigate to option detail
   - Add to position
   - Reduce position
   - Close position fully
3. ✅ Test PNL calculations across scenarios
4. ✅ Test filter and sorting functionality
5. ✅ Test responsive design on mobile
6. ✅ Fix bugs and edge cases

**Deliverables**:
- Fully functional option-centric workflow
- All user flows tested and working
- Bug-free experience

### Phase 4: Migration & Cleanup (Week 4)

**Tasks**:
1. ✅ Deploy database changes to staging
2. ✅ Run data migration on staging
3. ✅ Deploy frontend/backend to staging
4. ✅ User acceptance testing
5. ✅ Deploy to production
6. ✅ Monitor for issues
7. ✅ Archive old components (TradeCard, TradeForm, etc.)
8. ✅ Remove deprecated API routes
9. ✅ Drop `options_trades_backup` table (after 30 days)

**Deliverables**:
- Production deployment complete
- Old code archived/removed
- Documentation updated

---

## Testing Strategy

### Unit Tests

**Database Repositories**:
- Test option CRUD operations
- Test trade CRUD operations
- Test cascade deletes
- Test unique constraint violations

**Calculators**:
- Test net contracts calculation
- Test average premium calculation
- Test PNL calculations for various scenarios:
  - Single OPEN trade
  - OPEN + ADD trades
  - OPEN + REDUCE trades
  - OPEN + CLOSE trades
  - Multiple ADD/REDUCE trades

### Integration Tests

**API Endpoints**:
- Test option creation with initial trade
- Test adding trades to options
- Test updating option status
- Test filtering and sorting
- Test error handling (invalid data, unauthorized access)

### E2E Tests

**User Flows**:
1. Create new option → Verify it appears in list
2. Click option → Verify detail page loads
3. Add to position → Verify trade appears and totals update
4. Reduce position → Verify net contracts decrease
5. Close position → Verify status changes to 'Closed'
6. Filter options by status → Verify correct options shown

---

## Risk Assessment

### High Risk

**Data Migration Issues**
- **Risk**: Existing trade data not migrated correctly
- **Mitigation**: 
  - Thorough testing on staging with production copy
  - Keep backup table for 30 days
  - Dry-run migration script multiple times
  - Manual verification of sample data

**Breaking Changes**
- **Risk**: Existing workflows break after deployment
- **Mitigation**:
  - Phased rollout with feature flags
  - Keep old API routes active initially
  - Comprehensive testing before production
  - Rollback plan ready

### Medium Risk

**PNL Calculation Errors**
- **Risk**: Complex position calculations have bugs
- **Mitigation**:
  - Extensive unit tests with edge cases
  - Manual verification against spreadsheet calculations
  - User testing before production

**Performance Issues**
- **Risk**: Joins between options/trades slow for large datasets
- **Mitigation**:
  - Proper indexing on foreign keys
  - Pagination for large result sets
  - Query optimization and monitoring

### Low Risk

**User Confusion**
- **Risk**: Users confused by new UI/workflow
- **Mitigation**:
  - Clear documentation/help text
  - Smooth transition with familiar UI elements
  - Optional onboarding guide

---

## Success Metrics

### Functional Metrics
- ✅ All existing trades migrated successfully (100%)
- ✅ All PNL calculations match manual verification
- ✅ Zero data loss during migration
- ✅ All API endpoints return < 500ms

### User Experience Metrics
- ✅ Users can create new options in ≤ 3 clicks
- ✅ Users can add to positions in ≤ 2 clicks
- ✅ Option detail page loads in < 1 second
- ✅ Mobile responsive design works on all screen sizes

### Code Quality Metrics
- ✅ 80%+ test coverage on new code
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ All components documented

---

## Rollback Plan

### If Issues Found After Deployment

**Within 24 Hours**:
1. Revert frontend deployment (restore previous build)
2. Revert API changes (restore previous routes)
3. Keep new database tables but use old `options_trades` table
4. Investigate and fix issues in development

**After 24 Hours**:
1. Fix forward - patch issues rather than rollback
2. Database rollback becomes complex (new data may exist)
3. Communicate with users about temporary issues

### Database Rollback Process

```sql
-- If needed, restore from backup
DROP TABLE trades;
DROP TABLE options;
ALTER TABLE options_trades_backup RENAME TO options_trades;
```

**Note**: Only possible if no new data created in new schema

---

## Future Enhancements

### Post-Launch Improvements

1. **Batch Trade Import**: Upload CSV of trades
2. **Position Analytics**: Charts showing position history over time
3. **Trade Journal**: Rich text notes per trade
4. **Alerts**: Notify when options near expiry
5. **Strategy Tagging**: Tag options by strategy (covered call, cash-secured put, etc.)
6. **Cost Basis Tracking**: FIFO/LIFO for partial closes
7. **Export Reports**: PDF/Excel export of option history
8. **Performance Dashboard**: Overall portfolio metrics

---

## Appendix

### Example Scenarios

#### Scenario 1: Basic Option Lifecycle
```
User creates: 9988 Sell Put HKD 80.00, Expiry: 2026-03-31
  → Option created with status 'Open'
  → Trade #1 (OPEN): 5 contracts @ HKD 2.50 premium
  
User adds to position:
  → Trade #2 (ADD): 3 contracts @ HKD 2.00 premium
  → Net contracts: 8
  → Avg entry premium: HKD 2.31
  
User closes half:
  → Trade #3 (REDUCE): 4 contracts @ HKD 1.00 premium
  → Net contracts: 4
  → Realized PNL: Calculated on 4 closed contracts
  
User closes remaining:
  → Trade #4 (CLOSE): 4 contracts @ HKD 0.80 premium
  → Net contracts: 0
  → Option status → 'Closed'
  → Total PNL: Realized from all contracts
```

#### Scenario 2: Multiple Options Same Stock
```
User has:
  Option A: 9988 Sell Put HKD 80.00, Expiry: 2026-03-31
  Option B: 9988 Sell Put HKD 85.00, Expiry: 2026-03-31
  Option C: 9988 Sell Call HKD 100.00, Expiry: 2026-04-30

All shown as separate rows in /trades page
Each clickable to respective detail pages
Independent position tracking
```

### Database Indexes Performance

**Query**: Get all options for user with trade counts
```sql
SELECT o.*, COUNT(t.id) as trades_count
FROM options o
LEFT JOIN trades t ON t.option_id = o.id
WHERE o.user_id = $1
GROUP BY o.id;
```
**Indexes Used**:
- `idx_options_user_id` (fast user lookup)
- `idx_trades_option_id` (fast join)

**Query**: Get option detail with all trades
```sql
SELECT o.*, t.*
FROM options o
LEFT JOIN trades t ON t.option_id = o.id
WHERE o.id = $1
ORDER BY t.trade_date ASC;
```
**Indexes Used**:
- Primary key on options
- `idx_trades_option_id` (fast join)
- `idx_trades_trade_date` (fast sort)

---

## Approval Required

**Technical Lead**: _______________  Date: _______
**Product Owner**: _______________  Date: _______
**Database Admin**: _______________  Date: _______

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-29
