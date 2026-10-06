const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pages = [['home','/'],['services','/services/'],['service','/services/family/'],['about','/about/'],['contact','/contact/'],['articles','/articles/'],['article','/checklist/'],['search','/?s=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF'],['search-empty','/?s=zzzz'],['404','/no-such-page/']];
  const sizes = [['mobile',390,844],['tablet',768,1024],['desktop',1366,900]];
  const errors = [];
  for (const [sname,w,h] of sizes) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type()==='error') errors.push(`${sname} console: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${sname} pageerror: ${e.message}`));
    page.on('requestfailed', r => errors.push(`${sname} requestfailed: ${r.url()}`));
    page.on('response', r => { if (r.status()>=400 && !r.url().includes('no-such-page')) errors.push(`${sname} ${r.status()}: ${r.url()}`); });
    for (const [name,path] of pages) {
      await page.goto((process.env.SITE_URL || 'http://localhost:8080')+path, { waitUntil:'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) errors.push(`${sname} ${name}: horizontal overflow`);
      if (sname!=='tablet' || ['home','contact'].includes(name)) await page.screenshot({ path: `${out}/${name}-${sname}.png`, fullPage: true });
    }
    await ctx.close();
  }
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();
