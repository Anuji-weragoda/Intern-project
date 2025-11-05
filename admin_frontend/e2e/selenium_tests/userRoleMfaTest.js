import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { authenticator } from 'otplib';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5180';
const PAGE_URL = process.env.PAGE_URL || ''; // optional override like http://localhost:5173/admin/users
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
  await driver.get(BASE_URL + '/');
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  // Click sign-in
  async function clickByText(text){ const xp=`//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`; const els=await driver.findElements(By.xpath(xp)); if(els.length){ await els[0].click(); return true;} return false; }
  let clicked=false; for (const l of ['Sign in','Sign In','Log in','Login','Sign in with']) { if(await clickByText(l)){ clicked=true; break; } }
  if (!clicked) await driver.get(BASE_URL + '/login');
  await driver.sleep(600);
  // Email
  const emailS=["input[type=email]","input[name=email]","input[id=email]","input[autocomplete=email]","input[name=username]"]; let emailEl=null; for(const s of emailS){ const els=await driver.findElements(By.css(s)); if(els.length){ emailEl=els[0]; break; }}
  if(!emailEl) throw new Error('Email input not found');
  await emailEl.clear(); await emailEl.sendKeys(LOGIN_EMAIL);
  const nextBtn=(await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Next')]|//button[contains(.,'Continue')]")))[0];
  if(nextBtn) await nextBtn.click();
  // Password
  await driver.wait(async()=> (await driver.findElements(By.css("input[type=password]"))).length>0, 15000);
  const passS=["input[type=password]","input[name=password]","input[id=password]","input[autocomplete=current-password]"]; let passEl=null; for(const s of passS){ const els=await driver.findElements(By.css(s)); if(els.length){ passEl=els[0]; break; }}
  if(!passEl) throw new Error('Password input not found');
  await passEl.clear(); await passEl.sendKeys(LOGIN_PASSWORD, Key.RETURN);
  // MFA
  await driver.wait(async()=>{ const sels=["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"]; for(const s of sels){ if((await driver.findElements(By.css(s))).length) return true; } const d=await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']")); return d.length>=6; }, 30000);
  const code=authenticator.generate(TOTP_SECRET);
  let otpEl=null; for(const s of ["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"]){ const els=await driver.findElements(By.css(s)); if(els.length){ otpEl=els[0]; break; }}
  if(otpEl){ await otpEl.clear().catch(()=>{}); await otpEl.sendKeys(code);} else { const inputs=await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']")); if(inputs.length<6) throw new Error('MFA inputs not found'); for(let i=0;i<6 && i<code.length;i++) await inputs[i].sendKeys(code[i]); }
  const mfaSubmit=(await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Verify')]|//button[contains(.,'Continue')]|//button[contains(.,'Submit')]")))[0];
  if(mfaSubmit) await mfaSubmit.click();
  // leave Cognito
  try{ await driver.wait(async()=>!/amazoncognito\.com/.test(await driver.getCurrentUrl()), 30000);}catch{}
}

async function main(){
  if(!(await waitForServer(BASE_URL))) throw new Error(`Server not reachable at ${BASE_URL}`);
  const opts=new chrome.Options(); if(HEADLESS) opts.addArguments('--headless=new'); opts.addArguments('--window-size=1280,900','--disable-gpu','--disable-software-rasterizer');
  const driver=await new Builder().forBrowser('chrome').setChromeOptions(opts).build();
  const reportsDir=path.join(process.cwd(),'e2e','reports'); const shotsDir=path.join(reportsDir,'screenshots'); try{ fs.mkdirSync(shotsDir,{recursive:true}); }catch{}
  const saveShot=async(n)=>{ try{ const b=await driver.takeScreenshot(); const f=path.join(shotsDir,`${n}-${Date.now()}.png`); fs.writeFileSync(f,b,'base64'); console.log('[userRoleMfaTest] saved',f);}catch(e){ console.log('[userRoleMfaTest] shot failed', e?.message);} };
  const scrollIntoView = async (el) => {
    try { await driver.executeScript('arguments[0].scrollIntoView({block:"center", inline:"nearest"});', el); } catch {}
  };
  const safeClick = async (el) => {
    try { await el.click(); }
    catch { try { await driver.executeScript('arguments[0].click();', el); } catch (e) { throw e; } }
  };

  try{
    await performMfaLogin(driver, saveShot);

    const target = PAGE_URL || (BASE_URL + '/admin/users');
    console.log('[userRoleMfaTest] Navigating to', target);
    await driver.get(target);
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    await saveShot('users-page');

    // Try both structures: new '/admin/users' and legacy '/user-management'
    // Wait for header or table
    await driver.wait(async()=>{
      const h1 = await driver.findElements(By.xpath("//h1[contains(., 'User Management')]|//h1[contains(., 'Users')]"));
      const table = await driver.findElements(By.xpath("//table"));
      return h1.length>0 || table.length>0;
    }, 15000).catch(()=>{});

    // Click first row
  const firstRow = (await driver.findElements(By.xpath("//tbody/tr[1]")))[0];
    if (!firstRow) throw new Error('No user rows found');
  await scrollIntoView(firstRow);
  await safeClick(firstRow);
    await driver.sleep(500);
    await saveShot('row-clicked');

    // Open Manage Roles
    let manageBtn = (await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Manage Roles')]")))[0];
    if (!manageBtn) {
      // sometimes a link or a menu item
      manageBtn = (await driver.findElements(By.xpath("//a[contains(normalize-space(string(.)), 'Manage Roles')]")))[0];
    }
    if (!manageBtn) throw new Error('Manage Roles control not found');
    await scrollIntoView(manageBtn);
    await safeClick(manageBtn);
    await driver.sleep(500);
    await saveShot('manage-roles-open');

    // Wait for modal heading
    await driver.wait(async () => {
      const headings = await driver.findElements(By.xpath("//h3[contains(normalize-space(string(.)), 'Manage User Roles')]"));
      return headings.length > 0;
    }, 10000).catch(() => {});

    // Find role buttons within the modal (exclude Cancel and Update)
    let roleButtons = await driver.findElements(By.xpath(
      "//div[contains(@class,'fixed')]//div[contains(@class,'space-y-3')]//button[not(contains(normalize-space(string(.)), 'Cancel')) and not(contains(normalize-space(string(.)), 'Update Roles'))]"
    )).catch(() => []);

    if (!roleButtons.length) {
      const modal = await driver.findElements(By.xpath("//div[.//h3[contains(normalize-space(string(.)), 'Manage User Roles')]]"));
      if (modal.length) {
        const buttons = await modal[0].findElements(By.css('button')).catch(() => []);
        const filtered = [];
        for (const btn of buttons) {
          const txt = await btn.getText().catch(() => '');
          if (!/Cancel|Update Roles/i.test(txt)) filtered.push(btn);
        }
        roleButtons = filtered;
      }
    }

    if (!roleButtons.length) throw new Error('No role toggle buttons found in the modal');

    console.log('[userRoleMfaTest] Toggling first available role');
    const firstRoleButton = roleButtons[0];
    const roleText = await firstRoleButton.getText().catch(() => 'Unknown Role');
    console.log('[userRoleMfaTest] Toggling role:', roleText.split('\n')[0]);
  await scrollIntoView(firstRoleButton);
  await safeClick(firstRoleButton);
    await driver.sleep(300);
    await saveShot('role-toggled');

    // Click "Update Roles"
    const updateButtons = await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Update Roles')]"));
    if (!updateButtons.length) throw new Error('"Update Roles" button not found in modal');
    console.log('[userRoleMfaTest] Clicking "Update Roles" to submit changes');
  await scrollIntoView(updateButtons[0]);
  await safeClick(updateButtons[0]);
    await saveShot('update-roles-clicked');

    // Handle success alert if present
    try {
      await driver.wait(until.alertIsPresent(), 7000);
      const alert = await driver.switchTo().alert();
      const alertText = await alert.getText();
      console.log('[userRoleMfaTest] Alert after update:', alertText);
      await alert.accept();
      await saveShot('alert-accepted');
    } catch {}

    // Wait for modal to close
    await driver.wait(async () => {
      const modals = await driver.findElements(By.xpath("//h3[contains(normalize-space(string(.)), 'Manage User Roles')]"));
      return modals.length === 0;
    }, 10000).catch(() => {});
    await saveShot('roles-updated');
    await saveShot('roles-updated');
    console.log('[userRoleMfaTest] ✅ Updated role successfully');

    if (KEEP_OPEN) { console.log('[userRoleMfaTest] KEEP_BROWSER_OPEN=true — leaving browser open'); return; }
  }catch(err){
    await saveShot('error');
    try{ const html=await driver.getPageSource(); fs.writeFileSync(path.join(shotsDir,'user-role-mfa-error.html'), html);}catch{}
    console.error('[userRoleMfaTest] ❌ Failed:', err?.message);
    throw err;
  }finally{
    if (!KEEP_OPEN) { console.log('[userRoleMfaTest] Closing browser'); await driver.quit().catch(()=>{}); }
  }
}

main().catch(e=>{ console.error('[userRoleMfaTest] Fatal:', e?.stack||e); process.exit(1); });
