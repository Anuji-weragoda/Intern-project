import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { authenticator } from 'otplib';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
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
  console.log('[profileMfaTest] Starting MFA login');
  await driver.get(BASE_URL + '/');
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  await saveShot('home');

  // Click sign-in
  async function clickByText(text) {
    const xp = `//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`;
    const els = await driver.findElements(By.xpath(xp));
    if (els.length) { await els[0].click(); return true; }
    return false;
  }
  const labels = ['Sign in', 'Sign In', 'Log in', 'Login', 'Sign in with'];
  let clicked = false;
  for (const l of labels) { if (await clickByText(l)) { console.log('[profileMfaTest] Clicked', l); clicked = true; break; } }
  if (!clicked) { await driver.get(BASE_URL + '/login'); }
  await driver.sleep(800);
  await saveShot('login-start');

  // Email
  const emailSelectors = ["input[type=email]","input[name=email]","input[id=email]","input[autocomplete=email]","input[name=username]","input#username"];
  let emailEl = null;
  for (const s of emailSelectors) { const els = await driver.findElements(By.css(s)); if (els.length) { emailEl = els[0]; break; } }
  if (!emailEl) throw new Error('Email input not found');
  await emailEl.clear();
  await emailEl.sendKeys(LOGIN_EMAIL);
  const nextBtn = (await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Next')]|//button[contains(.,'Continue')]")))[0];
  if (nextBtn) await nextBtn.click();
  await saveShot('email-submitted');

  // Password
  await driver.wait(async () => (await driver.findElements(By.css("input[type=password]"))).length > 0, 15000);
  const passSelectors = ["input[type=password]","input[name=password]","input[id=password]","input[autocomplete=current-password]"];
  let passEl = null; for (const s of passSelectors) { const els = await driver.findElements(By.css(s)); if (els.length) { passEl = els[0]; break; } }
  if (!passEl) throw new Error('Password input not found');
  await passEl.clear();
  await passEl.sendKeys(LOGIN_PASSWORD, Key.RETURN);
  await saveShot('password-submitted');

  // MFA input
  console.log('[profileMfaTest] Waiting for MFA input');
  await driver.wait(async () => {
    const selects = ["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"];
    for (const s of selects) { if ((await driver.findElements(By.css(s))).length) return true; }
    const digits = await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']"));
    return digits.length >= 6;
  }, 30000);

  const otp = authenticator.generate(TOTP_SECRET);
  console.log('[profileMfaTest] Generated TOTP (masked):', otp.replace(/.(?=.{2}$)/g,'*'));
  let otpEl = null;
  for (const s of ["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"]) {
    const els = await driver.findElements(By.css(s)); if (els.length) { otpEl = els[0]; break; }
  }
  if (otpEl) {
    await otpEl.clear().catch(()=>{});
    await otpEl.sendKeys(otp);
  } else {
    const digitInputs = await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']"));
    if (digitInputs.length < 6) throw new Error('MFA inputs not found');
    for (let i=0;i<6 && i<otp.length;i++) await digitInputs[i].sendKeys(otp[i]);
  }
  await saveShot('mfa-filled');
  const mfaSubmit = (await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Verify')]|//button[contains(.,'Continue')]|//button[contains(.,'Submit')]")))[0];
  if (mfaSubmit) await mfaSubmit.click();
  await saveShot('mfa-submitted');

  // leave Cognito
  try { await driver.wait(async()=>!/amazoncognito\.com/.test(await driver.getCurrentUrl()),30000); } catch {}
  // jwt param -> dashboard
  try { const cur = await driver.getCurrentUrl(); if (/[?&]jwt=/.test(cur)) { const u=new URL(cur); await driver.get(u.origin+'/dashboard'); } } catch {}
}

async function main(){
  if(!(await waitForServer(BASE_URL))) throw new Error(`Server not reachable at ${BASE_URL}`);
  const options = new chrome.Options();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,900');
  options.addArguments('--disable-gpu','--disable-software-rasterizer');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  const shotsDir = path.join(reportsDir,'screenshots');
  try { fs.mkdirSync(shotsDir,{recursive:true}); } catch{}
  const saveShot = async (n)=>{ try{ const b=await driver.takeScreenshot(); const f=path.join(shotsDir,`${n}-${Date.now()}.png`); fs.writeFileSync(f,b,'base64'); console.log('[profileMfaTest] saved',f);}catch(e){console.log('[profileMfaTest] shot failed',e?.message)}};

  try{
    await performMfaLogin(driver, saveShot);

    // Go to dashboard for navbar
    await driver.get(BASE_URL + '/dashboard');
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    await saveShot('dashboard');

    // Open profile dropdown
    const profileBtns = await driver.findElements(By.xpath("//button[.//div[contains(@class,'rounded-full')]]"));
    if (!profileBtns.length) throw new Error('Profile dropdown button not found');
    await profileBtns[0].click();
    await driver.sleep(400);
    await saveShot('profile-dropdown');

    // Click View Profile
    const viewLinks = await driver.findElements(By.xpath("//a[contains(normalize-space(string(.)), 'View Profile')]"));
    if (!viewLinks.length) throw new Error('"View Profile" link not found');
    await viewLinks[0].click();
    await driver.sleep(800);
    await saveShot('profile-page');

    // Wait for profile header
    await driver.wait(async()=> (await driver.findElements(By.xpath("//h1[contains(normalize-space(string(.)),'My Profile')]"))).length>0, 10000);

    // Edit profile
    const editBtns = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Edit Profile')]"));
    if (!editBtns.length) throw new Error('Edit Profile button not found');
    await editBtns[0].click();
    await driver.sleep(400);
    await saveShot('edit-mode');

    // Fill fields (best-effort selectors)
    const dn = await driver.findElements(By.css("input[name='displayName']")); if (dn.length){ await dn[0].clear(); await dn[0].sendKeys('Test User MFA'); }
    const un = await driver.findElements(By.css("input[name='username']")); if (un.length){ await un[0].clear(); await un[0].sendKeys('testuser_mfa'); }
    const ph = await driver.findElements(By.css("input[name='phoneNumber']")); if (ph.length){ await ph[0].clear(); await ph[0].sendKeys('+1-555-000-1234'); }
    const loc = await driver.findElements(By.css("select[name='locale']")); if (loc.length){ await loc[0].sendKeys('es'); }
    await saveShot('form-filled');

    // Save changes
    const saveBtn = (await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Save Changes')]")))[0];
    if (!saveBtn) throw new Error('Save Changes button not found');
    await saveBtn.click();
    await saveShot('save-clicked');

    // Wait success
    await driver.wait(async()=> (await driver.findElements(By.xpath("//div[contains(@class,'border-green-500')]//h4[contains(normalize-space(string(.)), 'Success!')]"))).length>0, 15000);
    await saveShot('profile-updated');
    console.log('[profileMfaTest] ✅ Profile updated with MFA login');

    if (KEEP_OPEN) { console.log('[profileMfaTest] KEEP_BROWSER_OPEN=true — leaving browser open'); return; }
  }catch(err){
    await saveShot('error');
    try{ const html=await driver.getPageSource(); fs.writeFileSync(path.join(shotsDir,'profile-mfa-error.html'), html);}catch{}
    console.error('[profileMfaTest] ❌ Failed:', err?.message);
    throw err;
  }finally{
    if (!KEEP_OPEN) { console.log('[profileMfaTest] Closing browser'); await driver.quit().catch(()=>{}); }
  }
}

main().catch(e=>{ console.error('[profileMfaTest] Fatal:', e?.stack||e); process.exit(1); });
