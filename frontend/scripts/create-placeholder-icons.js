import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple red square SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#eb4034"/>
  <text x="256" y="256" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-size="300" font-weight="bold">R</text>
</svg>`;

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write SVG file
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);

console.log('Created icon.svg in public directory');
console.log('Note: For production, generate proper PNG icons in multiple sizes.');