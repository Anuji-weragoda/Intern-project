# LeaveService

A Node.js microservice for staff leave and attendance management, designed for AWS Lambda + API Gateway deployment using AWS SAM CLI.

## Features
- Leave request submission, approval, rejection, and viewing
- Attendance clock-in, clock-out, and history
- PostgreSQL integration via Sequelize ORM
- Input validation with Joi
- Logging with Winston
- AWS Lambda handler via @vendia/serverless-express
- Unit tests with Jest

## Folder Structure
- `src/` - Source code
- `src/routes/` - Express routes
- `src/controllers/` - Controllers
- `src/services/` - Business logic
- `src/models/` - Sequelize models
- `src/utils/` - Utilities (validation, logger, msgraph)
- `tests/` - Jest unit tests

## Environment Variables
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT`

## AWS SAM
See `template.yaml` for deployment configuration.
