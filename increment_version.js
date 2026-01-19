const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
const appJson = require(appJsonPath);

// Helper to increment semantic version (X.Y.Z -> X.Y.Z+1)
const incrementVersion = (version) => {
  const parts = version.split('.');
  if (parts.length === 3) {
    parts[2] = parseInt(parts[2], 10) + 1;
    return parts.join('.');
  }
  return version;
};

// Increment Android Version Code
if (appJson.expo.android) {
  const currentCode = appJson.expo.android.versionCode || 1;
  appJson.expo.android.versionCode = currentCode + 1;
  console.log(`Updated Android versionCode to ${appJson.expo.android.versionCode}`);
}

// Increment iOS Build Number (Standard for Expo/EAS)
if (appJson.expo.ios) {
  const currentBuildNumber = parseInt(appJson.expo.ios.buildNumber || '1', 10);
  appJson.expo.ios.buildNumber = (currentBuildNumber + 1).toString();
  console.log(`Updated iOS buildNumber to ${appJson.expo.ios.buildNumber}`);
}

// Increment App Version (Patch)
if (appJson.expo.version) {
  const newVersion = incrementVersion(appJson.expo.version);
  appJson.expo.version = newVersion;
  console.log(`Updated App Version to ${newVersion}`);
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log('app.json updated successfully.');
