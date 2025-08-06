import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    config.logging.format === 'json' ? json() : customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: config.env === 'development' 
        ? combine(colorize(), customFormat)
        : undefined,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

if (config.env !== 'production') {
  logger.debug('Logger initialized in development mode');
}