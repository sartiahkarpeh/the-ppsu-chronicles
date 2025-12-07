/**
 * Script to set admin role for Firebase users
 * Usage: node scripts/setAdminRole.js <email> <role>
 * Example: node scripts/setAdminRole.js admin@example.com admin
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Set custom claims (role) for a user
 * @param {string} email - User email
 * @param {string} role - Role to set ('admin' or 'editor')
 */
async function setAdminRole(email, role) {
  try {
    // Validate role
    if (!['admin', 'editor'].includes(role)) {
      console.error('❌ Invalid role. Use "admin" or "editor"');
      process.exit(1);
    }

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, { role });
    
    console.log(`✅ Successfully set role '${role}' for ${email}`);
    console.log(`   User ID: ${user.uid}`);
    console.log('\n📝 User must sign out and sign in again for changes to take effect.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin role:', error.message);
    process.exit(1);
  }
}

/**
 * List all users with custom claims
 */
async function listAdminUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    
    console.log('\n👥 Users with admin roles:\n');
    
    let found = false;
    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims;
      if (customClaims && customClaims.role) {
        console.log(`📧 ${userRecord.email}`);
        console.log(`   Role: ${customClaims.role}`);
        console.log(`   UID: ${userRecord.uid}\n`);
        found = true;
      }
    }
    
    if (!found) {
      console.log('   No users with admin roles found.\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  }
}

/**
 * Remove admin role from user
 */
async function removeAdminRole(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, null);
    
    console.log(`✅ Removed admin role from ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing role:', error.message);
    process.exit(1);
  }
}

// Command-line interface
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
  listAdminUsers();
} else if (command === 'remove' && args[1]) {
  removeAdminRole(args[1]);
} else if (args.length === 2) {
  const [email, role] = args;
  setAdminRole(email, role);
} else {
  console.log('AFCON 2025 - Admin Role Manager\n');
  console.log('Usage:');
  console.log('  node scripts/setAdminRole.js <email> <role>');
  console.log('  node scripts/setAdminRole.js list');
  console.log('  node scripts/setAdminRole.js remove <email>\n');
  console.log('Examples:');
  console.log('  node scripts/setAdminRole.js admin@example.com admin');
  console.log('  node scripts/setAdminRole.js editor@example.com editor');
  console.log('  node scripts/setAdminRole.js list');
  console.log('  node scripts/setAdminRole.js remove admin@example.com\n');
  process.exit(1);
}

