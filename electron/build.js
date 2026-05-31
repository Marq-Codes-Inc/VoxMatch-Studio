// electron/build.js
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

console.log('🔨 Building Electron files...');

// Ensure dist-electron directory exists
const distElectronDir = path.join(__dirname, '../dist-electron');
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
  console.log('✅ Created dist-electron directory');
}

// Build main process
try {
  console.log('📦 Building main process...');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.join(distElectronDir, 'main.js'),
    external: ['electron'],
    sourcemap: process.env.NODE_ENV === 'development',
  });
  console.log('✅ main.js built successfully');
} catch (error) {
  console.error('❌ Failed to build main.js:', error);
  process.exit(1);
}

// Build preload script
try {
  console.log('📦 Building preload script...');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.join(distElectronDir, 'preload.js'),
    external: ['electron'],
    sourcemap: process.env.NODE_ENV === 'development',
  });
  console.log('✅ preload.js built successfully');
} catch (error) {
  console.error('❌ Failed to build preload.js:', error);
  process.exit(1);
}

// Copy public folder
const publicSrc = path.join(__dirname, '../public');
const publicDest = path.join(distElectronDir, 'public');
if (fs.existsSync(publicSrc)) {
  copyFolderRecursiveSync(publicSrc, publicDest);
  console.log('✅ Copied public folder');
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderRecursiveSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

console.log('✅ Electron files built successfully');
