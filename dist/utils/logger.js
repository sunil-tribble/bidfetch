"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const { combine, timestamp, json, printf, colorize, errors } = winston_1.default.format;
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logging.level,
    format: combine(errors({ stack: true }), timestamp(), config_1.config.logging.format === 'json' ? json() : customFormat),
    transports: [
        new winston_1.default.transports.Console({
            format: config_1.config.env === 'development'
                ? combine(colorize(), customFormat)
                : undefined,
        }),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
        }),
    ],
});
if (config_1.config.env !== 'production') {
    exports.logger.debug('Logger initialized in development mode');
}
//# sourceMappingURL=logger.js.map