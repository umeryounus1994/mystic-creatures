const fs = require('fs');
const path = require('path');

// Default configuration
const defaultConfig = {
  enabled: true,
  minAmount: 10.00,
  minDays: 7,
  batchSize: 100,
  schedule: '0 2 * * *' // Daily at 2 AM
};

// Path to config file
const configFilePath = path.join(__dirname, 'automaticPayouts.settings.json');

/**
 * Load configuration from file or return defaults
 */
const loadConfig = () => {
  try {
    if (fs.existsSync(configFilePath)) {
      const fileContent = fs.readFileSync(configFilePath, 'utf8');
      const config = JSON.parse(fileContent);
      
      // Merge with defaults to ensure all fields exist
      return {
        ...defaultConfig,
        ...config
      };
    }
  } catch (error) {
    console.error('Error loading automatic payout config:', error);
  }
  
  // Return defaults if file doesn't exist or error occurred
  return defaultConfig;
};

/**
 * Save configuration to file
 */
const saveConfig = (config) => {
  try {
    // Ensure all required fields are present
    const configToSave = {
      enabled: config.enabled !== undefined ? config.enabled : defaultConfig.enabled,
      minAmount: config.minAmount !== undefined ? config.minAmount : defaultConfig.minAmount,
      minDays: config.minDays !== undefined ? config.minDays : defaultConfig.minDays,
      batchSize: config.batchSize !== undefined ? config.batchSize : defaultConfig.batchSize,
      schedule: config.schedule || defaultConfig.schedule
    };
    
    fs.writeFileSync(configFilePath, JSON.stringify(configToSave, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving automatic payout config:', error);
    return false;
  }
};

/**
 * Get current configuration
 */
const getConfig = () => {
  return loadConfig();
};

/**
 * Update configuration
 */
const updateConfig = (updates) => {
  const currentConfig = loadConfig();
  const newConfig = {
    ...currentConfig,
    ...updates
  };
  
  return saveConfig(newConfig);
};

module.exports = {
  getConfig,
  updateConfig,
  loadConfig,
  saveConfig,
  defaultConfig
};
