const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "../public");

// SVG icon representation
const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#020617"/>
  <rect x="56" y="56" width="400" height="400" rx="88" fill="#10b981"/>
  <path d="M160 200 L256 120 L352 200 V360 A24 24 0 0 1 328 384 H184 A24 24 0 0 1 160 360 Z" fill="white"/>
  <rect x="232" y="240" width="48" height="64" rx="8" fill="#10b981"/>
</svg>
`;

async function generate() {
  try {
    const svgBuffer = Buffer.from(svgContent);

    // 512x512
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, "icon-512x512.png"));
    console.log("Created icon-512x512.png");

    // 192x192
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, "icon-192x192.png"));
    console.log("Created icon-192x192.png");

    // Maskable 512
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, "icon-maskable-512x512.png"));
    console.log("Created icon-maskable-512x512.png");

  } catch (err) {
    console.error("Error generating icons:", err);
  }
}

generate();
