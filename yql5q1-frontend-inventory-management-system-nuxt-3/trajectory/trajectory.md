# Trajectory

## 1. Project Scaffolding

- Created a Nuxt 3 application inside `repository_after/` using the latest stable release.
- Chose TypeScript and TailwindCSS for type-safety and modern UI development.
- Adopted Pinia for state management and followed Composition API standards.
- Set up modular folders: `components/`, `composables/`, `pages/`, `stores/`, `tests/`.

## 2. Core Feature Implementation

- Implemented Product CRUD with auto-generated IDs, name/SKU/category, price, and stock fields.
- Added real-time stock validation (no negative values).
- Product status (“In Stock”, “Low Stock”, “Out of Stock”) is auto-calculated in the Pinia store and surfaced to the UI.
- Built a searchable, filterable, sortable paginated product table.
- Developed a live dashboard with total products, total stock level, and low-stock alert cards.
- Integrated modals for add/edit and confirmation dialogs for deletion.
- Toast notifications for all user feedback.
- Persisted Pinia store to LocalStorage for data durability on reload.

## 3. Styling and UI

- Leveraged Tailwind CSS for responsive, accessible admin-panel-like UI styling.
- Ensured component-driven development with reusable cards, modals, badges, and controls.
- Verified mobile and accessibility (a11y) compliance.

## 4. Testing

- Added unit and integration tests using Vitest and `@nuxt/test-utils`.
- Wrote tests for product store logic, rendering of UI components, and flows for add/edit/delete.
- Ensured test coverage for edge cases (stock boundaries, sorting, filtering).

## 5. Containerization & Docker Integration

- Requirement: All build/test/evaluation must run via Docker in the project root (not from inside app subfolders).
- Original Dockerfile and docker-compose setup assumed project root contained the Nuxt app.
- Adapted Dockerfile to set `WORKDIR` in `/app/repository_after` and copy only relevant app files.
- Ensured locked dependencies by copying both `package.json` and `package-lock.json`.

## 6. Dependency and Package Manager Challenges

- Faced `npm`/`pnpm` dependency and lockfile version mismatches (especially with `vitest` and `@nuxt/test-utils`).
- Synchronized versions to align with the peer dependency graph.
- Maintained scripts in `package.json`: `dev`, `build`, `start`, `test`, `evaluation`.

## 7. Solving Nuxt 3 + npm + oxc-parser Docker Native Bindings Issue

- Hit a widely reported error with native bindings (`Cannot find native binding`, related to `oxc-parser`) while building with Node 18/20 Alpine.
- Tried standard workarounds: `--omit=optional`, `--legacy-peer-deps`, and removing optional native bindings.
- **Ultimate solution:** Switched Docker base image from `node:20-alpine` to `node:20` (Debian-based Node image) for Nuxt 3.21+ compatibility.
- Documented this tradeoff for reproducible, architecture-agnostic builds both locally and in CI/CD.

## 8. Validation and Evaluation

- Successful test and evaluation runs using:
    ```sh
    docker compose run --rm test-after
    docker compose run --rm evaluation
    ```
- Confirmed container launches the Nuxt app, runs all unit/integration tests, and generates evaluation reports without network or native module errors.

---

## Lessons Learned & Next Steps

- **Dependency alignment and compatibility testing are critical for CI/CD and Docker builds with modern JS toolchains.**
- **Native module errors in Node/Docker builds are best solved using official Debian Node images, not Alpine.**
- For ongoing enhancements: monitor Nuxt, Vite, and npm issues for fixes to optional dependency resolution and native binding installation.

---
```