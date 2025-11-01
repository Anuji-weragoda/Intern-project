# Authservice - Testing & Allure Report

This document explains how to run the backend unit tests (controllers, services, and utils) and view an Allure report.

## What we added

- JUnit 5 tests for:
  - Services: `UserService`, `AuditService`
  - Controllers: `HealthController`, `SessionController`, `UserController`
  - Utils: `SecurityUtils`
- Allure integration for rich test reporting
- Maven configuration to generate static Allure reports

## How to run (Windows PowerShell)

Run tests:

```powershell
cd "c:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\authservice"
./mvnw -DskipTests=false test
```

Generate an Allure HTML report:

```powershell
./mvnw allure:report
```

Open the report in your browser:

- Open the following file:
  `c:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\authservice\target\site\allure-maven-plugin\index.html`

Optionally, start an ephemeral local server (requires JDK/Node networking permissions):

```powershell
./mvnw allure:serve
```

This will build and serve the report at a local URL in your default browser. Press Ctrl+C in the terminal to stop the server.

## Notes

- Allure raw results are written to `authservice/allure-results` by the JUnit 5 extension.
- The Maven plugin is configured to read from that directory and build the static site in `target/site/allure-maven-plugin`.
- If you add more tests, they will appear automatically in the next report.
