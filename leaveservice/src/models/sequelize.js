// sequelize.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: process.env.SEQ_LOGGING === 'true' ? console.log : false,
    timezone: process.env.DB_TIMEZONE || '+00:00',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // For testing; for production, provide RDS CA
      },
      application_name: process.env.APP_NAME || 'leave-service-lambda'
    }
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully with SSL');
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
})();

export default sequelize;
