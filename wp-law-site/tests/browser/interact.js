const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const axeSrc = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.SITE_URL || 'http://localhost:8080';
const results = [];
const ok = (name, cond, extra='') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  // 1. Keyboard + mobile menu
  let ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let page = await ctx.newPage();
  await page.goto(BASE + '/');
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement.textContent.trim());
  ok('first Tab focuses skip link', first.includes('پرش به محتوا'), first);
  const skipVisible = await page.evaluate(() => document.activeElement.getBoundingClientRect().top >= 0);
  ok('skip link visible when focused', skipVisible);
  await page.keyboard.press('Enter');
  ok('skip link moves focus to main', await page.evaluate(() => document.activeElement.id === 'content'));
  ok('nav hidden on mobile initially', !(await page.isVisible('#site-nav .site-nav__list')));
  await page.focus('.nav-toggle');
  await page.keyboard.press('Enter');
  ok('toggle sets aria-expanded=true', (await page.getAttribute('.nav-toggle', 'aria-expanded')) === 'true');
  ok('nav visible after toggle', await page.isVisible('#site-nav .site-nav__list'));
  await page.keyboard.press('Tab');
  ok('next Tab goes into menu', await page.evaluate(() => !!document.activeElement.closest('#site-nav')));
  await page.keyboard.press('Escape');
  ok('Escape closes menu', (await page.getAttribute('.nav-toggle', 'aria-expanded')) === 'false' && !(await page.isVisible('#site-nav .site-nav__list')));
  ok('focus returns to toggle', await page.evaluate(() => document.activeElement.classList.contains('nav-toggle')));
  const focusStyle = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth);
  ok('visible focus outline', focusStyle.startsWith('solid 3px'), focusStyle);
  await ctx.close();

  // 2. Form with JavaScript
  ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  page = await ctx.newPage();
  page.on('response', async r => { if (r.url().includes('inquiry')) results.push('  response ' + r.status() + ' ' + (await r.text())); });
  await page.goto(BASE + '/contact/');
  await page.click('.dv-form__submit');
  ok('empty submit shows field errors', (await page.locator('.dv-field.is-invalid').count()) >= 3);
  ok('focus moves to first invalid field', await page.evaluate(() => document.activeElement.name === 'dv_name'));
  await page.fill('[name=dv_name]', 'آزمون مرورگر');
  await page.fill('[name=dv_phone]', '۰۹۱۲۱۲۳۴');
  await page.locator('[name=dv_phone]').blur();
  ok('invalid Persian-digit phone rejected in browser', (await page.locator('[name=dv_phone]').getAttribute('aria-invalid')) === 'true');
  await page.fill('[name=dv_phone]', '۰۹۱۲ ۱۲۳ ۴۵۶۷');
  await page.selectOption('[name=dv_topic]', { index: 1 });
  await page.fill('[name=dv_message]', 'پیام آزمایشی خودکار');
  await page.check('[name=dv_consent]');
  await page.waitForTimeout(3500); // token minimum age
  await page.click('.dv-form__submit');
  await page.waitForFunction(() => { const n = document.querySelector('.dv-form__notice'); return n && !n.textContent.includes('اصلاح'); }, null, { timeout: 15000 });
  const notice = await page.textContent('.dv-form__notice');
  ok('JS submit succeeds', notice.includes('ثبت شد'), notice.trim());
  // duplicate
  await page.waitForTimeout(3500);
  await page.fill('[name=dv_name]', 'آزمون مرورگر');
  await page.fill('[name=dv_phone]', '09121234567');
  await page.selectOption('[name=dv_topic]', { index: 1 });
  await page.fill('[name=dv_message]', 'پیام آزمایشی خودکار');
  await page.check('[name=dv_consent]');
  await page.click('.dv-form__submit');
  await page.waitForFunction(() => document.querySelector('.dv-form__notice') && document.querySelector('.dv-form__notice').textContent.includes('پیش‌تر'), null, { timeout: 15000 }).catch(() => {});
  ok('duplicate submission not stored twice', (await page.textContent('.dv-form__notice')).includes('پیش‌تر'));
  await ctx.close();

  // 3. Form without JavaScript
  ctx = await browser.newContext({ javaScriptEnabled: false });
  page = await ctx.newPage();
  await page.goto(BASE + '/contact/');
  await page.fill('[name=dv_name]', 'آ');
  await page.click('.dv-form__submit');
  await page.waitForLoadState();
  ok('no-JS invalid submit returns with errors', (await page.locator('.dv-field.is-invalid').count()) >= 2, page.url());
  ok('no-JS keeps typed value', (await page.inputValue('[name=dv_name]')) === 'آ');
  await page.goto(BASE + '/contact/');
  await page.waitForTimeout(3500);
  await page.fill('[name=dv_name]', 'آزمون بدون جاوااسکریپت');
  await page.fill('[name=dv_phone]', '+98 912 765 4321');
  await page.selectOption('[name=dv_topic]', { index: 2 });
  await page.check('[name=dv_consent]');
  await page.click('.dv-form__submit');
  await page.waitForLoadState();
  ok('no-JS valid submit succeeds', (await page.textContent('.dv-form__status')).includes('ثبت شد'));
  ok('no-JS menu visible without toggle', await page.isVisible('#site-nav .site-nav__list'));
  await ctx.close();

  // 4. axe-core (WCAG 2.0/2.1/2.2 A+AA rules)
  for (const [w, h] of [[390, 844], [1366, 900]]) {
    ctx = await browser.newContext({ viewport: { width: w, height: h } });
    page = await ctx.newPage();
    for (const path of ['/', '/services/', '/services/family/', '/about/', '/contact/', '/articles/', '/checklist/', '/?s=zzzz', '/no-such-page/']) {
      await page.goto(BASE + path);
      await page.addScriptTag({ content: axeSrc });
      const r = await page.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const v = r.violations.map(x => `${x.id}(${x.nodes.length}): ${x.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' | ')}`);
      ok(`axe ${w}px ${path}`, v.length === 0, v.join('; '));
    }
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
})().catch(e => { console.log(results.join('\n')); console.error(e); process.exit(1); });
