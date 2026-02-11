const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/i18n/translations/en.json');
const arPath = path.join(__dirname, '../src/i18n/translations/ar.json');

function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

try {
    const stripBom = (str) => {
        if (str.charCodeAt(0) === 0xFEFF) {
            return str.slice(1);
        }
        return str;
    };

    const enContent = fs.readFileSync(enPath, 'utf8');
    const arContent = fs.readFileSync(arPath, 'utf8');

    const en = JSON.parse(stripBom(enContent));
    const ar = JSON.parse(stripBom(arContent));

    const enKeys = Object.keys(flattenObject(en));
    const arKeys = Object.keys(flattenObject(ar));

    const missingInAr = enKeys.filter(key => !arKeys.includes(key));
    const extraInAr = arKeys.filter(key => !enKeys.includes(key));

    console.log('--- i18n Parity Report ---');
    console.log(`Total EN keys: ${enKeys.length}`);
    console.log(`Total AR keys: ${arKeys.length}`);

    if (missingInAr.length > 0) {
        console.log('\n❌ Missing keys in AR (compared to EN):');
        missingInAr.forEach(k => console.log(`  - ${k}`));
    } else {
        console.log('\n✅ No missing keys in AR.');
    }

    if (extraInAr.length > 0) {
        console.log('\n⚠️ Extra keys in AR (not in EN):');
        extraInAr.forEach(k => console.log(`  - ${k}`));
    }

    process.exit(missingInAr.length > 0 ? 1 : 0);

} catch (err) {
    console.error('Error reading or parsing translation files:', err);
    process.exit(1);
}
