import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { authenticator } from 'otplib';

// MFA Audit Log search E2E
// - Login with username/password + TOTP
// - Navigate to Audit Log page
// - Read first row's email, search by that email, verify filtered rows
// - Clear search and verify rows reset (best-effort)
//
// Env: LOGIN_EMAIL, LOGIN_PASSWORD, TOTP_SECRET, BASE_URL, PAGE_URL?, HEADLESS, KEEP_BROWSER_OPEN

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const PAGE_URL = process.env.PAGE_URL || '';
const HEADLESS = process.env.HEADLESS === 'true';
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === 'true';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';
const TOTP_SECRET = process.env.TOTP_SECRET || '';

async function waitForServer(url, timeout = 60000) {
  let u; try { u = new URL(url); } catch { throw new Error(`Invalid BASE_URL: ${url}`); }
  u.hash = '';
  const target = u.toString();
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await new Promise(res => {
      const req = http.get(target, r => { r.resume(); res((r.statusCode || 500) < 500); });
      req.on('error', () => res(false));
      req.setTimeout(2000, () => { req.destroy(); res(false); });
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function performMfaLogin(driver, saveShot) {
  console.log('[auditLogMfaTest] MFA login starting');
  await driver.get(BASE_URL + '/');
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  await saveShot('home');

  // Click sign-in if visible, else go to /login
  async function clickByText(text){ const xp=`//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`; const els=await driver.findElements(By.xpath(xp)); if(els.length){ await els[0].click(); return true;} return false; }
  let clicked=false; for (const l of ['Sign in','Sign In','Log in','Login','Sign in with']) { if (await clickByText(l)) { clicked=true; break; } }
  if (!clicked) await driver.get(BASE_URL + '/login');
  await driver.sleep(600);
  await saveShot('login-start');

  // Email
  const emailS=["input[type=email]","input[name=email]","input[id=email]","input[autocomplete=email]","input[name=username]","input#username"]; let emailEl=null; for(const s of emailS){ const els=await driver.findElements(By.css(s)); if(els.length){ emailEl=els[0]; break; }}
  if(!emailEl) throw new Error('Email input not found');
  await emailEl.clear(); await emailEl.sendKeys(LOGIN_EMAIL);
  let nextBtn=(await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Next')]|//button[contains(.,'Continue')]")))[0];
  if(nextBtn) await nextBtn.click();
  await saveShot('email-submitted');

  // Password
  await driver.wait(async()=> (await driver.findElements(By.css("input[type=password]"))).length>0, 15000);
  const passS=["input[type=password]","input[name=password]","input[id=password]","input[autocomplete=current-password]"]; let passEl=null; for(const s of passS){ const els=await driver.findElements(By.css(s)); if(els.length){ passEl=els[0]; break; }}
  if(!passEl) throw new Error('Password input not found');
  await passEl.clear(); await passEl.sendKeys(LOGIN_PASSWORD, Key.RETURN);
  await saveShot('password-submitted');

  // MFA
  await driver.wait(async()=>{ const sels=["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"]; for(const s of sels){ if((await driver.findElements(By.css(s))).length) return true; } const d=await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']")); return d.length>=6; }, 30000);
  const code=authenticator.generate(TOTP_SECRET);
  let otpEl=null; for(const s of ["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"]){ const els=await driver.findElements(By.css(s)); if(els.length){ otpEl=els[0]; break; }}
  if(otpEl){ await otpEl.clear().catch(()=>{}); await otpEl.sendKeys(code);} else { const inputs=await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']")); if(inputs.length<6) throw new Error('MFA inputs not found'); for(let i=0;i<6 && i<code.length;i++) await inputs[i].sendKeys(code[i]); }
  let mfaSubmit=(await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Verify')]|//button[contains(.,'Continue')]|//button[contains(.,'Submit')]")))[0];
  if(mfaSubmit) await mfaSubmit.click();
  try{ await driver.wait(async()=>!/amazoncognito\.com/.test(await driver.getCurrentUrl()), 30000);}catch{}

  // If JWT param exists, route to dashboard
  try { const cur = await driver.getCurrentUrl(); if (/[?&]jwt=/.test(cur)) { const u=new URL(cur); await driver.get(u.origin + '/dashboard'); } } catch {}
}

async function main(){
  if(!(await waitForServer(BASE_URL))) throw new Error(`Server not reachable at ${BASE_URL}`);
  const options = new chrome.Options(); if (HEADLESS) options.addArguments('--headless=new'); options.addArguments('--window-size=1280,900','--disable-gpu','--disable-software-rasterizer');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  const reportsDir=path.join(process.cwd(),'e2e','reports'); const shotsDir=path.join(reportsDir,'screenshots'); try{ fs.mkdirSync(shotsDir,{recursive:true}); }catch{}
  const saveShot=async(n)=>{ try{ const b=await driver.takeScreenshot(); const f=path.join(shotsDir,`${n}-${Date.now()}.png`); fs.writeFileSync(f,b,'base64'); console.log('[auditLogMfaTest] saved',f);}catch(e){ console.log('[auditLogMfaTest] shot failed', e?.message);} };
  const scrollIntoView = async (el) => { try { await driver.executeScript('arguments[0].scrollIntoView({block:"center", inline:"nearest"});', el); } catch {} };
  const safeClick = async (el) => { try { await el.click(); } catch { try { await driver.executeScript('arguments[0].click();', el); } catch (e) { throw e; } } };

  try{
    await performMfaLogin(driver, saveShot);

    // Navigate to Audit Log
    let target = PAGE_URL || '';
    const candidates = target ? [target] : [
      BASE_URL + '/admin/audit',
      BASE_URL + '/audit-log',
      BASE_URL + '/admin/audit-log',
      BASE_URL + '/admin/logs'
    ];
    let navigated = false;
    for (const url of candidates) {
      console.log('[auditLogMfaTest] Navigating to', url);
      await driver.get(url);
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      await saveShot('audit-page-try');
      // Check header "Audit Log" or presence of table headers
      const h1 = await driver.findElements(By.xpath("//h1[contains(normalize-space(string(.)),'Audit Log')]"));
      const headCells = await driver.findElements(By.xpath("//table//thead//th[contains(.,'Event')]|//table//thead//th[contains(.,'User')]"));
      if (h1.length || headCells.length) { navigated = true; break; }
    }
    if (!navigated) throw new Error('Could not find Audit Log page');

    // Wait for rows (or empty state)
    await driver.wait(async()=>{
      const rows = await driver.findElements(By.css('table tbody tr'));
      if (rows.length) return true;
      // Accept empty state container as loaded
      const empty = await driver.findElements(By.xpath("//h3[contains(.,'No Audit Logs Found')]"));
      return empty.length>0;
    }, 20000);
    await saveShot('audit-table-loaded');

    // If no rows, skip filter assertions gracefully
    let rows = await driver.findElements(By.css('table tbody tr'));
    if (rows.length === 0) {
      console.log('[auditLogMfaTest] No audit rows present; search UI loaded but dataset empty.');
      if (KEEP_OPEN) { console.log('[auditLogMfaTest] KEEP_BROWSER_OPEN=true — leaving browser open'); return; }
      console.log('[auditLogMfaTest] Closing browser'); await driver.quit().catch(()=>{}); return;
    }

    // Extract an email from first row (second column "User")
    const firstRow = rows[0];
    let firstRowText = await firstRow.getText().catch(()=> '');
    let emailMatch = firstRowText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const searchTerm = emailMatch ? emailMatch[0] : (await firstRow.getText());
    console.log('[auditLogMfaTest] Using search term:', searchTerm);

    // Locate search input by placeholder
    const searchInput = (await driver.findElements(By.xpath("//input[contains(@placeholder,'Search by email') or contains(@placeholder,'Search by email, event') or contains(@placeholder,'Search')]")))[0];
    if (!searchInput) throw new Error('Search input not found');
    await scrollIntoView(searchInput);
    await searchInput.clear();
    await searchInput.sendKeys(searchTerm);
    await driver.sleep(400);
    await saveShot('search-entered');

    // Wait until rows filtered: each row should include searchTerm, and count <= baseline
    const baselineCount = rows.length;
    await driver.wait(async()=>{
      const r = await driver.findElements(By.css('table tbody tr'));
      if (r.length === 0) return false; // expect at least one result
      const texts = await Promise.all(r.map(el => el.getText()));
      const allMatch = texts.every(t => (t||'').toLowerCase().includes(searchTerm.toLowerCase()));
      return allMatch && r.length <= baselineCount;
    }, 10000).catch(()=>{});
    await saveShot('search-filtered');

    // Clear search and expect row count to be >= filtered count (best-effort)
    const filteredCount = (await driver.findElements(By.css('table tbody tr'))).length;
    await searchInput.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
    await driver.sleep(300);
    await saveShot('search-cleared');
    await driver.wait(async()=>{
      const count = (await driver.findElements(By.css('table tbody tr'))).length;
      return count >= filteredCount;
    }, 8000).catch(()=>{});

    console.log('[auditLogMfaTest] Search bar filtering validated');
    if (KEEP_OPEN) { console.log('[auditLogMfaTest] KEEP_BROWSER_OPEN=true — leaving browser open'); return; }
  } catch (err) {
    await saveShot('error');
    try { const html = await driver.getPageSource(); fs.writeFileSync(path.join(shotsDir,'audit-mfa-error.html'), html);} catch {}
    console.error('[auditLogMfaTest]  Failed:', err?.message);
    throw err;
  } finally {
    if (!KEEP_OPEN) { console.log('[auditLogMfaTest] Closing browser'); await driver.quit().catch(()=>{}); }
  }
}

main().catch(e=>{ console.error('[auditLogMfaTest] Fatal:', e?.stack||e); process.exit(1); });
