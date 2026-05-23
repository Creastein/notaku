const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const logoPath = path.join(__dirname, "../public/logo.png");
const tempPath = path.join(__dirname, "../public/logo_temp.png");

async function compress() {
  try {
    const statsBefore = fs.statSync(logoPath);
    console.log(`Original size: ${(statsBefore.size / 1024 / 1024).toFixed(2)} MB`);

    await sharp(logoPath)
      .resize(256, 256) // Resize to 256x256 as logo is only shown as a small icon
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(tempPath);

    fs.unlinkSync(logoPath);
    fs.renameSync(tempPath, logoPath);

    const statsAfter = fs.statSync(logoPath);
    console.log(`Compressed size: ${(statsAfter.size / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error("Compression error:", err);
  }
}

compress();
