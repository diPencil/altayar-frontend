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

    // Fix 1: textAlign: 'left' -> textAlign: 'auto' (Let RN handle natural alignment mostly)
    // Or if strictly needed: isRTL ? 'right' : 'left'
    // But 'auto' is often safer for dynamic text.
    // However, for explicit UI design, we might want manual control.
    // Given the scale, 'left' hardcoded is definitely wrong for Arabic.

    // Strategy: Replace simple "textAlign: 'left'" with "textAlign: isRTL ? 'right' : 'left'"
    // We need to ensure isRTL is available. If not, we fall back to 'auto' or leave it to user?
    // Adding imports is complex via regex.
    // SAFE BET: Change "textAlign: 'left'" to "textAlign: 'auto'" which usually aligns start.

    // Regex matches: textAlign followed by 'left' or "left", allowing for whitespace/newlines
    content = content.replace(/textAlign:\s*['"]left['"]/g, "textAlign: 'left'"); // Normalize first to assist (optional)

    // Actually, 'textAlign: "left"' implies LTR. In RTL it should usually be right.
    // React Native's "auto" or just "textAlign: 'justify'" or default works? 
    // Default text align is 'auto' (which is 'left' for LTR and 'right' for RTL) for <Text>.
    // So removing "textAlign: 'left'" is often the best fix!
    // But we don't want to break layout if it WAS needed.

    // Let's replace "textAlign: 'left'" with "textAlign: 'auto'"
    content = content.replace(/textAlign:\s*['"]left['"]/g, "textAlign: 'auto'");

    // Fix 2: "textAlign: 'right'" -> usually means we want 'end'. 
    // "textAlign: 'right'" in RTL becomes 'left'? 
    // No, "right" is always physical right.
    // If we want "end", prompt usage of 'auto' is usually best if direction is handled.
    // But if they explicitly wanted right in LTR (like numbers), they likely want Left in RTL.
    // We can't automatically fix 'right' safely without context (could be money column).

    // Fix 3: flexDirection: 'row-reverse'
    // If used with isRTL logic: `flexDirection: isRTL ? 'row-reverse' : 'row'`
    // This creates double flip. logic: isRTL=true -> 'row-reverse'. RN flips 'row-reverse' -> 'row' (visually LTR). 
    // Wait.
    // If I18nManager.isRTL is true:
    // view style={flexDirection: 'row'} -> Renders Right to Left (Children 1, 2, 3 -> 1 on right).
    // view style={flexDirection: 'row-reverse'} -> Renders Left to Right (Children 1, 2, 3 -> 1 on left).
    // So `isRTL ? 'row-reverse' : 'row'` results in 'row-reverse' valid style.
    // Visual result: LTR layout in RTL mode. BAD.
    // We want `flexDirection: 'row'` ALWAYS.

    // We will look for this pattern and replace with just 'row'.
    content = content.replace(/flexDirection:\s*isRTL\s*\?\s*['"]row-reverse['"]\s*:\s*['"]row['"]/g, "flexDirection: 'row'");
    content = content.replace(/flexDirection:\s*!isRTL\s*\?\s*['"]row['"]\s*:\s*['"]row-reverse['"]/g, "flexDirection: 'row'");

    if (content !== originalContent) {
        console.log(`Improving RTL logic in: ${path.relative(path.join(__dirname, '..'), file)}`);
        fs.writeFileSync(file, content);
        changedFiles++;
    }
});

console.log(`\nImproved RTL logic in ${changedFiles} files.`);
console.log("Replaced 'textAlign: left' with 'textAlign: auto' and removed double-flip flexDirection logic.");
