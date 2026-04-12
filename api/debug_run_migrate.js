const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { runMigrations } = require('./scripts/migrate');

(async () => {
  try {
    await runMigrations();
    console.log('DEBUG: Migration finished.');
  } catch (err) {
    console.error('DEBUG ERROR MESSAGE:', err.message || err);
    console.error('DEBUG ERROR STACK:', err.stack || err);
    if (err.code) console.error('DEBUG ERROR CODE:', err.code);
    if (err.detail) console.error('DEBUG ERROR DETAIL:', err.detail);
    if (err.hint) console.error('DEBUG ERROR HINT:', err.hint);
    process.exit(1);
  }
})();
