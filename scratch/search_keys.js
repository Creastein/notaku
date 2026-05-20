const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && /\.(tsx|ts|js|jsx)$/.test(file)) {
      callback(filepath);
    }
  }
}

console.log('Searching for files importing or using GSAP...');
let count = 0;
walk(srcDir, (filepath) => {
  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes('gsap') || content.includes('useGSAP')) {
    console.log(`- ${filepath}`);
    count++;
  }
});
console.log(`\nFound ${count} files using GSAP.`);
