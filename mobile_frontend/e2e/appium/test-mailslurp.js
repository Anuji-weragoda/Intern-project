#!/usr/bin/env node

/**
 * MailSlurp verification script
 * Tests if the API key works and lists available inboxes
 */

const { MailSlurp } = require('mailslurp-client');

async function testMailSlurpAPI() {
  const apiKey = process.env.MAILSLURP_API_KEY || 'c86e3a916e92cd5ccd3135c3ad403fd326a5108364fb415503bf304a571c0fae';
  
  console.log('\n🔍 Testing MailSlurp API...');
  console.log('API Key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 10));
  
  try {
    const mailslurp = new MailSlurp({ apiKey });
    
    console.log('\n📧 Fetching all inboxes...');
    const result = await mailslurp.getAllInboxes();
    
    console.log('\n📋 Result type:', typeof result);
    console.log('📋 Result keys:', Object.keys(result).slice(0, 5).join(', '));
    
    // Try different ways to access inboxes
    const inboxes = Array.isArray(result) ? result : (result.inboxes || result.value || result);
    
    if (Array.isArray(inboxes)) {
      console.log(`\n✅ Found ${inboxes.length} inboxes:`);
      inboxes.forEach((inbox, i) => {
        console.log(`  ${i + 1}. ${inbox.emailAddress}`);
      });
    } else {
      console.log('\n❌ Could not parse inboxes from response');
      console.log('Raw result:', JSON.stringify(result).substring(0, 500));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  }
}

testMailSlurpAPI().catch(console.error);
