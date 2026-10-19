import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
for (const s of [192, 512]) await sharp(svg, { density: 300 }).resize(s, s).png().toFile(new URL(`../public/icon-${s}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const pads = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0B0B0E"/><g transform="translate(256 256) scale(.6) translate(-256 -256)" fill="#FF4B2B"><rect x="96" y="96" width="140" height="140" rx="24"/><rect x="276" y="96" width="140" height="140" rx="24" opacity=".35"/><rect x="96" y="276" width="140" height="140" rx="24" opacity=".35"/><rect x="276" y="276" width="140" height="140" rx="24"/></g></svg>`;
await sharp(Buffer.from(pads), { density: 300 }).resize(512, 512).png().toFile(new URL('../public/icon-maskable.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
console.log('web icons ok');
