// Winston logger setup
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    // Add file or other transports as needed
  ],
});

export default logger;
