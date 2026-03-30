import os
import re

directory = r"d:\Development\altayar\MobileApp\frontend\app\(user)"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    inside_rtl_block = False
    changed = False
    
    for i, line in enumerate(lines):
        # Detect start of an RTL class block like `someClassRTL: {`
        if re.search(r'[A-Za-z0-9]RTL\s*:\s*\{', line):
            inside_rtl_block = True
            
        # Detect end of the block
        if inside_rtl_block and re.search(r'^\s*\},?\s*$', line):
            inside_rtl_block = False
            
        # Fix flex-end inside RTL blocks
        if inside_rtl_block and 'alignItems' in line and 'flex-end' in line:
            lines[i] = line.replace('flex-end', 'flex-start')
            changed = True
            
        # Fix inline isRTL && { alignItems: 'flex-end' }
        if 'isRTL' in line and 'flex-end' in line and 'alignItems' in line:
            lines[i] = line.replace('flex-end', 'flex-start')
            changed = True
            
        # Fix margin double flips inside RTL blocks
        if inside_rtl_block and ('marginStart' in line or 'marginEnd' in line):
            # If it's literally hardcoding margins to reverse them
            if "0" in line or "12" in line or "8" in line or "10" in line:
                lines[i] = f"// {line}  /* removed double-flip for Native RTL */"
                changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"Fixed {os.path.basename(filepath)}")

for root, _, files in os.walk(directory):
    for filename in files:
        if filename.endswith(".tsx") or filename.endswith(".ts"):
            process_file(os.path.join(root, filename))
