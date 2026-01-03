I will refactor the "New Option" functionality to use a Modal with the requested 4-row layout and optimized data fetching.

### 1. Backend Updates (Data Fetching Optimization)
- **Modify `utils/futu/client.ts`**: Update `getOptionChain` to support a `skipSnapshots` parameter. This allows fetching the list of option contracts quickly without waiting for real-time market data for every single option.
- **Update API Endpoint**: Modify `app/api/futu/option-chain/route.ts` to accept the `skipSnapshots` query parameter.

### 2. UI Refactoring
- **Modify `app/page.tsx`**: 
  - Replace the inline `TradeForm` rendering with the `Modal` component from `@/components/ui/Modal`.
  - The "New Option" button will trigger this Modal.
- **Update `components/trades/TradeForm.tsx`**:
  - **Layout Overhaul**: Reorganize the form into the requested 4-row structure:
    - **Row 1**: Stock Symbol (Search), Direction (Buy/Sell Toggle), Option Type (Call/Put Toggle).
    - **Row 2**: "Options of the stock" (Single Dropdown).
      - *Logic*: When Stock and Type are selected, the system will auto-fetch **all available option contracts** (without snapshots) and display them in the format `{stock short name} {expiration date} {strike price} {option type}` (e.g., `HK.00700 20260228 600.00 C`).
      - *Selection*: Choosing an option from this list will auto-fill the `expiry_date`, `strike_price`, and `futu_code`. It will then trigger a separate real-time quote fetch to populate the **Premium** field.
    - **Row 3**: Trade Date, Premium (Auto-filled but editable).
    - **Row 4**: No. of Contracts, Fee.
  - **Component Updates**: Implement a specialized logic to fetch and format the flat list of options for the dropdown.

### 3. Implementation Steps
1.  **Backend**: Add `skipSnapshots` to Futu client and API.
2.  **Frontend**: Update `TradeForm` layout and logic to support the "single dropdown" workflow.
3.  **Integration**: Wrap `TradeForm` in `Modal` in `app/page.tsx`.
