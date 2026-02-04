const fs = require('fs');

const en = JSON.parse(fs.readFileSync('src/i18n/translations/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('src/i18n/translations/ar.json', 'utf8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = getAllKeys(en);
const arKeys = getAllKeys(ar);

console.log('Total English keys:', enKeys.length);
console.log('Total Arabic keys:', arKeys.length);

const missingInArabic = enKeys.filter(key => !arKeys.includes(key));
const extraInArabic = arKeys.filter(key => !enKeys.includes(key));

if (missingInArabic.length > 0) {
  console.log('\nKeys missing in Arabic:');
  missingInArabic.forEach(key => console.log('  -', key));
}

if (extraInArabic.length > 0) {
  console.log('\nExtra keys in Arabic:');
  extraInArabic.forEach(key => console.log('  -', key));
}

if (missingInArabic.length === 0 && extraInArabic.length === 0) {
  console.log('\n✅ All translations are synchronized!');
}

// Check for hardcoded strings in translation values
console.log('\n=== Checking for hardcoded strings ===');

const suspiciousPatterns = [
  /English/i,
  /العربية/i,
  /Arabic/i,
  /EN/i,
  /AR/i,
  /RTL/i,
  /LTR/i
];

function checkForHardcoded(obj, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          console.log(`Potentially hardcoded string in ${fullKey}: "${value}"`);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      checkForHardcoded(value, fullKey);
    }
  }
}

console.log('\nChecking English translations for hardcoded strings...');
checkForHardcoded(en);

console.log('\nChecking Arabic translations for hardcoded strings...');
checkForHardcoded(ar);