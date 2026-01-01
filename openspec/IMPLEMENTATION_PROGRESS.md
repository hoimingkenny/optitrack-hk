# OptiTrack HK - Implementation Progress

## ✅ Completed - Full MVP Implementation

### 🔄 Recently Completed (Archived)
- **Database Refactor**: Replaced `stock_symbol` with `stock_id` foreign key referencing `stocks` table.
- **Drizzle ORM Integration**: Migrated from manual Supabase calls to Drizzle ORM.
- **Chakra UI v3 Migration**: Updated UI components to Chakra UI v3.
- **Option-Centric Refactor**: Restructured database to group trades under options.

### Core Features Implemented

#### 1. **User Authentication**
- Email/password signup and login via Supabase Auth
- User-isolated trades with Row Level Security (RLS)
- Session persistence and auth state management
- Sign out functionality

#### 2. **Trade Recording**

**Open Trade Form** with fields:
- `stock_symbol` - HK stock format (e.g., 03690.HK)
- `direction` - Sell Put / Sell Call / Buy Put / Buy Call
- `strike_price` - Strike price in HKD
- `expiry_date` - Expiry date picker
- `premium` - Premium per share (HKD)
- `contracts` - Number of contracts
- `shares_per_contract` - Default 500 for HKEX
- `fee` - Opening fee
- `stock_price` - Current stock price (for ITM/OTM)
- `hsi` - Hang Seng Index (manual input)

**Auto-calculated**:
- `total_premium` = premium × contracts × shares_per_contract
- Unique trade ID: `SYMBOL_STRIKE_EXPIRY_DIRECTION`
- Status defaults to "OPEN"

**Close Trade Modal**:
- Load open trade data
- Input: `close_premium`, `close_fee`, `close_stock_price`, `close_hsi`
- Auto-calc: `gross_pnl` = open_total_premium - close_total_premium
- Auto-calc: `net_pnl` = gross_pnl - (fee + close_fee)
- Updates status to "CLOSED"

#### 3. **PNL Calculations**
- Per-trade PNL display (big green/red number)
- Portfolio total PNL summary
- Win rate calculation
- Average hold days
- Return percentage

#### 4. **Status System**
Auto/manual updates:
- **OPEN** (Blue) - New open trade
- **CLOSED** (Green) - After close log
- **EXPIRED** (Gray) - Expiry date < current date, pending resolution
- **EXERCISED** (Orange) - Expired + ITM
- **LAPSED** (Gray) - Expired + OTM

Daily auto-check on app load with toast notifications.

#### 5. **Trade Filtering**
- Filter by stock symbol
- Filter by status
- Filter by direction
- Clear filters button

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| `Button` | `components/ui/Button.tsx` | Primary, secondary, danger, ghost variants |
| `Input` | `components/ui/Input.tsx` | Form input with label, error, helper text |
| `Select` | `components/ui/Select.tsx` | Dropdown with options |
| `Badge` | `components/ui/Badge.tsx` | Status and direction badges |
| `Card` | `components/ui/Card.tsx` | Container with header, content, footer |
| `Modal` | `components/ui/Modal.tsx` | Modal dialog with confirm variant |
| `Toast` | `components/ui/Toast.tsx` | Notification system |
| `AuthForm` | `components/auth/AuthForm.tsx` | Login/signup form |
| `DashboardNav` | `components/layout/DashboardNav.tsx` | Navigation header |
| `TradeForm` | `components/trades/TradeForm.tsx` | New trade entry form |
| `TradeCard` | `components/trades/TradeCard.tsx` | Trade display card |
| `TradeFilters` | `components/trades/TradeFilters.tsx` | Filter controls |
| `CloseTradeModal` | `components/trades/CloseTradeModal.tsx` | Close position modal |
| `PNLSummary` | `components/trades/PNLSummary.tsx` | Portfolio statistics |

### Utility Functions

| File | Functions |
|------|-----------|
| `utils/types/trades.ts` | Type definitions, `generateTradeId()` |
| `utils/helpers/pnl-calculator.ts` | `calculateTradePNL()`, `calculatePortfolioPNL()`, `formatHKD()`, `formatPNL()` |
| `utils/helpers/status-calculator.ts` | `calculateTradeStatus()`, `checkIfITM()`, `checkAndUpdateExpiredTrades()` |
| `utils/helpers/validators.ts` | `validateTradeInput()`, `validateCloseTradeInput()`, `sanitizeStockSymbol()` |
| `utils/helpers/date-helpers.ts` | Date formatting and parsing utilities |
| `utils/supabase.ts` | Auth helpers, CRUD operations, queries |

### Non-Functional Requirements Met

✅ **Performance**: Components optimized, minimal re-renders  
✅ **Security**: RLS on DB, auth-protected routes  
✅ **Accessibility**: High contrast dark mode, ARIA labels on forms  
✅ **Localization**: HKD formatting, YYYY-MM-DD dates  
✅ **Error Handling**: Toast notifications for failures, validation messages  

## 📋 Setup Instructions

### 1. Database Setup
Run the SQL script in `openspec/DATABASE_SETUP.md` in Supabase SQL Editor.

### 2. Environment Variables
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Access
Open http://localhost:3000

## 🗂️ File Structure

```
app/
├── globals.css          # Dark mode styles, animations
├── layout.tsx           # Root layout with metadata
├── page.tsx             # Main dashboard with auth

components/
├── auth/AuthForm.tsx
├── layout/DashboardNav.tsx
├── trades/
│   ├── CloseTradeModal.tsx
│   ├── PNLSummary.tsx
│   ├── TradeCard.tsx
│   ├── TradeFilters.tsx
│   └── TradeForm.tsx
└── ui/
    ├── Badge.tsx
    ├── Button.tsx
    ├── Card.tsx
    ├── Input.tsx
    ├── Modal.tsx
    ├── Select.tsx
    └── Toast.tsx

utils/
├── supabase.ts
├── helpers/
│   ├── date-helpers.ts
│   ├── pnl-calculator.ts
│   ├── status-calculator.ts
│   └── validators.ts
└── types/
    └── trades.ts
```

## 🎯 Features Summary

| Feature | Status |
|---------|--------|
| Email/password authentication | ✅ |
| Open trade with all fields | ✅ |
| Auto-calc total_premium | ✅ |
| Close trade with PNL calc | ✅ |
| Status badges (OPEN, CLOSED, EXPIRED, EXERCISED, LAPSED) | ✅ |
| Auto-expiry check on load | ✅ |
| ITM/OTM detection for exercised | ✅ |
| Filter by stock, status, direction | ✅ |
| Portfolio PNL summary | ✅ |
| Win rate, avg hold days | ✅ |
| Dark mode default | ✅ |
| HKD currency formatting | ✅ |
| YYYY-MM-DD date format | ✅ |
| Toast notifications | ✅ |
| Form validation | ✅ |
| Responsive design | ✅ |
| ARIA accessibility labels | ✅ |

---

**Status**: MVP Complete ✅  
**Last Updated**: December 25, 2025  
**Version**: 2.0
