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

async function performMfaLogin(driver) {
  await driver.get(BASE_URL + '/');
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  async function clickByText(text){ const xp=`//button[contains(normalize-space(string(.)), "${text}")] | //a[contains(normalize-space(string(.)), "${text}")]`; const els=await driver.findElements(By.xpath(xp)); if(els.length){ await els[0].click(); return true;} return false; }
  let clicked=false; for (const l of ['Sign in','Sign In','Log in','Login','Sign in with']) { if(await clickByText(l)){ clicked=true; break; } }
  if (!clicked) await driver.get(BASE_URL + '/login');
  await driver.sleep(600);
  const emailS=["input[type=email]","input[name=email]","input[id=email]","input[autocomplete=email]","input[name=username]"]; let emailEl=null; for(const s of emailS){ const els=await driver.findElements(By.css(s)); if(els.length){ emailEl=els[0]; break; }}
  if(!emailEl) throw new Error('Email input not found');
  await emailEl.clear(); await emailEl.sendKeys(LOGIN_EMAIL);
  const nextBtn=(await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Next')]|//button[contains(.,'Continue')]")))[0];
  if(nextBtn) await nextBtn.click();
  await driver.wait(async()=> (await driver.findElements(By.css("input[type=password]"))).length>0, 15000);
  const passS=["input[type=password]","input[name=password]","input[id=password]","input[autocomplete=current-password]"]; let passEl=null; for(const s of passS){ const els=await driver.findElements(By.css(s)); if(els.length){ passEl=els[0]; break; }}
  if(!passEl) throw new Error('Password input not found');
  await passEl.clear(); await passEl.sendKeys(LOGIN_PASSWORD, Key.RETURN);
  await driver.wait(async()=>{ const sels=["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"]; for(const s of sels){ if((await driver.findElements(By.css(s))).length) return true; } const d=await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']")); return d.length>=6; }, 30000);
  const code=authenticator.generate(TOTP_SECRET);
  let otpEl=null; for(const s of ["input[name=code]","input[name=otp]","input[id=code]","input[id=otp]","input[autocomplete=one-time-code]","input[type=tel]"]){ const els=await driver.findElements(By.css(s)); if(els.length){ otpEl=els[0]; break; }}
  if(otpEl){ await otpEl.clear().catch(()=>{}); await otpEl.sendKeys(code);} else { const inputs=await driver.findElements(By.css("input[type=tel], input[aria-label*='digit']")); if(inputs.length<6) throw new Error('MFA inputs not found'); for(let i=0;i<6 && i<code.length;i++) await inputs[i].sendKeys(code[i]); }
  const mfaSubmit=(await driver.findElements(By.css('button[type=submit]')))[0] || (await driver.findElements(By.xpath("//button[contains(.,'Verify')]|//button[contains(.,'Continue')]|//button[contains(.,'Submit')]")))[0];
  if(mfaSubmit) await mfaSubmit.click();
  try{ await driver.wait(async()=>!/amazoncognito\.com/.test(await driver.getCurrentUrl()), 30000);}catch{}
}

async function main(){
  if(!(await waitForServer(BASE_URL))) throw new Error(`Server not reachable at ${BASE_URL}`);
  const opts=new chrome.Options(); if(HEADLESS) opts.addArguments('--headless=new'); opts.addArguments('--window-size=1280,900','--disable-gpu','--disable-software-rasterizer');
  const driver=await new Builder().forBrowser('chrome').setChromeOptions(opts).build();
  const reportsDir=path.join(process.cwd(),'e2e','reports'); const shotsDir=path.join(reportsDir,'screenshots'); try{ fs.mkdirSync(shotsDir,{recursive:true}); }catch{}
  const saveShot=async(n)=>{ try{ const b=await driver.takeScreenshot(); const f=path.join(shotsDir,`${n}-${Date.now()}.png`); fs.writeFileSync(f,b,'base64'); console.log('[signOutMfaTest] saved',f);}catch(e){ console.log('[signOutMfaTest] shot failed', e?.message);} };

  try{
    await performMfaLogin(driver);

    // Open dashboard to show navbar
    await driver.get(BASE_URL + '/dashboard');
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    await saveShot('dashboard');

    // Open profile dropdown
    const profileBtns = await driver.findElements(By.xpath("//button[.//div[contains(@class,'rounded-full')]]"));
    if(!profileBtns.length) throw new Error('Profile dropdown button not found');
    await profileBtns[0].click();
    await driver.sleep(400);
    await saveShot('dropdown-open');

    // Click Sign out
    let signOut = (await driver.findElements(By.xpath("//button[contains(normalize-space(string(.)), 'Sign out')]")))[0];
    if(!signOut) signOut = (await driver.findElements(By.xpath("//a[contains(normalize-space(string(.)), 'Sign out')]|//a[contains(normalize-space(string(.)), 'Logout')]")))[0];
    if(!signOut) throw new Error('Sign out control not found');
    await signOut.click();
    await saveShot('signout-clicked');

    // Validate logged out: look for Login/Sign in on page
    await driver.wait(async()=>{
      const body = await driver.executeScript('return document.body && document.body.innerText || ""');
      return /Sign in|Log in|Login/i.test(body);
    }, 15000);
    await saveShot('signed-out');
    console.log('[signOutMfaTest] ✅ Signed out successfully after MFA login');

    if (KEEP_OPEN) { console.log('[signOutMfaTest] KEEP_BROWSER_OPEN=true — leaving browser open'); return; }
  }catch(err){
    await saveShot('error');
    try{ const html=await driver.getPageSource(); fs.writeFileSync(path.join(shotsDir,'signout-mfa-error.html'), html);}catch{}
    console.error('[signOutMfaTest] ❌ Failed:', err?.message);
    throw err;
  }finally{
    if (!KEEP_OPEN) { console.log('[signOutMfaTest] Closing browser'); await driver.quit().catch(()=>{}); }
  }
}

main().catch(e=>{ console.error('[signOutMfaTest] Fatal:', e?.stack||e); process.exit(1); });
