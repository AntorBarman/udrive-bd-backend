const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}]`, message, data);
  },
  
  warn: (message, data = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}]`, message, data);
  },
  
  error: (message, error = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}]`, message, {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  },
  
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] [${new Date().toISOString()}]`, message, data);
    }
  },
};

module.exports = logger;