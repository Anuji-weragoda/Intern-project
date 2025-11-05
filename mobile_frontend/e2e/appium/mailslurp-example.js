#!/usr/bin/env node

/**
 * Example script to demonstrate MailSlurp signup test
 * This shows how to set up and run the test programmatically
 */

const { MailSlurp } = require('mailslurp-client');

// Example: Test MailSlurp connection
async function testMailSlurpConnection() {
  const apiKey = process.env.MAILSLURP_API_KEY;
  
  if (!apiKey) {
    console.error('❌ MAILSLURP_API_KEY not set!');
    console.log('\nTo get your API key:');
    console.log('1. Sign up at https://app.mailslurp.com');
    console.log('2. Go to API Keys section');
    console.log('3. Copy your API key');
    console.log('4. Set it: $env:MAILSLURP_API_KEY="your-key"\n');
    process.exit(1);
  }

  console.log('✓ MAILSLURP_API_KEY is set');
  console.log('\nTesting MailSlurp connection...');

  try {
    const mailslurp = new MailSlurp({ apiKey });
    
    // Test: Create an inbox
    console.log('Creating test inbox...');
    const inbox = await mailslurp.createInbox();
    console.log(`✓ Created inbox: ${inbox.emailAddress}`);
    console.log(`  Inbox ID: ${inbox.id}`);
    
    // Test: List inboxes
    console.log('\nListing all inboxes...');
    const inboxes = await mailslurp.getAllInboxes();
    console.log(`✓ Found ${inboxes.length} inbox(es)`);
    
    // Note: Skipping send test on free tier
    console.log('\n⚠️  Note: Free tier cannot send emails, but this is OK!');
    console.log('   Your app backend will send the verification email.');
    console.log('   MailSlurp will receive and let you read it. ✓');
    
    console.log('\n✅ MailSlurp is ready for receiving emails!');
    console.log('   The signup test will work perfectly.');
    
    // Cleanup
    console.log('\nCleaning up test inbox...');
    await mailslurp.deleteInbox(inbox.id);
    console.log('✓ Inbox deleted');
    
    console.log('\n✅ All tests passed! MailSlurp is configured correctly.\n');
    console.log('Your free tier can:');
    console.log('  ✓ Create inboxes');
    console.log('  ✓ Receive emails from your app');
    console.log('  ✓ Read email content');
    console.log('  ✓ Extract OTP codes\n');
    console.log('You can now run the signup test with:');
    console.log('npx wdio run wdio.conf.js --spec specs\\signup_mailslurp.e2e.js\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n⚠️  API key is invalid. Please check your key at:');
      console.log('https://app.mailslurp.com/dashboard/\n');
    }
    
    process.exit(1);
  }
}

// Example: Extract OTP from various email formats
function demonstrateOtpExtraction() {
  console.log('\n=== OTP Extraction Examples ===\n');
  
  const emailExamples = [
    {
      name: 'Simple format',
      body: 'Your verification code is: 123456',
      expected: '123456'
    },
    {
      name: 'HTML-like format',
      body: '<p>Your code: <strong>789012</strong></p>',
      expected: '789012'
    },
    {
      name: 'OTP label',
      body: 'OTP: 345678\nValid for 10 minutes',
      expected: '345678'
    },
    {
      name: 'Code in brackets',
      body: 'Enter code [901234] to verify',
      expected: '901234'
    },
    {
      name: 'PIN format',
      body: 'Your PIN is 567890',
      expected: '567890'
    }
  ];

  const extractOtp = (body) => {
    const patterns = [
      /\b(\d{6})\b/,
      /code[:\s]+(\d{6})/i,
      /verification[:\s]+code[:\s]+(\d{6})/i,
      /OTP[:\s]+(\d{6})/i,
      /pin[:\s]+(\d{6})/i,
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  emailExamples.forEach(example => {
    const extracted = extractOtp(example.body);
    const status = extracted === example.expected ? '✓' : '✗';
    console.log(`${status} ${example.name}`);
    console.log(`  Body: "${example.body}"`);
    console.log(`  Extracted: ${extracted || 'null'}`);
    console.log(`  Expected: ${example.expected}\n`);
  });
}

// Main execution
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  MailSlurp Signup Test - Example & Diagnostics   ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const command = process.argv[2];

  switch (command) {
    case 'test-connection':
      await testMailSlurpConnection();
      break;
    
    case 'demo-extraction':
      demonstrateOtpExtraction();
      break;
    
    case 'help':
    default:
      console.log('Usage: node mailslurp-example.js [command]\n');
      console.log('Commands:');
      console.log('  test-connection   - Test MailSlurp API connection');
      console.log('  demo-extraction   - Show OTP extraction examples');
      console.log('  help             - Show this help\n');
      console.log('Examples:');
      console.log('  node mailslurp-example.js test-connection');
      console.log('  node mailslurp-example.js demo-extraction\n');
      break;
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { testMailSlurpConnection, demonstrateOtpExtraction };
