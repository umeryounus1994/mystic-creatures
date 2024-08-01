const fs = require('fs');

function logToFile(message) {
  const logStream = fs.createWriteStream('logs.txt', { flags: 'a' });
  logStream.write(`${message}\n`);
  logStream.end();
}

const logger = {
  info: (message) => logToFile(`[INFO] ${message}`),
  warn: (message) => logToFile(`[WARN] ${message}`),
  error: (message) => logToFile(`[ERROR] ${message}`),
};

module.exports = logger;