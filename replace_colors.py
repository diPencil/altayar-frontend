#!/usr/bin/env python3
"""
Script to replace old cyan colors with new blue colors across all TypeScript files
"""
import os
import re

# Color mappings
COLOR_REPLACEMENTS = {
    '#0891b2': '#1071b8',  # Old primary cyan -> New primary blue
    '#06b6d4': '#167dc1',  # Old secondary cyan -> New secondary blue
    '#1a74c6': '#1071b8',  # Old theme blue -> New primary blue
    '#0cb5e9': '#0ba7df',  # Old light cyan -> New accent blue
}

def replace_colors_in_file(filepath):
    """Replace colors in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace each color
        for old_color, new_color in COLOR_REPLACEMENTS.items():
            # Case insensitive replacement
            content = re.sub(old_color, new_color, content, flags=re.IGNORECASE)
        
        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Main function to process all files"""
    frontend_dir = r'd:\Development\altayar\MobileApp\frontend'
    
    # Directories to search
    search_dirs = [
        os.path.join(frontend_dir, 'app'),
        os.path.join(frontend_dir, 'src'),
    ]
    
    files_changed = 0
    total_files = 0
    
    for search_dir in search_dirs:
        for root, dirs, files in os.walk(search_dir):
            for file in files:
                if file.endswith(('.tsx', '.ts')):
                    filepath = os.path.join(root, file)
                    total_files += 1
                    if replace_colors_in_file(filepath):
                        files_changed += 1
                        print(f"[OK] Updated: {filepath}")
    
    print(f"\n{'='*60}")
    print(f"[OK] Color replacement complete!")
    print(f"Files processed: {total_files}")
    print(f"Files changed: {files_changed}")
    print(f"{'='*60}")
    
    print(f"\nColor changes:")
    for old, new in COLOR_REPLACEMENTS.items():
        print(f"   {old} -> {new}")

if __name__ == '__main__':
    main()
