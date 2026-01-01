# UI Components Specification - Chakra UI v3 Migration

## MODIFIED Requirements

### Requirement: Button Component
The system SHALL provide a Button component using Chakra UI v3 that supports multiple visual variants and states.

#### Scenario: Primary button rendering
- **WHEN** a Button is rendered with variant="primary"
- **THEN** it displays with blue background (blue.600) and white text
- **AND** hover state shows darker blue (blue.700)

#### Scenario: Secondary button rendering
- **WHEN** a Button is rendered with variant="secondary"
- **THEN** it displays with gray background (gray.700) and light text
- **AND** has a visible border

#### Scenario: Danger button rendering
- **WHEN** a Button is rendered with variant="danger"
- **THEN** it displays with red background (red.600) and white text

#### Scenario: Ghost button rendering
- **WHEN** a Button is rendered with variant="ghost"
- **THEN** it displays with transparent background
- **AND** hover state shows subtle gray background

#### Scenario: Loading state
- **WHEN** a Button has isLoading=true
- **THEN** it displays a spinner indicator
- **AND** the button is disabled

#### Scenario: Size variants
- **WHEN** a Button is rendered with size="sm", "md", or "lg"
- **THEN** it displays with appropriate padding and font size

---

### Requirement: Card Component
The system SHALL provide a Card component using Chakra UI v3 for content containers with consistent dark theme styling.

#### Scenario: Default card rendering
- **WHEN** a Card is rendered
- **THEN** it displays with dark background (gray.900)
- **AND** has a subtle border (gray.800)
- **AND** has rounded corners (xl)

#### Scenario: Card with header
- **WHEN** a Card includes CardHeader and CardTitle
- **THEN** the header displays with bottom border separator

#### Scenario: Card padding variants
- **WHEN** a Card is rendered with padding="none", "sm", "md", or "lg"
- **THEN** the content area has appropriate padding

---

### Requirement: Input Component
The system SHALL provide an Input component using Chakra UI v3 FormControl for form fields with labels, validation, and helper text.

#### Scenario: Input with label
- **WHEN** an Input is rendered with a label prop
- **THEN** a FormLabel is displayed above the input
- **AND** the label is associated with the input via htmlFor

#### Scenario: Required field indicator
- **WHEN** an Input has required=true and a label
- **THEN** a red asterisk is shown next to the label

#### Scenario: Error state
- **WHEN** an Input has an error prop
- **THEN** the input border is red
- **AND** a FormErrorMessage displays below the input
- **AND** aria-invalid is set to true

#### Scenario: Helper text
- **WHEN** an Input has helperText and no error
- **THEN** a FormHelperText displays below the input

---

### Requirement: Select Component
The system SHALL provide a Select component using Chakra UI v3 for dropdown selections with form control integration.

#### Scenario: Select with options
- **WHEN** a Select is rendered with an options array
- **THEN** each option is rendered as a selectable item

#### Scenario: Placeholder option
- **WHEN** a Select has a placeholder prop
- **THEN** a disabled placeholder option is shown as the first item

#### Scenario: Select error state
- **WHEN** a Select has an error prop
- **THEN** the select border is red
- **AND** a FormErrorMessage displays below

---

### Requirement: Modal Component
The system SHALL provide a Modal component using Chakra UI v3 for overlay dialogs with accessible behavior.

#### Scenario: Modal open/close
- **WHEN** a Modal has isOpen=true
- **THEN** the modal overlay and content are visible
- **AND** body scroll is prevented

#### Scenario: Modal close on escape
- **WHEN** a Modal is open and user presses Escape
- **THEN** the onClose callback is invoked

#### Scenario: Modal close on overlay click
- **WHEN** a Modal is open and user clicks the overlay
- **THEN** the onClose callback is invoked

#### Scenario: Modal size variants
- **WHEN** a Modal is rendered with size="sm", "md", "lg", or "xl"
- **THEN** the modal content has appropriate max-width

#### Scenario: Confirm modal variant
- **WHEN** a ConfirmModal is rendered
- **THEN** it displays title, message, and Cancel/Confirm buttons
- **AND** Confirm button can be styled as danger variant

---

### Requirement: Badge Component
The system SHALL provide a Badge component using Chakra UI v3 for status indicators and labels.

#### Scenario: Badge color variants
- **WHEN** a Badge is rendered with variant="success", "warning", "danger", or "info"
- **THEN** it displays with the corresponding color scheme

#### Scenario: StatusBadge for trade status
- **WHEN** a StatusBadge is rendered with status="Open", "Closed", "Expired", "Exercised", or "Lapsed"
- **THEN** it displays with the predefined status color

#### Scenario: DirectionBadge for trade direction
- **WHEN** a DirectionBadge is rendered with direction="Sell Put", "Sell Call", "Buy Put", or "Buy Call"
- **THEN** it displays with the predefined direction color

---

### Requirement: Toast Notifications
The system SHALL provide toast notification functionality using Chakra UI v3 useToast hook.

#### Scenario: Success toast
- **WHEN** toast.success(message) is called
- **THEN** a green success toast appears in the top-right corner
- **AND** auto-dismisses after 5 seconds

#### Scenario: Error toast
- **WHEN** toast.error(message) is called
- **THEN** a red error toast appears in the top-right corner

#### Scenario: Warning toast
- **WHEN** toast.warning(message) is called
- **THEN** an orange warning toast appears

#### Scenario: Info toast
- **WHEN** toast.info(message) is called
- **THEN** a blue info toast appears

#### Scenario: Toast dismissal
- **WHEN** user clicks the close button on a toast
- **THEN** the toast is immediately dismissed

## ADDED Requirements

### Requirement: Chakra UI Provider Setup
The system SHALL configure Chakra UI v3 as the primary component library with a custom dark theme.

#### Scenario: Provider initialization
- **WHEN** the application loads
- **THEN** ChakraProvider wraps the application with custom theme
- **AND** dark mode is the default color mode

#### Scenario: Theme consistency
- **WHEN** any Chakra component is rendered
- **THEN** it inherits the custom theme colors and styles
- **AND** matches the existing dark theme aesthetic

### Requirement: Accessible Form Controls
The system SHALL ensure all form components meet WCAG 2.1 AA accessibility standards.

#### Scenario: Label association
- **WHEN** a form field has a label
- **THEN** the label is programmatically associated with the input

#### Scenario: Error announcement
- **WHEN** a form field enters an error state
- **THEN** the error message is announced to screen readers
- **AND** aria-invalid is set appropriately

#### Scenario: Focus management
- **WHEN** a modal opens
- **THEN** focus is trapped within the modal
- **AND** focus returns to the trigger element on close
