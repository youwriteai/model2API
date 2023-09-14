/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unused-vars */
const path = require('path');
const fs = require('fs');

function incrementPackageJsonVersion(packageJsonPath, indexToIncrement = 2) {
  // Read the package.json file
  fs.readFile(packageJsonPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading package.json:', err);
      return;
    }

    try {
      const packageJson = JSON.parse(data);

      // Get the current version
      const currentVersion = packageJson.version;
      const versionParts = currentVersion.split('-'); // Split the version and suffix
      let newVersion = versionParts[0]; // Major.minor.patch version

      let suffix;
      if (versionParts.length > 1) {
        // Handle suffix (e.g., -beta, -alpha)
        suffix = versionParts.slice(1).join('-'); // Join the remaining parts with hyphens
      }

      const versions = versionParts[0].split('.');

      versions[indexToIncrement || 0] =
        parseInt(versions[indexToIncrement || 0] || 0, 10) + 1;
      newVersion = `${versions.join('.')}${suffix ? `-${suffix}` : ''}`;

      // Update the package.json with the new version
      packageJson.version = newVersion;

      // Write the updated package.json back to the file
      fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
        'utf8',
        (err) => {
          if (err) {
            console.error('Error writing package.json:', err);
          } else {
            console.log(`Version incremented to ${newVersion}`);
          }
        }
      );
    } catch (parseError) {
      console.error('Error parsing package.json:', parseError);
    }
  });
}

const rootPath = path.join(__dirname, '../..');
const releasePath = path.join(rootPath, 'release');
const appPath = path.join(releasePath, 'app');

incrementPackageJsonVersion(path.join(rootPath, './package.json'));
incrementPackageJsonVersion(path.join(appPath, './package.json'));
