#!/usr/bin/env node
/**
 * Generate License Key for Sponsor
 * 
 * Usage: 
 *   node scripts/send-sponsor-license.js email@example.com [username]
 *   
 * Environment Variables:
 *   LICENSE_SECRET - Your license key secret
 * 
 * After generating, trigger the GitHub workflow to create an issue:
 *   gh workflow run sponsor-license.yml -f sponsor_login=USERNAME -f sponsor_email=EMAIL
 */

const crypto = require('crypto');

// Get email from argument
const email = process.argv[2] || process.env.SPONSOR_EMAIL;
const sponsorName = process.argv[3] || process.env.SPONSOR_NAME || email?.split('@')[0] || 'Sponsor';

if (!email) {
    console.error('Usage: node send-sponsor-license.js <email> [github_username]');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/send-sponsor-license.js user@example.com octocat');
    process.exit(1);
}

// Get secret from environment
const secret = process.env.LICENSE_SECRET || '4f6fab93b5f0bfb47f3431ab19b230994e94cc946d479e27cf82b1b85c7aaee3';

// Generate license key
function generateLicenseKey(email) {
    const cleanEmail = email.toLowerCase().trim();
    const hash = crypto.createHmac('sha256', secret).update(cleanEmail).digest('hex');
    
    const part1 = hash.slice(0, 4).toUpperCase();
    const part2 = hash.slice(4, 8).toUpperCase();
    const part3 = hash.slice(8, 12).toUpperCase();
    const part4 = hash.slice(12, 16).toUpperCase();
    
    return `${part1}-${part2}-${part3}-${part4}`;
}

const licenseKey = generateLicenseKey(email);

console.log('=========================================');
console.log('   BLAZEYCC PRO/PRO+ LICENSE KEY');
console.log('=========================================');
console.log('');
console.log(`  Sponsor:  ${sponsorName}`);
console.log(`  Email:    ${email}`);
console.log(`  Key:      ${licenseKey}`);
console.log('');
console.log('=========================================');
console.log('');
console.log('To deliver via GitHub Issue, run:');
console.log('');
console.log(`  gh workflow run sponsor-license.yml \\`);
console.log(`    -f sponsor_login=${sponsorName} \\`);
console.log(`    -f sponsor_email=${email}`);
console.log('');
