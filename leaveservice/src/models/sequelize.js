// Sequelize instance setup
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

// Load environment variables from .env when present
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME || 'leave_service_db', process.env.DB_USER || 'postgres', process.env.DB_PASS || '', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  dialect: 'postgres',
  logging: false,
});

export default sequelize;
