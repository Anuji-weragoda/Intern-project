# Testing and Allure Reporting

This project uses Jest (ESM + ts-jest) and React Testing Library for unit tests, with Allure integrated for test reporting.

## How to run tests

- Run once:
  - npm run test -- --runInBand
- Watch mode:
  - npm run test:watch
- With coverage:
  - npm run test:coverage

Notes:
- Tests run in a jsdom environment provided by allure-jest, so Allure results are produced automatically in `./allure-results`.
- The setup file `src/setupTests.js` initializes jest-dom matchers and polyfills required by react-router, and sets a default `VITE_API_BASE_URL` for tests.

## Allure reporting

- Generate report HTML:
  - npm run allure:generate
- Serve the report locally (opens a browser):
  - npm run allure:open
- Alternatively serve directly from results (ad-hoc):
  - npm run allure:serve

Generated HTML is available in `./allure-report`.

## Test file placement

- Unit tests live alongside source files, using `*.test.tsx` or `*.test.ts`:
  - src/components/Card.test.tsx
  - src/components/Navbar.test.tsx
  - src/utils/PrivateRoute.test.tsx
  - src/contexts/AuthContext.test.tsx
  - src/api/index.test.ts

This keeps tests near the code they verify and aligns with common React/Vite practices.

## Mocking patterns

- Prefer context/provider composition over mocking hooks when possible (e.g., wrap with `AuthContext.Provider`).
- For services (e.g., `authService`), use `jest.spyOn(service, 'method')` to control behavior per test without reloading modules (avoids duplicate React instances).
- UI-only dependencies are mocked via `moduleNameMapper` (e.g., icons, styles, files). See `src/tests/__mocks__/`.

## Troubleshooting

- Invalid hook call errors in tests usually occur when multiple React instances are loaded.
  - Avoid using `jest.resetModules()` with React component tests.
  - Use spies instead of re-mocking ESM modules and re-importing components.
- Redirect testing in JSDOM can be brittle (window.location limitations). The `PrivateRoute` redirect assertion is skipped; prefer testing render/branching and consider extracting navigation to a replaceable utility for deeper tests.

## CI integration (optional)

- Run tests in CI and always generate Allure artifacts:
  - npm run test -- --runInBand
  - npm run allure:generate
  - Upload the `allure-report` or `allure-results` as a CI artifact or publish it.
