const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const savidhiMobileRoot = __dirname;

/**
 * Metro configuration for savidhi_mobile — standalone React Native app
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot: savidhiMobileRoot,

  resolver: {
    // Use local node_modules as primary source
    nodeModulesPaths: [
      path.resolve(savidhiMobileRoot, 'node_modules'),
      // react-native nests @react-native/virtualized-lists here due to circular peer dep
      path.resolve(savidhiMobileRoot, 'node_modules/react-native/node_modules'),
    ],

    // Force local-only lookup
    disableHierarchicalLookup: true,

    // Standard React Native platforms
    platforms: ['ios', 'android', 'native'],
  },

  // Only watch the savidhi_mobile directory
  watchFolders: [savidhiMobileRoot],

  server: {
    port: 8081,
  },

  maxWorkers: 4,
};

module.exports = mergeConfig(getDefaultConfig(savidhiMobileRoot), config);
