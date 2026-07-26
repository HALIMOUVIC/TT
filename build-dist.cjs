const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(cmd, cwd) {
  console.log(`\nExecuting: ${cmd} (in ${cwd || __dirname})`);
  execSync(cmd, { stdio: 'inherit', cwd: cwd || __dirname });
}

async function main() {
  try {
    // 1. Build the production React frontend and Express server
    runCommand('npm run build');

    // 2. Setup clean staging directory
    const stagingDir = path.join(__dirname, 'package-staging');
    if (fs.existsSync(stagingDir)) {
      console.log('Cleaning up existing staging directory...');
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir);

    // 3. Copy only compiled production assets
    console.log('Staging compiled files...');
    fs.cpSync(path.join(__dirname, 'dist'), path.join(stagingDir, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(__dirname, 'electron-main.cjs'), path.join(stagingDir, 'electron-main.cjs'));
    fs.copyFileSync(path.join(__dirname, 'wellborePro.ico'), path.join(stagingDir, 'wellborePro.ico'));
    if (fs.existsSync(path.join(__dirname, '.env.local'))) {
      fs.copyFileSync(path.join(__dirname, '.env.local'), path.join(stagingDir, '.env.local'));
    }

    // 4. Write staging package.json with unique name to avoid workspace symlink issues
    fs.writeFileSync(
      path.join(stagingDir, 'package.json'),
      JSON.stringify({
        name: 'wellbore-pro-staging',
        version: '1.0.0',
        main: 'electron-main.cjs',
        dependencies: {
          'better-sqlite3': '^12.11.1'
        }
      }, null, 2)
    );

    // 5. Copy better-sqlite3 and its runtime deps into staging node_modules
    console.log('Copying better-sqlite3 and dependencies into staging node_modules...');
    const nmDest = path.join(stagingDir, 'node_modules');
    fs.mkdirSync(nmDest, { recursive: true });
    for (const pkg of ['better-sqlite3', 'bindings', 'file-uri-to-path']) {
      const src = path.join(__dirname, 'node_modules', pkg);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(nmDest, pkg), { recursive: true });
        console.log(`  Copied: ${pkg}`);
      } else {
        console.warn(`  WARNING: ${pkg} not found in root node_modules!`);
      }
    }

    // 6. Delete the pre-compiled Node.js binary before rebuilding to force fresh rebuild
    const prebuiltNode = path.join(nmDest, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(prebuiltNode)) {
      fs.rmSync(prebuiltNode);
      console.log('Deleted pre-compiled better_sqlite3.node (ABI 127)...');
    }
    const prebuildDir = path.join(nmDest, 'better-sqlite3', 'prebuilds');
    if (fs.existsSync(prebuildDir)) {
      fs.rmSync(prebuildDir, { recursive: true, force: true });
      console.log('Deleted prebuilds/ directory...');
    }

    // Rebuild better-sqlite3 inside package-staging
    console.log('Rebuilding better-sqlite3 for Electron v33.4.4 (ABI 130) inside staging directory...');
    // Run electron-rebuild targeting staging directory as module root
    runCommand(`npx --package=@electron/rebuild electron-rebuild -f -v 33.4.4 -m . --build-from-source --which-module better-sqlite3`, stagingDir);

    // Verify rebuilding succeeded and binary was created
    if (!fs.existsSync(prebuiltNode)) {
      throw new Error(`Rebuild failed! Native binary better_sqlite3.node not created at ${prebuiltNode}`);
    }
    console.log('Rebuild verified! Native binary exists.');

    // 7. Write electron-builder config inside package-staging
    const ebConfig = {
      appId: 'com.wellbore.pro',
      productName: 'Wellbore Schematic Pro',
      copyright: 'Copyright © oh.a.halim',
      npmRebuild: false,
      electronVersion: '33.4.4',
      directories: {
        app: '.',
        output: '../build-desktop'
      },
      files: [
        'dist/**/*',
        'electron-main.cjs',
        'wellborePro.ico',
        '.env.local',
        'node_modules/better-sqlite3/build/Release/**/*',
        'node_modules/better-sqlite3/lib/**/*',
        'node_modules/better-sqlite3/package.json',
        'node_modules/bindings/**/*',
        'node_modules/file-uri-to-path/**/*'
      ],
      asarUnpack: [
        'node_modules/better-sqlite3/build/Release/**/*'
      ],
      asar: true,
      win: {
        icon: 'wellborePro.ico',
        executableName: 'WellboreSchematicPro',
        target: [
          { target: 'nsis', arch: ['x64'] }
        ]
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'Wellbore Schematic Pro',
        installerIcon: 'wellborePro.ico',
        uninstallerIcon: 'wellborePro.ico',
        uninstallDisplayName: 'Wellbore Schematic Pro',
        artifactName: 'WellboreSchematicPro Setup.${ext}'
      }
    };

    const ebConfigPath = path.join(stagingDir, 'electron-builder.json');
    fs.writeFileSync(ebConfigPath, JSON.stringify(ebConfig, null, 2));

    // 8. Build NSIS installer entirely inside package-staging directory
    console.log('Building NSIS installer with electron-builder inside staging directory...');
    runCommand(`npx electron-builder --config electron-builder.json --win nsis`, stagingDir);

    // 9. Cleanup
    console.log('Cleaning up temporary staging folder...');
    fs.rmSync(stagingDir, { recursive: true, force: true });

    console.log('\n==================================================');
    console.log('SUCCESS: Installer generated inside "build-desktop/"!');
    console.log('==================================================');
  } catch (error) {
    console.error('\nBuild failed:', error.message);
    process.exit(1);
  }
}

main();
