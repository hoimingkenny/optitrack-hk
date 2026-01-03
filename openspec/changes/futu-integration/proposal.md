# Change Proposal: Futu API Integration & Option Chain Data

## Executive Summary
This proposal outlines the integration of the Futu OpenAPI into the OptiTrack HK platform. The primary objective is to enhance the application's data capabilities by fetching real-time and static market data directly from Futu OpenD. The initial implementation focuses on retrieving Option Expiration Dates and Option Chains (Calls/Puts) for specific underlying stocks, enabling users to view comprehensive option data.

## Project Scope

### Phase 1: Foundation & Expiration Dates (Completed)
- **Goal**: Establish connectivity with Futu OpenD and retrieve option expiration dates.
- **Deliverables**:
    - `futu-api` integration.
    - WebSocket connection management.
    - API endpoint for expiration dates.
    - Frontend search interface.

### Phase 2: Option Chain Data (Current Focus)
- **Goal**: Retrieve and display the full option chain for a selected expiration date.
- **Deliverables**:
    - **API Expansion**: New endpoint to fetch option chains based on stock symbol and expiration date.
    - **Frontend Enhancement**: Interactive UI to select an expiration date and view the corresponding list of options (Calls and Puts) with strike prices.
    - **Data Visualization**: Structured table display of the option chain.

## Technical Architecture

### 1. Data Layer (Futu OpenD)
- **Gateway**: Futu OpenD acts as the gateway to the Futu servers.
- **Protocol**: WebSocket (Protobuf) via `futu-api` Node.js SDK.
- **Authentication**: Localhost connection with `userID` and `pwdMd5` (optional for local, required for real trade/quote rights).

### 2. Service Layer (Node.js/TypeScript)
- **Client Utility**: `utils/futu/client.ts` manages the lifecycle of the WebSocket connection.
- **Methods**:
    - `getOptionExpirationDates(symbol)`: Fetches available dates.
    - `getOptionChain(symbol, start, end)`: Fetches the list of options for the given date range.

### 3. API Layer (Next.js App Router)
- **Endpoints**:
    - `GET /api/futu/option-expiration`: Returns expiration dates.
    - `GET /api/futu/option-chain`: Returns the option chain for a specific date.

### 4. Presentation Layer (React/Chakra UI)
- **Components**:
    - `FutuOptionsPage`: Orchestrates the search and display flow.
    - **Interaction**: User searches Symbol -> Selects Date -> Views Chain.

## Implementation Details

### Option Chain Data Structure
The `getOptionChain` method will return:
- `code`: Option symbol (e.g., "HK.TCH210429C350000").
- `name`: Option name (e.g., "Tencent 210429 350.00 Call").
- `strikePrice`: The strike price.
- `optionType`: Call or Put.
- `strikeTime`: Expiration date.

### Risk Management
- **Connection Stability**: The `client.ts` must handle connection timeouts and failures gracefully.
- **Performance**: Fetching large option chains can be heavy. We will fetch only for the selected date (`start` = `end`).
- **Rate Limiting**: Futu OpenD has internal rate limits; we should ensure we close connections after use or reuse them efficiently (currently creating per-request for simplicity, optimized later).

## Status
- [x] Phase 1: Expiration Dates
- [ ] Phase 2: Option Chain Implementation
    - [x] Update Type Definitions
    - [x] Implement `getOptionChain` in Client
    - [x] Create API Route
    - [x] Update Frontend UI
    - [x] Verification
