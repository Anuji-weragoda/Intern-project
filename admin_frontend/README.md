# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## E2E tests and MailSlurp

The project's end-to-end Selenium flows interact with email (for example: verification, password reset, or invite flows). To reliably test email-based flows we use MailSlurp via the `mailslurp-client` package (see devDependencies in `package.json`).

How it works
- Tests create disposable inboxes using the MailSlurp API.
- The application (or test helper) sends email to those addresses during the scenario.
- Tests poll MailSlurp for incoming messages and extract verification links or codes.

How to run locally
- Create a MailSlurp account and get an API key: https://www.mailslurp.com/
- Set the API key in your environment (PowerShell example):

```powershell
$env:MAILSLURP_API_KEY = 'your-mailslurp-api-key'
```

- Run the e2e orchestrator (this script will use the env var):

```powershell
cd admin_frontend
npm ci
powershell -ExecutionPolicy Bypass -File .\run-selenium-tests.ps1
```

CI / Secrets
- Do NOT commit the API key. Add `MAILSLURP_API_KEY` as a protected secret in your CI provider and inject it into the test job environment.

Notes
- If you prefer not to use MailSlurp, tests that rely on email will need to be adapted to your alternative email-capture approach (local SMTP sink, MailHog, or mocked services).
