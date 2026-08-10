const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite');
config.resolver.sourceExts.push('sql');

module.exports = config;
