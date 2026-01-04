# New Ideas & Feature Requests

## Option Pricing & Real-time Data
- **Snapshot Fetching**: In each option, fetch the snapshot of the last premium price.
  - This will allow us to calculate the current contract price in real-time or near real-time.

## Margin Management
- **New Option Entry**: Add an input box for `Margin %` when creating a new option.
- **Trade Data**: Persist the `Margin %` to each trade's data records.
- **Position Summary**: In the Position Summary section of the Option page, display the **Total Margin** for the trade.
  - This helps track capital requirements for sell strategies (Sell Put/Sell Call).
