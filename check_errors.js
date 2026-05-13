const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    console.log(`PAGE EXCEPTION: ${error.message}`);
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  console.log('Page loaded.');
  
  // Wait a bit to let GSAP run
  await page.waitForTimeout(2000);
  
  // Check if .gsap-stagger elements are visible
  const staggers = await page.$$('.gsap-stagger');
  console.log(`Found ${staggers.length} .gsap-stagger elements.`);
  
  for (let i = 0; i < staggers.length; i++) {
    const isVisible = await staggers[i].isVisible();
    const opacity = await staggers[i].evaluate(el => window.getComputedStyle(el).opacity);
    console.log(`Element ${i} visible: ${isVisible}, opacity: ${opacity}`);
  }

  await browser.close();
})();
