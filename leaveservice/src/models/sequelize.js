// Sequelize instance setup
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

// Load environment variables from .env when present
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME || 'leave_service_db', process.env.DB_USER || 'postgres', process.env.DB_PASS || '', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  dialect: 'postgres',
  // Enable SQL logging when SEQ_LOGGING=true (useful for debugging parameter values)
  logging: process.env.SEQ_LOGGING === 'true' ? console.log : false,
  // Force UTC timezone for the client connection to avoid locale timezone names like 'GMT+0530'
  timezone: process.env.DB_TIMEZONE || '+00:00',
  dialectOptions: {
    // For pg, ensure timestamps are treated consistently. Keep options minimal here.
    application_name: process.env.APP_NAME || 'leave-service-local'
  },
});

export default sequelize;
