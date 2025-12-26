# Design: Chakra UI v3 Migration

## Context

OptiTrack HK currently uses custom Tailwind CSS-based UI components. This migration moves to Chakra UI v3 to leverage a mature, accessible component library while maintaining the existing dark theme aesthetic.

### Stakeholders
- Developers maintaining the codebase
- End users (no visible changes expected, improved accessibility)

### Constraints
- Must maintain React 19 compatibility
- Must preserve all existing functionality
- Dark theme must remain the default
- No regressions in user experience

## Goals / Non-Goals

### Goals
- Replace custom UI components with Chakra UI equivalents
- Improve accessibility compliance (WCAG 2.1 AA)
- Reduce maintenance burden of custom components
- Establish consistent theming system
- Maintain current visual design language

### Non-Goals
- Redesigning the UI/UX
- Adding new features during migration
- Supporting light mode (can be added later)
- Migrating away from Next.js App Router patterns

## Decisions

### Decision 1: Use Chakra UI v3 (not v2)
**What**: Adopt Chakra UI version 3.x
**Why**: 
- Native React 19 support
- Improved performance with better tree-shaking
- Modern API design
- Active development and community support

**Alternatives considered**:
- Chakra UI v2: Less compatible with React 19, older API
- Radix UI + custom styling: More flexibility but higher maintenance
- shadcn/ui: Good option but requires more custom styling setup

### Decision 2: Keep Tailwind for Utilities
**What**: Retain Tailwind CSS for utility classes alongside Chakra
**Why**:
- Chakra handles component styling
- Tailwind useful for one-off spacing/layout adjustments
- Gradual migration possible without removing all Tailwind

### Decision 3: Custom Theme Configuration
**What**: Create a comprehensive theme file extending Chakra defaults
**Why**:
- Match existing dark theme colors (gray-800, gray-900, etc.)
- Define consistent color schemes for variants
- Single source of truth for design tokens

### Decision 4: Wrapper Components for API Compatibility
**What**: Create thin wrapper components that maintain current API signatures where beneficial
**Why**:
- Minimize changes to consuming components
- Allow gradual migration
- Preserve custom props like `isLoading` on buttons

## Technical Approach

### Theme Structure
```typescript
// utils/theme.ts
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    gray: {
      // Match existing Tailwind gray scale
      800: '#1f2937',
      900: '#111827',
    },
  },
  components: {
    Button: {
      variants: {
        primary: { bg: 'blue.600', _hover: { bg: 'blue.700' } },
        secondary: { bg: 'gray.700', _hover: { bg: 'gray.600' } },
        danger: { bg: 'red.600', _hover: { bg: 'red.700' } },
        ghost: { bg: 'transparent', _hover: { bg: 'gray.800' } },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'gray.900',
          borderColor: 'gray.800',
          borderWidth: '1px',
          borderRadius: 'xl',
        },
      },
    },
  },
});
```

### Provider Setup
```typescript
// app/layout.tsx
import { ChakraProvider } from '@chakra-ui/react';
import theme from '@/utils/theme';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider theme={theme}>
          {children}
        </ChakraProvider>
      </body>
    </html>
  );
}
```

### Component Migration Pattern
```typescript
// Example: Button migration
// Before (custom):
<Button variant="primary" isLoading={loading}>Submit</Button>

// After (Chakra):
<Button colorScheme="blue" isLoading={loading}>Submit</Button>
// Or with custom variant:
<Button variant="primary" isLoading={loading}>Submit</Button>
```

## Risks / Trade-offs

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Bundle size increase | Medium | Low | Chakra v3 has improved tree-shaking; monitor with `next build` |
| Styling inconsistencies | Medium | Medium | Define comprehensive theme upfront; visual regression testing |
| Breaking changes in consuming code | High | Medium | Create wrapper components; thorough testing |
| Learning curve | Low | Low | Well-documented library; team familiarity |

## Migration Plan

### Phase 1: Setup (Day 1)
1. Install dependencies
2. Create theme configuration
3. Set up ChakraProvider in layout

### Phase 2: Core UI Components (Days 2-3)
1. Migrate Button, Input, Select
2. Migrate Card, Badge
3. Migrate Modal, Toast

### Phase 3: Feature Components (Days 4-5)
1. Update AuthForm
2. Update DashboardNav
3. Update Trade components

### Phase 4: Cleanup & Testing (Day 6)
1. Remove unused code
2. Full application testing
3. Documentation updates

### Rollback Plan
- Keep original component files in a backup branch
- Feature flag to switch between implementations (if needed)
- Revert commit if critical issues discovered

## Open Questions

- [ ] Should we create a Storybook for component documentation?
- [ ] Do we need to support light mode in the future?
- [ ] Should form validation use Chakra's built-in validation or keep current approach?
