# Tasks: Rebuild All Components and Pages with Chakra UI v3

## 1. Setup & Configuration

- [ ] 1.1 Install Chakra UI v3 dependencies
  ```bash
  npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion
  ```
- [ ] 1.2 Create Chakra UI theme configuration (`utils/theme.ts`)
- [ ] 1.3 Create ChakraProvider wrapper component (`components/providers/ChakraProvider.tsx`)
- [ ] 1.4 Update `app/layout.tsx` to include ChakraProvider
- [ ] 1.5 Configure dark mode as default in theme

## 2. UI Component Migration

### 2.1 Button Component
- [ ] 2.1.1 Create new `components/ui/Button.tsx` using Chakra Button
- [ ] 2.1.2 Map existing variants (primary, secondary, danger, ghost) to Chakra colorSchemes
- [ ] 2.1.3 Implement loading state using Chakra's `isLoading` prop
- [ ] 2.1.4 Test all button variants and sizes

### 2.2 Card Component
- [ ] 2.2.1 Create new `components/ui/Card.tsx` using Chakra Card
- [ ] 2.2.2 Implement CardHeader, CardTitle, CardContent, CardFooter exports
- [ ] 2.2.3 Apply dark theme styling via theme configuration
- [ ] 2.2.4 Test padding variants

### 2.3 Input Component
- [ ] 2.3.1 Create new `components/ui/Input.tsx` using Chakra Input + FormControl
- [ ] 2.3.2 Implement label support via FormLabel
- [ ] 2.3.3 Implement error state via FormErrorMessage
- [ ] 2.3.4 Implement helper text via FormHelperText
- [ ] 2.3.5 Test accessibility (aria attributes)

### 2.4 Select Component
- [ ] 2.4.1 Create new `components/ui/Select.tsx` using Chakra Select
- [ ] 2.4.2 Implement FormControl wrapper with label/error support
- [ ] 2.4.3 Support placeholder option
- [ ] 2.4.4 Test with existing option data structures

### 2.5 Modal Component
- [ ] 2.5.1 Create new `components/ui/Modal.tsx` using Chakra Modal
- [ ] 2.5.2 Implement size variants (sm, md, lg, xl)
- [ ] 2.5.3 Implement ConfirmModal variant
- [ ] 2.5.4 Test keyboard navigation (Escape to close)
- [ ] 2.5.5 Test focus trap behavior

### 2.6 Badge Component
- [ ] 2.6.1 Create new `components/ui/Badge.tsx` using Chakra Badge
- [ ] 2.6.2 Map existing variants to Chakra colorSchemes
- [ ] 2.6.3 Implement StatusBadge with trade status colors
- [ ] 2.6.4 Implement DirectionBadge with direction colors

### 2.7 Toast Component
- [ ] 2.7.1 Create new `components/ui/Toast.tsx` using Chakra useToast
- [ ] 2.7.2 Create toast helper functions (success, error, warning, info)
- [ ] 2.7.3 Configure toast positioning (top-right)
- [ ] 2.7.4 Remove ToastContainer (Chakra handles this)

## 3. Feature Component Migration

### 3.1 Auth Components
- [ ] 3.1.1 Update `AuthForm.tsx` to use Chakra components
- [ ] 3.1.2 Use VStack for form layout
- [ ] 3.1.3 Use Alert for error messages
- [ ] 3.1.4 Test form submission and validation display

### 3.2 Layout Components
- [ ] 3.2.1 Update `DashboardNav.tsx` to use Chakra components
- [ ] 3.2.2 Use Flex/HStack for navigation layout
- [ ] 3.2.3 Use IconButton for mobile menu (if applicable)
- [ ] 3.2.4 Apply theme-consistent colors

### 3.3 Trade Components
- [ ] 3.3.1 Update `TradeForm.tsx` to use Chakra form components
- [ ] 3.3.2 Use SimpleGrid for form field layout
- [ ] 3.3.3 Use Chakra NumberInput for numeric fields
- [ ] 3.3.4 Update `TradeCard.tsx` to use Chakra Card and layout components
- [ ] 3.3.5 Use HStack/VStack for content layout
- [ ] 3.3.6 Update `TradeFilters.tsx` to use Chakra Select
- [ ] 3.3.7 Use Wrap for responsive filter layout
- [ ] 3.3.8 Update `PNLSummary.tsx` to use Chakra Stat components
- [ ] 3.3.9 Use StatGroup, Stat, StatLabel, StatNumber, StatHelpText
- [ ] 3.3.10 Update `CloseTradeModal.tsx` to use Chakra Modal
- [ ] 3.3.11 Preserve PNL preview calculation display

## 4. Page Updates

- [ ] 4.1 Update `app/page.tsx` to use Chakra layout components
- [ ] 4.2 Use Container for max-width constraints
- [ ] 4.3 Use VStack/Box for page sections
- [ ] 4.4 Use Spinner for loading states
- [ ] 4.5 Use Center for centered content

## 5. Styling & Theme

- [ ] 5.1 Define color palette in theme (matching current dark theme)
- [ ] 5.2 Configure component default styles
- [ ] 5.3 Update `globals.css` - remove Tailwind component styles, keep base reset if needed
- [ ] 5.4 Test responsive breakpoints
- [ ] 5.5 Ensure consistent spacing scale

## 6. Cleanup

- [ ] 6.1 Remove unused Tailwind utility classes from components
- [ ] 6.2 Remove custom animation CSS (use Chakra/Framer Motion)
- [ ] 6.3 Update component exports/imports across the project
- [ ] 6.4 Review and remove any dead code

## 7. Testing & Validation

- [ ] 7.1 Test auth flow (login/signup forms)
- [ ] 7.2 Test trade CRUD operations
- [ ] 7.3 Test modal open/close behavior
- [ ] 7.4 Test toast notifications
- [ ] 7.5 Test responsive design on mobile/tablet/desktop
- [ ] 7.6 Test keyboard navigation and accessibility
- [ ] 7.7 Verify no console errors or warnings
- [ ] 7.8 Run build to ensure no TypeScript errors

## 8. Documentation

- [ ] 8.1 Update `openspec/project.md` with new UI framework info
- [ ] 8.2 Document theme customization approach
- [ ] 8.3 Add component usage examples (optional)
