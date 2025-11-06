// Quick parse check for a spec file without executing tests
const path = require('path');
const fs = require('fs');

const specRel = process.argv[2] || 'specs/password_reset_mailslurp.e2e.js';
const specPath = path.resolve(process.cwd(), specRel);
if (!fs.existsSync(specPath)) {
  console.error('Spec file not found:', specPath);
  process.exit(2);
}
try {
  // Provide minimal mocha globals so the spec can load without executing
  global.describe = function(){};
  global.it = function(){};
  global.before = function(){};
  global.after = function(){};
  global.beforeEach = function(){};
  global.afterEach = function(){};
  require(specPath);
  console.log('Parsed OK:', specRel);
} catch (e) {
  console.error('Parse failed:', e && (e.stack || e.message || e));
  process.exit(1);
}
