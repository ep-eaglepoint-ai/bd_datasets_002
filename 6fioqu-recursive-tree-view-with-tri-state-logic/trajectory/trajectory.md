# Trajectory

## Implementation Steps

1. **Analyzed the requirements** - Read through the task requirements to understand the core objectives: building a self-contained Recursive Tree View in Vue 3 with Tri-State checkbox logic (Checked, Unchecked, Indeterminate) and strict immutability.

2. **Set up the Project Environment** - Initialized a clean `package.json` with Vue 3 and Jest 29.
   - Resolved peer dependency conflicts between `@vue/vue3-jest` and `jest` by aligning versions to 29.x.

3. **Configured Jest for Vue 3** - Set up `jest.config.js` and `babel.config.js` to handle `.vue` files and modern JavaScript.
   - Fixed a critical "ReferenceError: Vue is not defined" issue by mapping `@vue/test-utils` to its CJS distribution and configuring `customExportConditions`.

4. **Implemented Recursive Tree Component** - Built `RecursiveTree.vue` from scratch using the Composition API (`<script setup>`).
   - Implemented self-referential rendering in the template for arbitrary nesting depth.

5. **Developed Tri-State Logic** - Created the logic to handle three distinct checkbox states:
   - **Checked**: All descendants are selected.
   - **Unchecked**: No descendants are selected.
   - **Indeterminate**: A partial mix of selected and unselected children.

6. **Enforced Strict Immutability** - Created helper functions (`setCheckedRecursively` and `onChildUpdate`) that return deeply/shallowly cloned objects.
   - Ensured zero direct mutation of the `node` prop, adhering to unidirectional data flow.

7. **Implemented Visual States** - Leveraged the `:indeterminate.prop` directive to correctly bind the indeterminate state to standard HTML checkboxes.

8. **Cleaned up Component Code** - Removed unnecessary macro imports (`defineProps`, `defineEmits`) and polished the component's styling and structure.

9. **Set up Docker Infrastructure** - Created a `Dockerfile` to containerize the development and testing environment.
   - Defined `docker-compose.yml` with services for `test-before`, `test-after`, and `evaluation`.

10. **Created Evaluation Script** - Implemented `evaluation/evaluation.js` to programmatically execute the test suite and report results within the Docker environment.

11. **Verified everything works**:
    - `test-after`: All 5 tests passed, confirming correct rendering, propagation, and state calculation.
    - `evaluation`: Successfully executes and reports the passing status.

## Key Technical Decisions

- **Composition API over Options API** - Used `<script setup>` for cleaner, more modern Vue 3 logic.
- **Custom Jest Mapping** - Explicitly mapped `@vue/test-utils` to resolve JSDOM environment compatibility issues.
- **Immutability via Spread Operator** - Used object and array spreading (`{...node}`, `[...children]`) to ensure data is cloned before being emitted, preventing side effects.
- **DOM Property Binding** - Used `:indeterminate.prop` for reliable rendering of the indeterminate state, as it's a property of the input element rather than an attribute.

## Files Created/Modified

| File | Purpose |
|------|---------|
| `repository_after/RecursiveTree.vue` | Core recursive component with Tri-State logic |
| `package.json` | Project dependencies and test scripts |
| `jest.config.js` | Jest environment and module mapping |
| `tests/RecursiveTree.spec.js` | Unit test suite |
| `evaluation/evaluation.js` | Docker-ready evaluation runner |
| `Dockerfile` | Container definition |
| `docker-compose.yml` | Multi-service orchestration |
| `trajectory/trajectory.md` | Implementation journey (this file) |
