I have confirmed that the Quote API is missing. I will implement it and then fix the filtering issues.

### **Phase 1: Implement Missing Quote API**
*   **Goal**: Enable fetching the real-time stock price (required for ITM/OTM calculations).
*   **Method**: I will use the `GetSecuritySnapshot` API (as per your documentation link) because it is stateless and efficient for retrieving the `lastPrice`.
*   **Changes**:
    1.  **Backend**: Create `app/api/futu/quote/route.ts`.
    2.  **Utils**: Update `utils/futu/client.ts` to export a `getQuote` helper function.

### **Phase 2: Fix Filters & "Call/Put" Buttons**
*   **Problem**: Current server-side filtering is unreliable and causes the "buttons not working" issue.
*   **Solution**: **Client-Side Filtering**.
    1.  **Fetch Strategy**: `handleFetchChain` will be updated to **always fetch ALL options** (Calls + Puts, ITM + OTM) for the selected date.
    2.  **Filtering**: The "Call/Put" and "ITM/OTM" buttons will now filter the data *instantly* in the browser using the full dataset.
    3.  **Accuracy**: ITM/OTM status will be calculated dynamically using the price from Phase 1.

### **Phase 3: UI Enhancements**
*   **Current Price Row**: When "All" is selected, I will insert a **"Current Price" divider row** into the table, positioned correctly between the strike prices (e.g., between $100 and $105 if the stock is $102).
*   **Highlighting**: ITM options will be visually highlighted.

This approach solves the API gap and guarantees responsive, correct filtering.
