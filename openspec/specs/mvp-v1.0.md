# OptiTrack HK - MVP Version 1.0 Specification

## 1. Overview

**Project Name**: OptiTrack HK  
**Description**: A web-based personal recorder for Hong Kong stock options trades. Users log open/close trades, track lifecycle PNL (Profit and Loss), monitor trade status (e.g., Open, Closed, Expired), and query by stock symbol. Designed for simplicity: no real-time data, no execution—just manual logging and local calculations. Focus on Sell Put/Sell Call strategies common in HKEX options.

**Target Users**: Individual HK stock options traders (e.g., monitoring Meituan 03690.HK trades)  
**Platform**: Web app (responsive for mobile/desktop; future PWA for offline)  
**Key Goals**: 
- Replace handwritten notes
- Enable quick PNL review
- Auto-status updates for expiry/exercise risks

## 2. Core Features (MVP)

### 2.1 Trade Entry
- **Manual logging** of options trades with the following fields:
  - Stock Symbol (e.g., 03690.HK for Meituan)
  - Trade Type: Sell Put / Sell Call
  - Strike Price (HKD)
  - Expiry Date
  - Premium Received (HKD per contract)
  - Number of Contracts
  - Entry Date/Time
  - Notes (optional free text)

### 2.2 Trade Status Tracking
Auto-calculated status based on current date and trade data:
- **Open**: Trade is active, before expiry
- **Closed**: User manually closed the position (bought back)
- **Expired Worthless**: Expiry date passed, option expired OTM (profit = premium)
- **Exercised/Assigned**: Expiry date passed, option expired ITM (requires manual confirmation)
- **Near Expiry**: Within 7 days of expiry (alert status)

### 2.3 PNL Calculation
- **For Sell Put/Sell Call**:
  - Opening: Credit = Premium × Contracts × Multiplier (100 shares/contract for HKEX)
  - Closing: Debit = Closing Premium × Contracts × Multiplier
  - Net PNL = Opening Credit - Closing Debit (if closed early)
  - Net PNL = Opening Credit (if expired worthless)
  
- **Display**:
  - Per-trade PNL (HKD)
  - Total portfolio PNL (sum of all trades)
  - Percentage return per trade (PNL / max risk)

### 2.4 Trade List & Filtering
- **View all trades** in a table/card layout
- **Filter by**:
  - Stock Symbol
  - Trade Status (Open, Closed, Expired, etc.)
  - Date Range
- **Sort by**:
  - Entry Date (newest/oldest)
  - Expiry Date (soonest/latest)
  - PNL (highest/lowest)

### 2.5 Stock Symbol Search
- Quick search/filter by stock code (e.g., "03690")
- Display all trades for that symbol
- Show aggregate PNL for the symbol

## 3. Data Model (Supabase Schema)

### Table: `trades`
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Trade Details
  stock_symbol VARCHAR(20) NOT NULL, -- e.g., "03690.HK"
  trade_type VARCHAR(20) NOT NULL, -- "SELL_PUT" or "SELL_CALL"
  strike_price DECIMAL(10,2) NOT NULL,
  expiry_date DATE NOT NULL,
  
  -- Position Details
  contracts INTEGER NOT NULL,
  opening_premium DECIMAL(10,4) NOT NULL, -- Premium per share
  opening_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Closing Details (nullable until closed)
  closing_premium DECIMAL(10,4),
  closing_date TIMESTAMP,
  
  -- Status & Metadata
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', 
  -- OPEN, CLOSED, EXPIRED_WORTHLESS, EXERCISED, NEAR_EXPIRY
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_stock_symbol ON trades(stock_symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_expiry_date ON trades(expiry_date);

-- Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" 
  ON trades FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" 
  ON trades FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" 
  ON trades FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" 
  ON trades FOR DELETE 
  USING (auth.uid() = user_id);
```

### Table: `stock_symbols` (Optional - for autocomplete)
```sql
CREATE TABLE stock_symbols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(20) UNIQUE NOT NULL, -- e.g., "03690.HK"
  name VARCHAR(100) NOT NULL, -- e.g., "Meituan"
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 4. Technical Architecture

### 4.1 Frontend (Next.js App Router)
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          # Login page
│   └── signup/
│       └── page.tsx          # Signup page
├── (dashboard)/
│   ├── layout.tsx            # Dashboard layout with nav
│   ├── page.tsx              # Dashboard home (trade list)
│   ├── trades/
│   │   ├── page.tsx          # Trade list view
│   │   ├── new/
│   │   │   └── page.tsx      # New trade form
│   │   └── [id]/
│   │       ├── page.tsx      # Trade detail view
│   │       └── edit/
│   │           └── page.tsx  # Edit trade form
│   └── analytics/
│       └── page.tsx          # PNL analytics (future)
└── api/
    └── trades/
        ├── route.ts          # GET all trades, POST new trade
        ├── [id]/
        │   └── route.ts      # GET, PATCH, DELETE specific trade
        └── calculate-pnl/
            └── route.ts      # POST to calculate PNL

components/
├── trades/
│   ├── TradeForm.tsx         # Form for creating/editing trades
│   ├── TradeList.tsx         # List/table of trades
│   ├── TradeCard.tsx         # Individual trade card
│   ├── TradeFilters.tsx      # Filter/search controls
│   └── PNLSummary.tsx        # PNL summary widget
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Badge.tsx             # For status badges
│   └── Card.tsx
└── layout/
    ├── DashboardNav.tsx      # Navigation sidebar/header
    └── StatsCard.tsx         # Summary stats cards

utils/
├── supabase.ts               # Existing Supabase client
├── helpers/
│   ├── pnl-calculator.ts     # PNL calculation logic
│   ├── status-calculator.ts  # Auto-calculate trade status
│   ├── date-helpers.ts       # Date formatting/parsing
│   └── validators.ts         # Form validation
└── types/
    └── trades.ts             # TypeScript interfaces
```

### 4.2 Key Utilities

#### PNL Calculator (`utils/helpers/pnl-calculator.ts`)
```typescript
interface PNLResult {
  grossPNL: number;
  netPNL: number; // After fees if applicable
  returnPercentage: number;
}

function calculateTradePNL(trade: Trade): PNLResult {
  const multiplier = 100; // HKEX options
  const openingCredit = trade.opening_premium * trade.contracts * multiplier;
  
  if (trade.status === 'CLOSED' && trade.closing_premium) {
    const closingDebit = trade.closing_premium * trade.contracts * multiplier;
    const grossPNL = openingCredit - closingDebit;
    return {
      grossPNL,
      netPNL: grossPNL, // Can deduct fees later
      returnPercentage: (grossPNL / (trade.strike_price * trade.contracts * multiplier)) * 100
    };
  }
  
  if (trade.status === 'EXPIRED_WORTHLESS') {
    return {
      grossPNL: openingCredit,
      netPNL: openingCredit,
      returnPercentage: (openingCredit / (trade.strike_price * trade.contracts * multiplier)) * 100
    };
  }
  
  // For OPEN or EXERCISED, return unrealized/estimated
  return { grossPNL: 0, netPNL: 0, returnPercentage: 0 };
}
```

#### Status Calculator (`utils/helpers/status-calculator.ts`)
```typescript
function calculateTradeStatus(trade: Trade): TradeStatus {
  const now = new Date();
  const expiryDate = new Date(trade.expiry_date);
  const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Manual close takes precedence
  if (trade.closing_date) {
    return 'CLOSED';
  }
  
  // Expired
  if (daysToExpiry < 0) {
    // User needs to manually mark as EXPIRED_WORTHLESS or EXERCISED
    return trade.status; // Keep existing status
  }
  
  // Near expiry alert
  if (daysToExpiry <= 7 && daysToExpiry >= 0) {
    return 'NEAR_EXPIRY';
  }
  
  return 'OPEN';
}
```

## 5. User Flows

### 5.1 New Trade Entry
1. User clicks "Add Trade" button
2. Form displays with fields:
   - Stock Symbol (text input with autocomplete)
   - Trade Type (dropdown: Sell Put / Sell Call)
   - Strike Price (number input)
   - Expiry Date (date picker)
   - Premium Received (number input, per share)
   - Number of Contracts (number input)
   - Notes (textarea, optional)
3. Form validates:
   - All required fields filled
   - Expiry date is future date
   - Numeric fields are positive
4. On submit:
   - Calculate opening credit
   - Save to Supabase `trades` table
   - Set status to 'OPEN'
   - Redirect to trade list

### 5.2 Close Trade
1. User selects trade from list
2. Clicks "Close Position" button
3. Modal/form displays:
   - Show current trade details
   - Input: Closing Premium (per share)
   - Input: Closing Date (default: today)
4. On submit:
   - Update trade record with closing details
   - Set status to 'CLOSED'
   - Calculate final PNL
   - Refresh trade list

### 5.3 View Trade History
1. Dashboard displays all trades in table/card format
2. Default sort: newest first
3. Each row shows:
   - Stock Symbol
   - Trade Type (colored badge)
   - Strike Price
   - Expiry Date
   - Status (colored badge)
   - PNL (green if positive, red if negative)
   - Actions (View, Edit, Close, Delete)
4. Filters available:
   - Search by symbol
   - Filter by status (dropdown)
   - Date range picker

### 5.4 Expiry Handling (Manual)
1. System shows "NEAR_EXPIRY" status for trades within 7 days
2. After expiry date passes:
   - User reviews trade outcome
   - If OTM: User clicks "Mark as Expired Worthless"
   - If ITM: User clicks "Mark as Exercised" and enters assignment details
3. Status updates and PNL finalizes

## 6. UI/UX Design

### 6.1 Color Scheme
- **Primary**: Blue (#3b82f6) for CTAs
- **Success**: Green (#10b981) for profits, positive PNL
- **Danger**: Red (#ef4444) for losses, negative PNL
- **Warning**: Orange (#f59e0b) for near expiry alerts
- **Neutral**: Gray scale for backgrounds and text

### 6.2 Status Badges
- **OPEN**: Blue badge
- **CLOSED**: Gray badge
- **EXPIRED_WORTHLESS**: Green badge (profit locked in)
- **EXERCISED**: Red badge (needs review)
- **NEAR_EXPIRY**: Orange badge (alert)

### 6.3 Trade Type Badges
- **SELL_PUT**: Purple badge
- **SELL_CALL**: Teal badge

### 6.4 Responsive Layout
- **Desktop**: Table view with all columns
- **Mobile**: Card view with key details, expandable for full info

## 7. Authentication

### 7.1 Supabase Auth Setup
- **Email/Password** authentication (MVP)
- Simple signup/login flow
- Protected dashboard routes (redirect to login if not authenticated)
- User session persisted in browser

### 7.2 Auth Flow
1. Landing page with Login/Signup options
2. After successful auth, redirect to dashboard
3. All API routes check `auth.uid()` for authorization
4. RLS policies ensure users only see their own trades

## 8. MVP Constraints & Future Enhancements

### MVP Limitations
- ✅ Manual entry only (no broker API integration)
- ✅ No real-time stock price data
- ✅ No automated exercise detection
- ✅ Basic PNL calculation (no complex Greeks)
- ✅ No multi-leg strategies (only single Sell Put/Call)
- ✅ No commission/fee tracking
- ✅ No export to CSV/PDF

### Future Enhancements (Post-MVP)
- 📈 Real-time HK stock price integration
- 📊 Advanced analytics (win rate, Sharpe ratio)
- 🔔 Push notifications for expiry alerts
- 📱 PWA for offline access
- 💰 Commission/fee tracking
- 📤 Export trades to CSV/Excel
- 🔄 Multi-leg strategies (spreads, strangles)
- 🤖 Auto-sync with broker (e.g., Futu, Interactive Brokers)
- 📸 Receipt photo upload for trade verification

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Set up Supabase database schema
- ✅ Create authentication pages (login/signup)
- ✅ Build basic trade form component
- ✅ Implement trade creation API

### Phase 2: Core Features (Week 2)
- ✅ Build trade list view with filtering
- ✅ Implement PNL calculation logic
- ✅ Add status calculation and badges
- ✅ Create trade detail/edit pages

### Phase 3: Polish & Testing (Week 3)
- ✅ Add responsive design for mobile
- ✅ Implement close position flow
- ✅ Add expiry alerts and handling
- ✅ User testing and bug fixes

### Phase 4: Launch (Week 4)
- ✅ Deploy to Vercel
- ✅ Documentation and user guide
- ✅ Beta testing with real users
- ✅ Iterate based on feedback

## 10. Success Metrics
- User can log a trade in < 60 seconds
- Dashboard loads in < 2 seconds
- Accurate PNL calculations (verified against manual calculations)
- Zero data loss (Supabase backup enabled)
- Mobile responsive (works on iPhone/Android)
- At least 5 beta users actively tracking trades

---

**Document Version**: 1.0  
**Last Updated**: December 25, 2025  
**Status**: Ready for Implementation
