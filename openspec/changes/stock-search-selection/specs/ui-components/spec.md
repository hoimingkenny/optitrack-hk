# Spec: Stock Selection Component

## Overview
A searchable selection component (Autocomplete/Combobox) for choosing a stock from the database.

## Component: `StockSelect`

### Props
- `value`: Current selected stock ID.
- `onSelect`: Callback function when a stock is selected, passing the full stock object.
- `placeholder`: Placeholder text (default: "Search by symbol or name...").

### UI Requirements (Chakra UI v3)
- **Input Field**: Standard text input for typing search queries.
- **Dropdown List**: Displays results below the input.
- **List Item Content**:
  - Primary text: Stock Symbol (e.g., `1299.HK`)
  - Secondary text: Company Name (e.g., `AIA`)
- **Empty State**: Show "No stocks found" if the search returns no results.
- **Loading State**: Show a spinner if searching is asynchronous.

### Behavior
- **Initial State**: Show a list of popular/recent stocks or all stocks (if the list is small).
- **Filtering**: Local filtering if all stocks are pre-loaded, or server-side if the list grows large.
- **Keyboard Navigation**: Support arrow keys for selection and Enter to confirm.
- **Auto-clear**: Clear the search query after selection if appropriate.

## Integration in `TradeForm`
- Replace `FormControl` for `stock_symbol`.
- Bind the selected stock's `id` to the form's `stock_id` field.
- Ensure the form still works for submission with the new `stock_id` field.
