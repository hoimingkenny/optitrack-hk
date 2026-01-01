# Change: Rebuild All Components and Pages with Chakra UI v3

## Why

The current UI implementation uses custom Tailwind CSS-based components that require significant maintenance overhead. Chakra UI v3 provides:
- A comprehensive, accessible component library out-of-the-box
- Built-in dark mode support with consistent theming
- Improved developer experience with composable components
- Better TypeScript support and type inference
- Reduced custom CSS and component code maintenance

## What Changes

### **BREAKING** - Complete UI Framework Migration
- Remove all custom UI components in `components/ui/`
- Replace Tailwind CSS utility classes with Chakra UI components
- Introduce Chakra UI Provider and theme configuration
- Update all consuming components to use Chakra UI equivalents

### Component Migrations
- **Button** → Chakra `Button` component
- **Card** → Chakra `Card`, `CardHeader`, `CardBody`, `CardFooter`
- **Input** → Chakra `Input` with `FormControl`, `FormLabel`, `FormErrorMessage`
- **Select** → Chakra `Select` or `NativeSelect`
- **Modal** → Chakra `Modal`, `ModalOverlay`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`
- **Badge** → Chakra `Badge` component
- **Toast** → Chakra `useToast` hook and `ToastProvider`

### Layout Updates
- Update `app/layout.tsx` to include `ChakraProvider`
- Configure custom theme extending Chakra's default theme
- Remove or significantly reduce `globals.css` Tailwind directives

### Feature Component Updates
- `AuthForm` - Migrate to Chakra form components
- `DashboardNav` - Migrate to Chakra navigation patterns
- `TradeForm` - Migrate to Chakra form components with validation
- `TradeCard` - Migrate to Chakra Card with styled content
- `TradeFilters` - Migrate to Chakra Select and Input
- `PNLSummary` - Migrate to Chakra StatGroup/Stat components
- `CloseTradeModal` - Migrate to Chakra Modal

## Impact

### Affected Specs
- `ui-components` - Complete rewrite of all UI primitives

### Affected Code
- `components/ui/*` - All 7 UI component files
- `components/auth/AuthForm.tsx`
- `components/layout/DashboardNav.tsx`
- `components/trades/*` - All 5 trade component files
- `app/layout.tsx` - Provider setup
- `app/page.tsx` - Component usage updates
- `app/globals.css` - Reduced/modified styles
- `package.json` - New dependencies

### New Dependencies
- `@chakra-ui/react` (v3.x)
- `@emotion/react`
- `@emotion/styled`
- `framer-motion`

### Removed Dependencies
- Potentially reduce Tailwind CSS usage (keep for utilities if needed)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Comprehensive testing of all components post-migration |
| Learning curve for Chakra UI v3 | Follow official migration guide and documentation |
| Performance impact | Chakra v3 has improved tree-shaking; monitor bundle size |
| Theme inconsistency | Define comprehensive theme configuration upfront |

## Success Criteria

1. All existing UI functionality preserved
2. Consistent dark theme across application
3. Improved accessibility (WCAG 2.1 AA compliance)
4. Reduced custom component code by ~60%
5. No visual regressions in key user flows
