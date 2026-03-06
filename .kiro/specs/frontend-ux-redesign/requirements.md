# Requirements Document

## Introduction

This document defines the requirements for the Frontend UX Redesign of the prospect-engine application. The redesign replaces the current flat, utilitarian interface with a spatial command-center layout built around three UX principles: narrative flow, progressive disclosure, and spatial memory. Requirements are derived from the approved design document and cover the design system foundation, navigation architecture, command palette, guided input wizard, prospect display components, and accessibility/performance concerns.

## Glossary

- **CommandCenter**: The primary workspace layout component that replaces the flat DemoExplorer tab navigation with a spatial layout containing a navigation rail, main content area, context panel, and status bar.
- **NavigationRail**: A vertical icon-based navigation component positioned on the left side of the CommandCenter, replacing the horizontal emoji tab bar.
- **ContextPanel**: A collapsible right-side sliding drawer that displays contextual detail for a selected prospect.
- **CommandBar**: A Cmd+K style command palette overlay providing fuzzy search across prospects, views, scenarios, and actions.
- **StatusBar**: A persistent bottom bar displaying live portfolio KPI metrics regardless of the active view.
- **LandingHero**: The redesigned immersive landing page with animated hero, interactive demo cards, and clear CTAs.
- **StepWizard**: A split-pane guided input wizard with form controls on the left and a live preview on the right, replacing the skeleton step components.
- **ProspectCard**: A rich, information-dense card component displaying decision state, key metrics, and mini-visualizations for a prospect.
- **AnimatedMetricCard**: A KPI display component that animates count-up on mount and smooth transitions on value changes.
- **DesignTokens**: The design system foundation defining semantic colors, typography, spacing, elevation, animation curves, and border radii.
- **ViewId**: An enumerated type representing the five main views: map, subsurface, optimizer, scenarios, summary.
- **UserPreferences**: A data model persisted to localStorage containing user layout and display preferences.
- **ValidationResult**: An object returned by step validation containing a valid flag, an errors array, and a warnings array.
- **DemoData**: The pre-computed demo dataset containing input prospects, simulation results, and 3D scene data.
- **CommandAction**: A discriminated union type representing actions executable from the CommandBar (navigate, select-prospect, switch-scenario, export, toggle-panel).

## Requirements

### Requirement 1: Design System Foundation

**User Story:** As a developer, I want a centralized design token system, so that all UI components share a consistent visual language and theme changes propagate automatically.

#### Acceptance Criteria

1. THE DesignTokens SHALL define semantic surface colors with at least four hierarchy levels: base, raised, overlay, and interactive.
2. THE DesignTokens SHALL define a decision color palette with base, glow, and muted variants for each of the four decision types: drill, farm-out, divest, and defer.
3. THE DesignTokens SHALL define a typography scale with at least six levels: display, heading, subheading, body, caption, and mono.
4. THE DesignTokens SHALL define a spacing scale based on a 4px base unit.
5. THE DesignTokens SHALL define animation timing tokens for fast (150ms), normal (250ms), and slow (400ms) durations plus spring and ease curves.
6. THE DesignTokens SHALL define border radius tokens at sm (6px), md (10px), lg (16px), and full (9999px) levels.

### Requirement 2: CommandCenter Layout

**User Story:** As a user, I want a spatial workspace layout with persistent navigation and contextual panels, so that I always know where I am and can access related information without losing context.

#### Acceptance Criteria

1. WHEN the user launches a demo, THE CommandCenter SHALL render the NavigationRail, main content area, ContextPanel, and StatusBar in a spatial layout.
2. WHEN the user navigates to a view, THE CommandCenter SHALL display the corresponding view component in the main content area.
3. THE CommandCenter SHALL support five views identified by ViewId: map, subsurface, optimizer, scenarios, and summary.
4. WHEN a view transition completes, THE CommandCenter SHALL set the activeView state to the target ViewId and render the corresponding view component.
5. WHEN the user triggers a view change during an active transition, THE CommandCenter SHALL queue the latest navigation request and discard intermediate requests.

### Requirement 3: View Transitions

**User Story:** As a user, I want smooth animated transitions between views, so that navigation feels fluid and I maintain spatial awareness of the interface.

#### Acceptance Criteria

1. WHEN a view transition is initiated, THE CommandCenter SHALL follow the phase sequence idle → exit → enter → idle without skipping phases.
2. WHILE a transition is in the exit or enter phase, THE CommandCenter SHALL prevent concurrent transition initiation.
3. WHEN the user has prefers-reduced-motion enabled, THE CommandCenter SHALL skip all transition animations and apply view changes instantly.
4. THE CommandCenter SHALL determine transition direction (forward or backward) based on the index positions of the source and target views in the NavigationRail order.

### Requirement 4: NavigationRail

**User Story:** As a user, I want a vertical icon-based navigation bar with keyboard shortcuts, so that I can quickly switch between views using either mouse or keyboard.

#### Acceptance Criteria

1. THE NavigationRail SHALL render SVG icons for each of the five views with an active state indicator on the currently selected view.
2. WHEN the user hovers over a navigation item, THE NavigationRail SHALL display a tooltip showing the view label and its keyboard shortcut.
3. WHEN the user presses a number key 1 through 5, THE CommandCenter SHALL navigate to the corresponding view in rail order.
4. WHEN the NavigationRail has alert data, THE NavigationRail SHALL display notification badges on the relevant navigation items.
5. WHEN the viewport width is less than 768px, THE NavigationRail SHALL collapse to icon-only mode without labels.

### Requirement 5: ContextPanel

**User Story:** As a user, I want a sliding detail drawer that shows prospect information, so that I can inspect prospect details without leaving my current view.

#### Acceptance Criteria

1. WHEN the user selects a prospect, THE ContextPanel SHALL slide open with a spring animation and display the selected prospect's detail including mini-charts.
2. WHEN the ContextPanel displays a prospect, THE ContextPanel SHALL only reference prospect IDs that exist in the current DemoData dataset.
3. WHEN the user presses up or down arrow keys while the ContextPanel is focused, THE ContextPanel SHALL navigate to the previous or next prospect in the list.
4. THE ContextPanel SHALL provide a resize handle allowing the user to adjust its width between 280px and 480px.
5. WHEN the viewport width is less than 1024px, THE ContextPanel SHALL auto-close to preserve main content space.
6. IF the user navigates to a prospect ID that does not exist in the current dataset, THEN THE ContextPanel SHALL display a "Prospect not found" message with a list of available prospects.

### Requirement 6: CommandBar

**User Story:** As a power user, I want a Cmd+K command palette with fuzzy search, so that I can quickly navigate, search prospects, switch scenarios, and trigger actions without using the mouse.

#### Acceptance Criteria

1. WHEN the user presses Cmd+K (or Ctrl+K), THE CommandBar SHALL open as a modal overlay with backdrop blur.
2. WHEN the user types a search query, THE CommandBar SHALL perform fuzzy matching against all command items and return results sorted by relevance score.
3. WHEN the search query is empty, THE CommandBar SHALL display recent actions first followed by top items per category.
4. THE CommandBar SHALL return at most 15 results for any search query.
5. THE CommandBar SHALL group results by category: Navigation, Prospects, Scenarios, and Actions.
6. WHEN the user selects a command item, THE CommandBar SHALL execute the corresponding CommandAction and close the overlay.
7. THE CommandBar SHALL support keyboard navigation through results using arrow keys and Enter to select.
8. WHEN a CommandItem label contains the search query as a case-insensitive substring, THE CommandBar SHALL include that item in the results with a positive relevance score.

### Requirement 7: StatusBar

**User Story:** As a user, I want persistent portfolio KPIs visible at all times, so that I maintain awareness of key metrics regardless of which view I am exploring.

#### Acceptance Criteria

1. THE StatusBar SHALL display portfolio NPV, capital deployed, capital remaining, prospect count, active scenario name, and risk level.
2. WHEN a metric value changes, THE StatusBar SHALL animate the transition from the old value to the new value using a count-up animation.
3. THE StatusBar SHALL color-code the risk level indicator using semantic data colors: positive for low, highlight for moderate, and negative for high risk.
4. THE StatusBar SHALL remain visible at all viewport sizes within the CommandCenter.

### Requirement 8: LandingHero

**User Story:** As a new user, I want an immersive landing page that communicates the tool's capabilities, so that I understand the value proposition and can quickly start exploring.

#### Acceptance Criteria

1. WHEN the user arrives at the application, THE LandingHero SHALL render an animated hero section with a background visual suggesting data flow.
2. THE LandingHero SHALL display interactive demo cards that show a live mini-chart preview on hover.
3. THE LandingHero SHALL present a clear value proposition hierarchy: headline, subtext, call-to-action buttons, and demo cards.
4. WHEN the user clicks "Launch Demo", THE LandingHero SHALL trigger navigation to the CommandCenter with the selected demo dataset.
5. WHEN the user clicks "Start New Analysis", THE LandingHero SHALL trigger navigation to the StepWizard.
6. THE LandingHero SHALL be fully keyboard accessible with proper focus management across all interactive elements.

### Requirement 9: StepWizard Guided Input Flow

**User Story:** As a user, I want a rich guided input wizard with live preview, so that I can build my portfolio step by step while seeing the impact of my choices in real time.

#### Acceptance Criteria

1. THE StepWizard SHALL render a split-pane layout with form controls on the left and a live preview on the right.
2. WHEN the user modifies form inputs, THE StepWizard SHALL update the live preview within 300ms (debounced).
3. WHEN the user clicks "Next", THE StepWizard SHALL validate the current step and prevent advancement if validation fails.
4. WHEN validation fails, THE StepWizard SHALL display inline error messages referencing the specific fields that failed validation.
5. WHEN validation produces warnings but no errors, THE StepWizard SHALL allow advancement while displaying the warning messages.
6. THE StepWizard SHALL display a progress breadcrumb showing completed, current, and upcoming steps.
7. WHEN the user clicks a completed step in the breadcrumb, THE StepWizard SHALL navigate back to that step with its previously entered data intact.
8. WHEN all five steps are completed and the user confirms, THE StepWizard SHALL submit the portfolio data to the backend API for simulation.
9. IF the backend API returns an error during simulation, THEN THE StepWizard SHALL display an inline error message and preserve all form state for retry.

### Requirement 10: Step Validation Rules

**User Story:** As a user, I want clear validation feedback at each wizard step, so that I know exactly what needs to be corrected before proceeding.

#### Acceptance Criteria

1. WHEN validating Step 0 (Portfolio Setup), THE StepWizard SHALL require at least one prospect and a positive budget value.
2. WHEN validating Step 1 (Prospect Definition), THE StepWizard SHALL require a non-empty name, latitude in [-90, 90], and longitude in [-180, 180] for each prospect.
3. WHEN validating Step 1 with only one prospect, THE StepWizard SHALL produce a warning that portfolio optimization works best with three or more prospects.
4. WHEN validating Step 2 (Commodity Pricing), THE StepWizard SHALL require at least one selected price scenario.
5. WHEN validating Step 3 (Budget & Constraints), THE StepWizard SHALL require the discount rate to be between 0 and 1 inclusive.
6. THE StepWizard SHALL return valid as true if and only if the errors array is empty for the validated step.

### Requirement 11: ProspectCard Display

**User Story:** As a user, I want rich prospect cards showing decision state and key metrics at a glance, so that I can quickly assess and compare prospects.

#### Acceptance Criteria

1. THE ProspectCard SHALL display a decision color accent bar on the left edge using the corresponding decision color from DesignTokens.
2. THE ProspectCard SHALL display an inline NPV sparkline and a probability badge with color coding.
3. WHEN the user hovers over a ProspectCard, THE ProspectCard SHALL increase its elevation and show a subtle glow effect.
4. WHEN a ProspectCard is selected, THE ProspectCard SHALL display a ring highlight in the focus color.
5. WHEN the compact prop is true, THE ProspectCard SHALL render in a condensed list-item layout; otherwise it SHALL render in an expanded grid layout.

### Requirement 12: AnimatedMetricCard

**User Story:** As a user, I want animated KPI cards that visually communicate value changes, so that I can immediately notice when metrics update.

#### Acceptance Criteria

1. WHEN the AnimatedMetricCard mounts, THE AnimatedMetricCard SHALL animate the displayed value from zero to the target value using an ease-out-expo curve.
2. WHEN the target value changes, THE AnimatedMetricCard SHALL smoothly animate from the current displayed value to the new target value.
3. THE AnimatedMetricCard SHALL format values according to the specified format: currency, percentage, or number.
4. WHEN a trend prop is provided, THE AnimatedMetricCard SHALL display a directional arrow and magnitude delta.
5. WHEN the user has prefers-reduced-motion enabled, THE AnimatedMetricCard SHALL display the target value immediately without animation.
6. WHEN the animation duration elapses, THE AnimatedMetricCard SHALL display a value equal to the target value within floating-point precision.

### Requirement 13: Keyboard Shortcut Safety

**User Story:** As a user, I want keyboard shortcuts that do not interfere with text entry, so that I can type in input fields without accidentally triggering navigation.

#### Acceptance Criteria

1. WHILE the user's focus is inside an input, textarea, or contenteditable element, THE CommandCenter SHALL suppress all view navigation keyboard shortcuts.
2. THE CommandCenter SHALL not override default browser shortcuts including Cmd+C, Cmd+V, Cmd+Z, and Cmd+A.
3. WHEN keyboard shortcuts are disabled via the enabled flag, THE CommandCenter SHALL remove all keyboard event listeners.

### Requirement 14: User Preferences Persistence

**User Story:** As a returning user, I want my layout preferences saved between sessions, so that I do not have to reconfigure the interface each time I visit.

#### Acceptance Criteria

1. WHEN the user updates a preference, THE UserPreferences system SHALL persist the updated value to localStorage immediately.
2. WHEN the application loads, THE UserPreferences system SHALL read stored preferences from localStorage and apply them.
3. IF localStorage contains invalid or malformed preference values, THEN THE UserPreferences system SHALL replace them with default values.
4. THE UserPreferences system SHALL clamp contextPanelWidth to the range [280, 480] on every read and write.
5. WHEN the application loads, THE UserPreferences system SHALL initialize animationsReduced based on the system prefers-reduced-motion media query.
6. IF localStorage is unavailable, THEN THE UserPreferences system SHALL fall back to in-memory storage for the current session.

### Requirement 15: Accessibility and Reduced Motion

**User Story:** As a user with motion sensitivity, I want the interface to respect my system accessibility settings, so that animations do not cause discomfort.

#### Acceptance Criteria

1. WHEN the system prefers-reduced-motion media query matches, THE application SHALL replace all animated transitions with instant state changes.
2. THE LandingHero SHALL be navigable using keyboard Tab and Enter keys with visible focus indicators on all interactive elements.
3. THE CommandBar SHALL be fully operable using keyboard-only navigation including arrow keys for result selection and Escape to close.

### Requirement 16: Error Handling

**User Story:** As a user, I want graceful error handling throughout the interface, so that failures do not result in a broken or unresponsive application.

#### Acceptance Criteria

1. IF demo data fails to load, THEN THE application SHALL display an error boundary with an "Unable to load demo data" message and a retry button.
2. IF a retry to load demo data fails, THEN THE application SHALL navigate the user back to the LandingHero.
3. IF a view transition is interrupted by rapid navigation, THEN THE CommandCenter SHALL complete the current transition and then start the most recently requested transition.
4. IF the backend API returns an error during the StepWizard simulation step, THEN THE StepWizard SHALL display the error message inline and preserve all form state.

### Requirement 17: Performance and Responsive Layout

**User Story:** As a user, I want a responsive, performant interface that adapts to my screen size, so that the application is usable on a range of devices and remains smooth during interaction.

#### Acceptance Criteria

1. THE CommandCenter SHALL lazy-load each view component using React.lazy with Suspense boundaries so that only the active view's code is loaded.
2. THE CommandCenter SHALL use CSS transform and opacity properties for all animations to ensure GPU-composited rendering.
3. WHEN a prospect list contains more than 20 items, THE application SHALL use virtualized rendering for the list.
4. THE StepWizard SHALL debounce live preview updates at 300ms to prevent excessive re-renders during rapid input.
5. WHEN the viewport width is less than 768px, THE NavigationRail SHALL collapse to icon-only mode.
6. WHEN the viewport width is less than 1024px, THE ContextPanel SHALL auto-close.
