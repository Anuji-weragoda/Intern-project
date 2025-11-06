#!/usr/bin/env node

/**
 * Setup script to create a test user in Cognito for password reset testing
 * Usage: node setup-test-user.js <email> <password>
 */

const AWS = require('aws-sdk');

const TEST_EMAIL = process.argv[2] || '60316073-a4de-48ea-a638-08801b5c8354@mailslurp.biz';
const TEMP_PASSWORD = process.argv[3] || 'TempPass123!@#';

const cognitoParams = {
  region: 'eu-north-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(cognitoParams);

const USER_POOL_ID = 'eu-north-1_eOvAx8nlu';

async function createTestUser() {
  try {
    console.log(`\n📧 Creating test user: ${TEST_EMAIL}`);
    console.log(`🔑 User Pool ID: ${USER_POOL_ID}`);
    
    const params = {
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
      TemporaryPassword: TEMP_PASSWORD,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        {
          Name: 'email',
          Value: TEST_EMAIL
        },
        {
          Name: 'email_verified',
          Value: 'true'
        }
      ]
    };

    const result = await cognitoIdentityServiceProvider.adminCreateUser(params).promise();
    
    console.log(`✅ User created successfully!`);
    console.log(`   Username: ${result.User.Username}`);
    console.log(`   Status: ${result.User.UserStatus}`);
    console.log(`\n✨ Test user is ready for password reset testing!`);
    
  } catch (error) {
    if (error.code === 'UsernameExistsException') {
      console.log(`⚠️  User already exists: ${TEST_EMAIL}`);
      console.log(`✅ Proceeding with existing user`);
    } else {
      console.error(`❌ Error creating user: ${error.message}`);
      process.exit(1);
    }
  }
}

createTestUser();
