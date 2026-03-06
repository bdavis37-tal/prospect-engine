# Implementation Plan: Frontend UX Redesign

## Overview

This plan transforms the prospect-engine frontend from a flat, utilitarian interface into a spatial command-center layout. Implementation proceeds bottom-up: design tokens first, then core layout components, then interactive features, then the guided wizard, and finally integration wiring. Each task builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Design System Foundation — DesignTokens and Tailwind Config
  - [x] 1.1 Extend `frontend/tailwind.config.ts` with semantic design tokens
    - Add semantic surface colors (base, raised, overlay, interactive, borders)
    - Add decision color palette (drill, farmOut, divest, defer) with base/glow/muted variants
    - Add typography scale (display, heading, subheading, body, caption, mono)
    - Add spacing scale based on 4px unit
    - Add animation timing tokens (fast 150ms, normal 250ms, slow 400ms, spring, ease curves)
    - Add border radius tokens (sm 6px, md 10px, lg 16px, full 9999px)
    - Add elevation shadow tokens (low, medium, high)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Create `frontend/src/styles/tokens.ts` exporting typed DesignTokens object
    - Export TypeScript constants matching the Tailwind config for use in JS/D3 contexts
    - Export animation curve values for framer-motion usage
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.3 Update `frontend/src/styles/globals.css` with CSS custom properties
    - Define CSS variables for all design tokens as a fallback layer
    - Set up `prefers-reduced-motion` media query overrides for animation tokens
    - _Requirements: 1.5, 15.1_

  - [ ]* 1.4 Write unit tests for design token validation
    - Verify all required color, spacing, typography, and animation tokens are defined
    - Verify decision palette has all four decision types with base/glow/muted
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Install new dependencies
  - Run `npm install framer-motion cmdk @radix-ui/react-tooltip @tanstack/react-virtual` in `frontend/`
  - _Requirements: Design Dependencies section_

- [x] 3. Core Types and Data Models
  - [x] 3.1 Create `frontend/src/types/command-center.ts` with shared types
    - Define `ViewId`, `CommandCenterState`, `ViewTransitionState`, `NavItem`, `CommandAction`, `CommandItem` types
    - Define `UserPreferences` interface with validation constraints documented in JSDoc
    - Define `ValidationResult`, `StepConfig`, `EnhancedPortfolioState` types
    - _Requirements: 2.3, 3.1, 3.4, 6.5, 9.1, 10.6, 14.4_

  - [ ]* 3.2 Write property test: UserPreferences contextPanelWidth clamping
    - **Property 8 (partial): contextPanelWidth clamping**
    - For any numeric value passed to `updatePreference('contextPanelWidth', v)`, the stored value is always in [280, 480]
    - **Validates: Requirements 14.4**

- [x] 4. Checkpoint — Design system and types
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Core Hooks
  - [x] 5.1 Create `frontend/src/hooks/useUserPreferences.ts`
    - Implement localStorage read/write with JSON parse/stringify
    - Clamp `contextPanelWidth` to [280, 480] on every read and write
    - Initialize `animationsReduced` from `prefers-reduced-motion` media query
    - Fall back to in-memory storage if localStorage is unavailable
    - Replace invalid/malformed stored values with defaults
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 5.2 Write unit tests for useUserPreferences
    - Test localStorage persistence round-trip
    - Test clamping of contextPanelWidth
    - Test fallback to defaults on malformed data
    - Test in-memory fallback when localStorage throws
    - **Property 8: User Preferences Persistence**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6**

  - [x] 5.3 Create `frontend/src/hooks/useViewTransition.ts`
    - Implement transition state machine: idle → exit → enter → idle
    - Prevent concurrent transitions (no-op if `isTransitioning` is true)
    - Determine direction (forward/backward) from ViewId index positions
    - Respect `prefers-reduced-motion` — instant switch when enabled
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 5.4 Write property test: Transition state machine integrity
    - **Property 2: Transition State Machine Integrity**
    - For any sequence of navigate calls, the phase always follows idle → exit → enter → idle; no concurrent transitions
    - **Validates: Requirements 3.1, 3.2**

  - [x] 5.5 Create `frontend/src/hooks/useKeyboardShortcuts.ts`
    - Register keyboard event listeners for provided shortcut map
    - Suppress shortcuts when focus is inside input/textarea/contenteditable
    - Do not override browser defaults (Cmd+C, Cmd+V, Cmd+Z, Cmd+A)
    - Clean up listeners when `enabled` becomes false or on unmount
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 5.6 Write unit tests for useKeyboardShortcuts
    - Test that shortcuts fire on keypress
    - Test suppression inside input elements
    - Test cleanup on disable/unmount
    - **Property 6: Keyboard Shortcut Safety**
    - **Validates: Requirements 13.1, 13.2, 13.3**

  - [x] 5.7 Create `frontend/src/hooks/useAnimatedValue.ts`
    - Implement requestAnimationFrame-based count-up with easeOutExpo curve
    - Smoothly transition from current displayed value to new target on change
    - Return target immediately when `prefersReducedMotion` is true
    - _Requirements: 12.1, 12.2, 12.5, 12.6_

  - [ ]* 5.8 Write property test: Animated value convergence
    - **Property 9: Metric Animation Convergence**
    - For any target value and duration, the displayed value equals target (within epsilon) after duration elapses
    - **Validates: Requirements 12.1, 12.2, 12.6**

  - [x] 5.9 Create `frontend/src/hooks/useCommandCenter.ts`
    - Manage activeView, contextPanel state, commandBarOpen, activeScenario
    - Expose memoized navigate, toggleCommandBar, openContextPanel callbacks
    - Wire keyboard shortcuts (1-5 for views, Cmd+K for command bar)
    - Queue navigation requests during active transitions
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.3_

- [x] 6. Checkpoint — Core hooks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. NavigationRail Component
  - [x] 7.1 Create `frontend/src/components/layout/NavigationRail.tsx`
    - Render SVG icons for each of the five ViewId views with active state indicator
    - Animate active indicator sliding between items using framer-motion
    - Show tooltip with view label and keyboard shortcut on hover (using @radix-ui/react-tooltip)
    - Display notification badges when `hasAlerts` or `prospectCount` warrants
    - Collapse to icon-only mode at viewport width < 768px
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 17.5_

  - [ ]* 7.2 Write unit tests for NavigationRail
    - Test active state rendering for each view
    - Test badge display logic
    - Test icon-only collapse at narrow viewport
    - _Requirements: 4.1, 4.4, 4.5_

- [x] 8. StatusBar Component
  - [x] 8.1 Create `frontend/src/components/layout/StatusBar.tsx`
    - Display portfolio NPV, capital deployed, capital remaining, prospect count, active scenario, risk level
    - Use `useAnimatedValue` for count-up transitions on metric changes
    - Color-code risk level: positive (low), highlight (moderate), negative (high)
    - Responsive compact layout that remains visible at all viewport sizes
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 8.2 Write unit tests for StatusBar
    - Test that all six metrics render
    - Test risk level color coding
    - _Requirements: 7.1, 7.3_

- [x] 9. AnimatedMetricCard Component
  - [x] 9.1 Create `frontend/src/components/shared/AnimatedMetricCard.tsx`
    - Animate count-up from zero on mount using `useAnimatedValue`
    - Smooth transition on value changes
    - Format values as currency, percentage, or number
    - Display trend arrow and magnitude delta when trend prop provided
    - Respect `prefers-reduced-motion` — display target immediately
    - Support sm/md/lg sizing
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 9.2 Write unit tests for AnimatedMetricCard
    - Test currency/percentage/number formatting
    - Test trend indicator rendering
    - Test reduced motion behavior
    - _Requirements: 12.3, 12.4, 12.5_

- [x] 10. ProspectCard Component
  - [x] 10.1 Create `frontend/src/components/shared/ProspectCard.tsx`
    - Decision color accent bar on left edge using DesignTokens decision palette
    - Inline NPV sparkline and probability badge with color coding
    - Hover state with elevation change and glow via framer-motion
    - Selected state with ring highlight in focus color
    - Compact mode (list-item) vs expanded mode (grid) based on `compact` prop
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 10.2 Write unit tests for ProspectCard
    - Test decision color accent rendering for each decision type
    - Test compact vs expanded layout
    - Test click handler invocation
    - _Requirements: 11.1, 11.5_

- [x] 11. Checkpoint — Shared components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. ContextPanel Component
  - [x] 12.1 Create `frontend/src/components/layout/ContextPanel.tsx`
    - Slide in/out with spring animation via framer-motion
    - Display prospect mini-charts (NPV histogram sparkline, cash flow sparkline)
    - Validate prospectId exists in DemoData; show "Prospect not found" with available list if invalid
    - Arrow key navigation between prospects when panel is focused
    - Resize handle for user-adjustable width (clamped 280-480px via useUserPreferences)
    - Auto-close at viewport width < 1024px
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 17.6_

  - [ ]* 12.2 Write property test: Context panel prospect validity
    - **Property 3: Context Panel Prospect Validity**
    - If contextPanel.prospectId is non-null, it must exist in demoData.input.prospects
    - **Validates: Requirements 5.2**

  - [ ]* 12.3 Write unit tests for ContextPanel
    - Test slide animation open/close
    - Test "Prospect not found" display for invalid ID
    - Test arrow key navigation between prospects
    - _Requirements: 5.1, 5.3, 5.6_

- [x] 13. CommandBar Component
  - [x] 13.1 Create `frontend/src/lib/commandSearch.ts` with `searchCommands` function
    - Implement fuzzy search with scoring: prefix (100), word boundary (75), substring (50), category (25), fuzzy char match (10)
    - Boost recent actions by recency index
    - Return at most 15 results sorted by score
    - Return recent actions + top items when query is empty
    - _Requirements: 6.2, 6.3, 6.4, 6.8_

  - [ ]* 13.2 Write property tests for searchCommands
    - **Property 4: Command Bar Search Completeness**
    - For any query q, if any item's label contains q as a case-insensitive substring, that item appears in results with score > 0
    - For any input, results length ≤ 15
    - For empty query with non-empty items, results are non-empty
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.8**

  - [x] 13.3 Create `frontend/src/components/layout/CommandBar.tsx`
    - Use `cmdk` library for accessible command palette structure
    - Open as modal overlay with backdrop blur on Cmd+K / Ctrl+K
    - Group results by category: Navigation, Prospects, Scenarios, Actions
    - Keyboard navigation with arrow keys and Enter to select
    - Execute CommandAction on selection and close overlay
    - _Requirements: 6.1, 6.5, 6.6, 6.7_

  - [ ]* 13.4 Write unit tests for CommandBar
    - Test open/close via Cmd+K
    - Test keyboard navigation through results
    - Test action execution on selection
    - _Requirements: 6.1, 6.6, 6.7_

- [x] 14. Checkpoint — Interactive components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. CommandCenter Layout
  - [x] 15.1 Create `frontend/src/components/layout/CommandCenter.tsx`
    - Compose NavigationRail, main content area, ContextPanel, StatusBar in spatial layout
    - Lazy-load each view component with React.lazy + Suspense boundaries
    - Render active view in main panel with crossfade transitions via useViewTransition
    - Wire useCommandCenter hook for state management
    - Use CSS transform and opacity for GPU-composited animations
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 17.1, 17.2_

  - [ ]* 15.2 Write property test: Navigation consistency
    - **Property 1: Navigation Consistency**
    - For any ViewId, after navigate(view) completes, activeView === view and the corresponding view component is rendered
    - **Validates: Requirements 2.2, 2.4**

  - [ ]* 15.3 Write integration tests for CommandCenter
    - Test navigation between all 5 views
    - Test context panel open/close with prospect selection
    - Test command bar open and action execution
    - Test rapid navigation queuing (error scenario 3)
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 16.3_

- [x] 16. LandingHero Component
  - [x] 16.1 Create `frontend/src/components/layout/LandingHero.tsx`
    - Animated hero section with subtle particle/grid background using framer-motion
    - Interactive demo cards with hover preview showing live mini-chart
    - Value proposition hierarchy: headline → subtext → CTAs → demo cards
    - "Launch Demo" triggers navigation to CommandCenter with selected dataset
    - "Start New Analysis" triggers navigation to StepWizard
    - Full keyboard accessibility with proper focus management and visible focus indicators
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 15.2_

  - [ ]* 16.2 Write unit tests for LandingHero
    - Test demo card click triggers correct callback
    - Test keyboard navigation through interactive elements
    - _Requirements: 8.4, 8.5, 8.6_

- [x] 17. StepWizard and Validation
  - [x] 17.1 Create `frontend/src/lib/stepValidation.ts` with `validateStep` function
    - Implement validation rules for all 5 steps per design specification
    - Step 0: require ≥1 prospect and positive budget
    - Step 1: require non-empty name, valid lat/lon for each prospect; warn if only 1 prospect
    - Step 2: require ≥1 selected price scenario
    - Step 3: require discount rate in [0, 1]
    - Step 4: no validation (confirmation only)
    - Return `{ valid, errors, warnings }` — valid is true iff errors is empty
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 17.2 Write property tests for validateStep
    - **Property 5: Step Wizard Progression Guard**
    - For any step and state, `valid === true` iff `errors.length === 0`
    - For any step and state, `valid === false` implies `errors.length > 0`
    - **Validates: Requirements 10.6**

  - [x] 17.3 Create `frontend/src/components/flow/StepWizard.tsx`
    - Split-pane layout: form controls left, live preview right
    - Progress breadcrumb showing completed/current/upcoming steps
    - Animated step transitions via framer-motion
    - Validate on "Next" click; prevent advancement if validation fails
    - Display inline error messages for failed fields; show warnings without blocking
    - Allow clicking completed steps in breadcrumb to navigate back with data intact
    - Debounce live preview updates at 300ms
    - On final step completion, POST to backend API for simulation
    - Display inline error on API failure, preserve form state for retry
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 16.4, 17.4_

  - [ ]* 17.4 Write unit tests for StepWizard
    - Test step advancement blocked on validation failure
    - Test breadcrumb navigation back to completed step
    - Test inline error display
    - Test warning display without blocking advancement
    - _Requirements: 9.3, 9.4, 9.5, 9.7_

- [x] 18. Checkpoint — All major components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Error Boundaries and Error Handling
  - [x] 19.1 Create `frontend/src/components/shared/DemoErrorBoundary.tsx`
    - Catch demo data load failures and render "Unable to load demo data" with retry button
    - On retry failure, navigate user back to LandingHero
    - _Requirements: 16.1, 16.2_

  - [x] 19.2 Add error handling to CommandCenter for rapid navigation
    - Complete current transition before starting most recently requested transition
    - Discard intermediate navigation requests
    - _Requirements: 16.3_

- [x] 20. Virtualized Prospect List
  - [x] 20.1 Implement virtualized rendering for prospect lists using @tanstack/react-virtual
    - Apply virtualization when prospect list contains > 20 items
    - _Requirements: 17.3_

- [x] 21. App Shell Integration and Wiring
  - [x] 21.1 Update `frontend/src/App.tsx` to wire new components
    - Replace LandingPage with LandingHero
    - Replace DemoExplorer with CommandCenter
    - Wire GuidedInput flow to use StepWizard
    - Wrap demo views in DemoErrorBoundary
    - Ensure routing between landing → demo → wizard flows
    - _Requirements: 2.1, 8.4, 8.5, 9.8_

  - [x] 21.2 Update `frontend/src/components/layout/AppShell.tsx`
    - Integrate compact header with scenario selector and command bar trigger
    - Wire keyboard shortcut context at app level
    - _Requirements: 2.1, 4.3, 6.1_

- [ ] 22. Responsive Layout Verification
  - [ ]* 22.1 Write integration tests for responsive breakpoints
    - Test NavigationRail collapses to icon-only at < 768px
    - Test ContextPanel auto-closes at < 1024px
    - Test StatusBar remains visible at all sizes
    - **Property 10: Responsive Layout Integrity**
    - **Validates: Requirements 4.5, 5.5, 7.4, 17.5, 17.6**

- [ ] 23. Accessibility Audit
  - [ ]* 23.1 Write accessibility tests
    - Test reduced motion: all animations replaced with instant changes when prefers-reduced-motion matches
    - Test LandingHero keyboard Tab/Enter navigation with visible focus indicators
    - Test CommandBar keyboard-only operation (arrow keys, Enter, Escape)
    - **Property 7: Accessibility Motion Respect**
    - **Validates: Requirements 15.1, 15.2, 15.3**

- [x] 24. Final Checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural breakpoints
- Property tests validate universal correctness properties from the design document
- The design uses TypeScript + React throughout — all implementations use this stack
- New dependencies (framer-motion, cmdk, @radix-ui/react-tooltip, @tanstack/react-virtual) are installed in task 2
- Existing view components (DemoPortfolioMap, SubsurfaceView, etc.) are preserved and lazy-loaded into the new CommandCenter
