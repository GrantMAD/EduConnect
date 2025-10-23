// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fixes a bug with Supabase where it tries to import Node.js modules
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    'fs': require.resolve('./emptyModule.js'),
    'net': require.resolve('./emptyModule.js'),
    'tls': require.resolve('./emptyModule.js'),
    'child_process': require.resolve('./emptyModule.js'),
};

module.exports = config;