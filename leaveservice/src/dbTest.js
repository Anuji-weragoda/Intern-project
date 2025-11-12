// Simple DB connection and sync test script
import dotenv from 'dotenv';
import sequelize from './models/sequelize.js';
import leaveModels from './models/leaveModel.js';
import attendanceModels from './models/attendanceModel.js';

// Load .env
dotenv.config();

async function run() {
  try {
    console.log('Attempting to authenticate with DB using:');
    console.log(`  host=${process.env.DB_HOST}`);
    console.log(`  port=${process.env.DB_PORT}`);
    console.log(`  db=${process.env.DB_NAME}`);
    console.log(`  user=${process.env.DB_USER}`);

    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // If you want to create tables automatically in dev, set SYNC_DB=true
    const shouldSync = process.env.SYNC_DB === 'true';
    if (shouldSync) {
      console.log('Syncing models to database (alter:true)...');
      await sequelize.sync({ alter: true });
      console.log('Database synced.');
    } else {
      console.log('SYNC_DB not set to true — skipping model sync. Set SYNC_DB=true to enable.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1);
  }
}

run();
