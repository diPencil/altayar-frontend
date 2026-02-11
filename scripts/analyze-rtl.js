const fs = require('fs');
const path = require('path');
const glob = require('glob'); // You might need to install glob if not available, but I'll use recursive readdir for zero dependencies

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'assets') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const projectRoot = path.join(__dirname, '..', 'src'); // Adjust if needed
const appRoot = path.join(__dirname, '..', 'app');

console.log('Scanning for RTL issues...');

const files = [
    ...getAllFiles(projectRoot, []),
    ...getAllFiles(appRoot, [])
];

let issues = {
    rowReverse: [],
    hardcodedMargins: [],
    hardcodedAlign: [],
    manualRtlLogic: []
};

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(path.join(__dirname, '..'), file);

    // check for row-reverse which might indicate double flipping if I18nManager is used
    if (content.includes("row-reverse")) {
        issues.rowReverse.push(relativePath);
    }

    // check for marginLeft/marginRight
    if (content.includes("marginLeft") || content.includes("marginRight") || content.includes("paddingLeft") || content.includes("paddingRight")) {
        issues.hardcodedMargins.push(relativePath);
    }

    // check for textAlign left/right
    if (content.includes("textAlign: 'left'") || content.includes('textAlign: "left"') || content.includes("textAlign: 'right'") || content.includes('textAlign: "right"')) {
        issues.hardcodedAlign.push(relativePath);
    }

    // check for manual isRTL logic
    if (content.includes("isRTL") && (content.includes("?") || content.includes("&&"))) {
        issues.manualRtlLogic.push(relativePath);
    }
});

console.log(`\nFound ${issues.rowReverse.length} files with 'row-reverse' (Potential double-flip):`);
issues.rowReverse.forEach(f => console.log(` - ${f}`));

console.log(`\nFound ${issues.hardcodedMargins.length} files with physical margins/paddings (Should be Start/End):`);
// Limit output
issues.hardcodedMargins.slice(0, 10).forEach(f => console.log(` - ${f}`));
if (issues.hardcodedMargins.length > 10) console.log(` ... and ${issues.hardcodedMargins.length - 10} more`);

console.log(`\nFound ${issues.hardcodedAlign.length} files with hardcoded textAlign (Should be 'auto' or logical):`);
issues.hardcodedAlign.forEach(f => console.log(` - ${f}`));

console.log(`\nFound ${issues.manualRtlLogic.length} files with manual isRTL logic:`);
issues.manualRtlLogic.slice(0, 10).forEach(f => console.log(` - ${f}`));
if (issues.manualRtlLogic.length > 10) console.log(` ... and ${issues.manualRtlLogic.length - 10} more`);
