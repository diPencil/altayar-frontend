const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'assets' && file !== 'dist') {
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

const projectRoot = path.join(__dirname, '..', 'src');
const appRoot = path.join(__dirname, '..', 'app');

const files = [
    ...getAllFiles(projectRoot, []),
    ...getAllFiles(appRoot, [])
];

let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Direct replacements for styles
    // Note: We use regex to ensure we don't replace keys in non-style contexts if possible, 
    // but in TSX/JS, these keys are almost exclusive to styles or props.

    // Margins
    content = content.replace(/marginLeft/g, 'marginStart');
    content = content.replace(/marginRight/g, 'marginEnd');

    // Paddings
    content = content.replace(/paddingLeft/g, 'paddingStart');
    content = content.replace(/paddingRight/g, 'paddingEnd');

    // Border Radius (if specific corners - usually tricky, but borderTopLeftRadius -> borderTopStartRadius)
    content = content.replace(/borderTopLeftRadius/g, 'borderTopStartRadius');
    content = content.replace(/borderTopRightRadius/g, 'borderTopEndRadius');
    content = content.replace(/borderBottomLeftRadius/g, 'borderBottomStartRadius');
    content = content.replace(/borderBottomRightRadius/g, 'borderBottomEndRadius');

    // Position
    // We can't safely replace 'left:' or 'right:' without context because they are common words.
    // However, we can look for "left:" inside style objects or style props.
    // This is risky with regex. Avoiding for now unless we are sure.

    // Text Align
    // textAlign: 'left' -> textAlign: 'auto' (or let it inherit)
    // textAlign: 'right' -> textAlign: 'auto' (risky if it was meant to be right)
    // We will skip textAlign automatic fix for now as it needs visual verification.

    if (content !== originalContent) {
        console.log(`Fixing RTL styles in: ${path.relative(path.join(__dirname, '..'), file)}`);
        fs.writeFileSync(file, content);
        changedFiles++;
    }
});

console.log(`\nFixed RTL styles in ${changedFiles} files.`);
console.log('Please manualy verify the changes, especially regarding "textAlign" and absolute positioning logic.');
