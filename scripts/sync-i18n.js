const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/i18n/translations/en.json');
const arPath = path.join(__dirname, '../src/i18n/translations/ar.json');

const stripBom = (str) => {
    if (str.charCodeAt(0) === 0xFEFF) {
        return str.slice(1);
    }
    return str;
};

// Flatten object to dot notation
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

// Unflatten dot notation to object
function unflattenObject(data) {
    const result = {};
    for (const i in data) {
        const keys = i.split('.');
        keys.reduce((acc, key, index) => {
            return acc[key] || (acc[key] = isNaN(Number(keys[index + 1])) ? (keys.length - 1 === index ? data[i] : {}) : []);
        }, result);
    }
    return result;
}

try {
    const enContent = fs.readFileSync(enPath, 'utf8');
    const arContent = fs.readFileSync(arPath, 'utf8');

    const en = JSON.parse(stripBom(enContent));
    const ar = JSON.parse(stripBom(arContent));

    const enFlat = flattenObject(en);
    const arFlat = flattenObject(ar);

    const enKeys = Object.keys(enFlat);
    const arKeys = Object.keys(arFlat);

    let enModified = false;
    let arModified = false;

    // 1. Add missing keys to AR
    enKeys.forEach(key => {
        if (!arFlat.hasOwnProperty(key)) {
            console.log(`Adding missing key to AR: ${key}`);
            arFlat[key] = enFlat[key]; // Use English value as fallback
            arModified = true;
        }
    });

    // 2. Add missing keys to EN (from AR)
    arKeys.forEach(key => {
        if (!enFlat.hasOwnProperty(key)) {
            console.log(`Adding missing key to EN: ${key}`);
            // Try to provide a reasonable default or use AR value
            // Since we don't have a translator, we'll use the AR value prefixed or just the key name if complex
            enFlat[key] = arFlat[key];
            enModified = true;
        }
    });

    if (arModified) {
        const newAr = unflattenObject(arFlat);
        fs.writeFileSync(arPath, JSON.stringify(newAr, null, 2));
        console.log('✅ Updated ar.json');
    }

    if (enModified) {
        const newEn = unflattenObject(enFlat);
        fs.writeFileSync(enPath, JSON.stringify(newEn, null, 2));
        console.log('✅ Updated en.json');
    }

    if (!arModified && !enModified) {
        console.log('✅ Both files are already in sync.');
    }

} catch (err) {
    console.error('Error syncing files:', err);
}
