import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Starting repository download...');
  const repoUrl = 'https://github.com/AnkitJadhav-3110/InvoicePro31.git';
  const currentDir = process.cwd();
  const tempDir = path.join(currentDir, 'temp_clone');

  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log('Attempting git clone...');
    execSync(`git clone ${repoUrl} ${tempDir}`, { stdio: 'inherit' });
    console.log('Git clone successful. Copying files...');

    // Copy files from tempDir to workspace root
    copyRecursiveSync(tempDir, currentDir);

    // Clean up tempDir
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Files copied successfully!');
  } catch (err: any) {
    console.error('Git clone failed, trying to download ZIP...', err.message);
    try {
      // If git clone fails, try fetching zip
      const zipUrl = 'https://github.com/AnkitJadhav-3110/InvoicePro31/archive/refs/heads/main.zip';
      console.log('Fetching ZIP from:', zipUrl);
      const response = await fetch(zipUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch zip: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      const zipPath = path.join(currentDir, 'repo.zip');
      fs.writeFileSync(zipPath, Buffer.from(buffer));
      console.log('ZIP downloaded. Extracting zip...');

      // Extract zip using npx extract-zip or similar, or node-stream
      execSync(`npx -y extract-zip ${zipPath} ${currentDir}`, { stdio: 'inherit' });
      fs.unlinkSync(zipPath);

      const extractedDir = path.join(currentDir, 'InvoicePro31-main');
      if (fs.existsSync(extractedDir)) {
        copyRecursiveSync(extractedDir, currentDir);
        fs.rmSync(extractedDir, { recursive: true, force: true });
        console.log('ZIP extracted and copied successfully!');
      } else {
        console.error('Extracted directory not found at:', extractedDir);
      }
    } catch (zipErr: any) {
      console.error('ZIP download/extract failed:', zipErr.message);
    }
  }
}

function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      // Skip .git directory
      if (childItemName === '.git') return;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // Avoid overwriting clone.ts itself or important metadata.json / env unless needed, but let's overwrite standard files.
    if (src.endsWith('package.json') || src.endsWith('tsconfig.json') || src.endsWith('vite.config.ts') || src.endsWith('metadata.json')) {
      // We will handle them carefully
    }
    fs.copyFileSync(src, dest);
  }
}

main();
