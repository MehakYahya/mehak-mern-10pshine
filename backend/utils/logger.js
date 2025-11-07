const pino = require('pino');
const path = require('path');

const logFile = path.join(__dirname, '../logs/app.log');
const logger = pino({
  level: 'info',
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: { destination: logFile },
        level: 'info',
      },
      {
        target: 'pino-pretty',
        options: { colorize: true },
        level: 'info',
      },
    ],
  },
});

module.exports = logger;
