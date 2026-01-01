# Proposal: Stock Search and Selection in Option Creation

## Goal
Improve the user experience of creating new options by replacing the manual text input for "Stock Symbol" with a searchable selection component. This component will allow users to search for stocks by their symbol (e.g., "1299.HK") or name (e.g., "AIA") using the data already stored in the `stocks` table.

## User Experience
1. **Searchable Input**: In the "Create Option" form, the "Stock Symbol" field becomes a searchable dropdown/combobox.
2. **Search Logic**: As the user types, the list filters stocks matching the input in either the `symbol` or `name` fields.
3. **Selection**: Selecting a stock automatically fills the required `stock_id` and can pre-fill other relevant data like `shares_per_contract`.
4. **Validation**: Ensures only valid stocks from our database are selected.

## Technical Implementation

### 1. Backend (Repository)
- **New Method**: Add `searchStocks(query: string)` to `db/repositories/stocks.ts`.
- **Query**: Use Drizzle `ilike` or `or` operators to search both `symbol` and `name`.

### 2. Frontend (Components)
- **New Component**: Create a `StockSelect` component using Chakra UI v3's `Combobox` or a custom implementation of an "Autocomplete" input.
- **State Management**: Manage the search query and the list of filtered stocks.
- **Integration**: Replace the current `stock_symbol` input in `components/trades/TradeForm.tsx` with the new `StockSelect` component.

### 3. Data Flow
- When the user types, a request (or local filter if the list is small enough) is triggered.
- Selecting an item updates the form state with the selected stock's `id` and `symbol`.

## Files to be Modified
- `db/repositories/stocks.ts`: Add search functionality.
- `components/trades/TradeForm.tsx`: Replace input with searchable selection.
- `components/ui/StockSelect.tsx`: (New) Searchable stock selection component.

## Status
- [x] Proposal Created
- [ ] UI Design Defined
- [ ] Backend Implementation
- [ ] Frontend Integration
- [ ] Verification
