## MODIFIED Requirements
### Requirement: Data Model
The system SHALL use a relational model for stocks and options.

#### Scenario: Option-Stock Relation
- **WHEN** an option is created
- **THEN** it MUST reference a valid record in the `stocks` table via `stock_id`
- **AND** the `stock_symbol` is stored only in the `stocks` table
