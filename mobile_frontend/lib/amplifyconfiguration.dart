const amplifyconfig = '''{
  "auth": {
    "plugins": {
      "awsCognitoAuthPlugin": {
        "UserAgent": "aws-amplify-cli/2.0",
        "Version": "1.0",
        "IdentityManager": { "Default": {} },
        "CognitoUserPool": {
          "Default": {
            "PoolId": "eu-north-1_eOvAx8nlu",
            "AppClientId": "5c240232vn1sktt36c0cr0054k",
            "Region": "eu-north-1"
          }
        }
      }
    }
  }
}''';
