import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';

async function main() {
  const distDir = path.resolve('dist');
  const zipPath = path.join(distDir, 'update.zip');
  const versionPath = path.join(distDir, 'version.json');

  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error('Dist directory does not exist! Run npm run build first.');
    process.exit(1);
  }

  // 1. Generate version.json
  const now = new Date();
  const version = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14); // e.g. "20260622130700"
  const versionData = {
    version: version,
    url: 'https://boss-frontent.vercel.app/update.zip',
    releasedAt: now.toISOString()
  };
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
  console.log(`Generated version.json with version ${version}`);

  // 2. Create update.zip containing dist directory (excluding update.zip itself)
  const output = fs.createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`Successfully created update.zip (${archive.pointer()} total bytes)`);
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn(err);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Append all files from dist directory, but exclude the update.zip itself
  archive.glob('**/*', {
    cwd: distDir,
    ignore: ['update.zip']
  });

  await archive.finalize();
}

main().catch(err => {
  console.error('Postbuild script failed:', err);
  process.exit(1);
});
