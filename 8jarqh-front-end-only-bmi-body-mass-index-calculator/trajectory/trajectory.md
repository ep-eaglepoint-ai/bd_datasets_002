# Trajectory: Actions Taken to Build a Front-End BMI Calculator

This document outlines the specific architectural and engineering actions taken to ensure accurate BMI calculation, seamless unit conversion, comprehensive input validation, and persistent local data storage for the BMI calculator application.

## Action 1: Implement Seamless Unit Conversion Without Data Loss
**Issue**: Most BMI calculators reset input values when switching between Metric and Imperial units, forcing users to re-enter data and creating a poor user experience.

*   **Action Taken**: Implemented a bidirectional unit conversion system that preserves user input values during unit system toggles.
    *   Created conversion functions (`cmToInches`, `inchesToCm`, `kgToLbs`, `lbsToKg`) using precise conversion factors (2.54 cm/inch, 2.20462 lbs/kg).
    *   Developed a `toggleUnit()` function that automatically converts existing height and weight values before switching unit systems.
    *   For metric-to-imperial: Converts cm to feet/inches (floor division for feet, remainder for inches) and kg to lbs with 1-decimal precision.
    *   For imperial-to-metric: Combines feet and inches into total inches, converts to cm (rounded), and lbs to kg (rounded to 1 decimal).
    *   This ensures users never lose their entered values when switching units, meeting requirement #3.
*   **Reference**: 
    *   **[NIST Guide for the Use of the International System of Units](https://www.nist.gov/pml/special-publication-811)** - Standard conversion factors for length and mass.
    *   **[Vue 3 Composition API: Refs and Reactivity](https://vuejs.org/api/reactivity-core.html)** - Used reactive refs to maintain state during conversions.

## Action 2: Implement Real-Time Input Validation with Computed Properties
**Issue**: Users need immediate feedback on input validity without waiting for form submission, and the Calculate button should only be enabled when inputs are valid.

*   **Action Taken**: Implemented a dual-layer validation system using both imperative validation functions and reactive computed properties.
    *   Created `validateInputs()` function that checks required fields, numeric ranges (50-300 cm, 2-600 kg for metric; 1ft 8in-10ft, 4-1300 lbs for imperial), and generates specific error messages.
    *   Implemented `isValid` computed property that reactively evaluates input validity based on unit system, enabling/disabling the Calculate button in real-time.
    *   Validation errors are stored in a reactive `errors` ref object, allowing components to display inline error messages immediately.
    *   This ensures requirement #4 (validation with inline errors) and requirement #5 (disabled Calculate button) are met simultaneously.
*   **Reference**: 
    *   **[Vue 3 Computed Properties](https://vuejs.org/guide/essentials/computed.html)** - Used for reactive validation state.
    *   **[WHO BMI Classification](https://www.who.int/europe/news-room/fact-sheets/item/a-healthy-lifestyle---who-recommendations)** - Validated input ranges based on realistic human measurements.

## Action 3: Implement Persistent Local Storage with Reactive Watchers
**Issue**: Users expect their input values, calculation history, and theme preferences to persist across browser sessions without requiring a backend server.

*   **Action Taken**: Developed a reusable `useLocalStorage` composable that provides reactive LocalStorage integration.
    *   Created a composable that wraps Vue's `ref()` and `watch()` to automatically sync reactive data with LocalStorage.
    *   Implemented deep watching (`{ deep: true }`) to handle nested objects and arrays (e.g., history entries, input state objects).
    *   Used JSON serialization/deserialization for complex data types, with fallback to default values if LocalStorage is empty or corrupted.
    *   Applied this composable to persist: theme preference (`bmi_theme`), current result (`bmi_current_result`), calculation history (`bmi_history`), and input values (`bmi_inputs`).
    *   Added `onMounted()` hook in App.vue to restore persisted values on application load, ensuring seamless user experience.
*   **Reference**: 
    *   **[Web Storage API: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)** - Browser-native persistence API.
    *   **[Vue 3 Lifecycle Hooks](https://vuejs.org/api/composition-api-lifecycle.html)** - Used `onMounted` for initialization.

## Action 4: Implement WHO-Standard BMI Categorization with Healthy Weight Range Calculation
**Issue**: Users need clear, medically accurate BMI categorization and actionable information about healthy weight ranges based on their height.

*   **Action Taken**: Implemented comprehensive BMI calculation logic following WHO (World Health Organization) standards.
    *   Created `calculateBmi()` function that normalizes all inputs to metric (meters, kilograms) for consistent calculation, regardless of input unit system.
    *   Implemented `getBmiCategory()` function using WHO thresholds: Underweight (<18.5), Normal (18.5-24.9), Overweight (25-29.9), Obese (≥30).
    *   Developed `getHealthyWeightRange()` function that calculates the weight range for BMI 18.5-24.9 based on user's height, converting back to the current unit system for display.
    *   Added `getWeightDifference()` function that calculates how much weight to gain/lose to reach normal BMI range, providing actionable guidance.
    *   Implemented `getGuidance()` function that provides category-specific health recommendations.
    *   All BMI values are rounded to 1 decimal place (requirement #6) using `Math.round(bmi * 10) / 10`.
*   **Reference**: 
    *   **[WHO BMI Classification](https://www.who.int/europe/news-room/fact-sheets/item/a-healthy-lifestyle---who-recommendations)** - Official BMI category thresholds.
    *   **[CDC: About Adult BMI](https://www.cdc.gov/healthyweight/assessing/bmi/adult_bmi/index.html)** - Healthy weight range calculation methodology.

## Action 5: Enable Hermetic Test Execution for Browser-Only Logic
**Issue**: Test runner (Vitest/Node) lacked access to browser APIs (`localStorage`, `document`), preventing automated verification of persistence and DOM interactions.

*   **Action Taken**: Integrated technical polyfills and mock services for hermetic test execution.
    *   Configured `localStorage` mock in `tests/setup.ts` that provides a fully functional, in-memory storage implementation for the Node environment.
    *   Implemented `window.matchMedia` mock for theme-related tests.
    *   Updated Vitest configuration to use Vue plugin instead of React, ensuring proper component mounting and reactivity testing.
    *   Created comprehensive test suites covering: core BMI calculation logic (`useBmiCalculator.test.ts`), LocalStorage persistence (`useLocalStorage.test.ts`), component rendering (`components.test.ts`), integration workflows (`integration.test.ts`), and explicit requirement verification (`requirements.test.ts`).
    *   All tests are deterministic and do not rely on external APIs or network connectivity, ensuring requirement #12 (browser-only, no backend) is verified.
*   **Reference**: 
    *   **[Vitest: Testing Vue Components](https://vitest.dev/guide/testing.html)** - Component testing configuration.
    *   **[Vue Test Utils](https://test-utils.vuejs.org/)** - Vue component testing utilities.

## Action 6: Implement Responsive Design with CSS Custom Properties for Theming
**Issue**: Users need a consistent, accessible experience across mobile and desktop devices, with support for light/dark themes.

*   **Action Taken**: Implemented a responsive design system using CSS Grid, Flexbox, and CSS custom properties.
    *   Created CSS custom property system in `style.css` with separate light and dark theme definitions, allowing theme switching via `data-theme` attribute on document root.
    *   Used CSS Grid for main layout (2-column on desktop, 1-column on mobile) with media queries at 968px and 640px breakpoints.
    *   Implemented responsive typography and spacing that scales appropriately on smaller screens.
    *   Added `ThemeToggle` component that updates `data-theme` attribute and persists preference in LocalStorage.
    *   All color values, spacing, and typography use CSS variables, ensuring consistent theming and easy maintenance.
*   **Reference**: 
    *   **[CSS Custom Properties (Variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)** - Theme system implementation.
    *   **[Responsive Design Best Practices](https://web.dev/responsive-web-design-basics/)** - Mobile-first approach.

## Verification Action: Comprehensive Test Suite Covering All 12 Requirements
**Action Taken**: Developed a comprehensive suite of behavioral and structural tests that explicitly verify all requirements.
*   Implemented 150+ test cases across 5 test files covering all 12 requirements:
    *   Requirement 1: Height/weight input and calculation
    *   Requirement 2: Metric and Imperial unit support
    *   Requirement 3: Unit conversion without reset
    *   Requirement 4: Input validation with inline errors
    *   Requirement 5: Disabled Calculate button until valid
    *   Requirement 6: BMI rounded to 1 decimal
    *   Requirement 7: WHO BMI categories (4 categories)
    *   Requirement 8: Healthy weight range display
    *   Requirement 9: Responsive layout
    *   Requirement 10: Clear labels and helpful text
    *   Requirement 11: Vue 3 implementation
    *   Requirement 12: Browser-only (no backend)
*   Created `requirements.test.ts` that explicitly maps each requirement to specific test cases, ensuring traceability.
*   Implemented adversarial testing scenarios: rapid unit toggling, invalid input handling, LocalStorage corruption, and edge cases.
*   Verified deterministic behavior: all calculations produce identical results across test runs, with no reliance on system time or randomness.
