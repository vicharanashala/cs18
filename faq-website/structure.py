#!/usr/bin/env python3
"""
Capture project structure and code contents into structure.txt.
Excludes auto-generated and library directories (node_modules, .git, __pycache__,
.venv, dist, build, venv, etc.) and binary/generated files.
"""
import os
import sys
import fnmatch

# --- Configuration ---
ROOT_DIR = '.'                       # Project root to scan
OUTPUT_FILE = 'structure.txt'        # Output file name
EXCLUDED_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv', 'env',
    'dist', 'build', '.egg-info', '.pytest_cache', '.mypy_cache',
    '.tox', '.coverage', '.tox', '.next', '.nuxt', '.cache',
    'recordings', '.hg', '.svn', 'site-packages', 'vendor', 'tmp', 'temp'
}
EXCLUDED_FILES = {
    '.DS_Store', 'Thumbs.db', 'celerybeat-schedule', 'dump.rdb',
    'structure.txt', 'structure.py', 'package-lock.json', 'yarn.lock',
    'pnpm-lock.yaml', 'poetry.lock', 'Pipfile.lock', 'requirements.lock',
    '*.pyc', '*.pyo', '*.so', '*.dylib', '*.dll', '*.exe', '*.bin',
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.svg', '*.webp',
    '*.mp3', '*.mp4', '*.wav', '*.mov', '*.avi', '*.zip', '*.tar',
    '*.gz', '*.rar', '*.7z', '*.pdf', '*.doc', '*.docx', '*.xls',
    '*.xlsx', '.env.local', '.env.production', 'fleet.yaml'
}
EXCLUDE_PATTERNS = [
    'celerybeat-*',
    '*.rdb', '*.db', '*.sqlite3',
    '*.log',
    '*.lock',
    '.*.swp', '*.swo',
]
# ---------------------


def should_include_dir(name):
    return not name.startswith('.') and name not in EXCLUDED_DIRS


def should_include_file(name):
    if name.startswith('.'):
        return False
    if name in EXCLUDED_FILES:
        return False
    for pat in EXCLUDE_PATTERNS:
        if fnmatch.fnmatch(name, pat):
            return False
    return True


def is_output_file(abs_file, abs_output):
    try:
        return os.path.samefile(abs_file, abs_output)
    except FileNotFoundError:
        return os.path.abspath(abs_file) == os.path.abspath(abs_output)
    except Exception:
        return os.path.abspath(abs_file) == os.path.abspath(abs_output)


def walk_dir(base_dir):
    """Walk directory, return (tree_lines, [(rel_path, abs_path)])"""
    tree_lines = []
    file_paths = []
    base_dir = os.path.abspath(base_dir)

    def tree_walk(root, prefix=""):
        dirs = []
        files = []
        for d in os.listdir(root):
            full = os.path.join(root, d)
            if os.path.isdir(full) and should_include_dir(d):
                dirs.append(d)
            elif os.path.isfile(full) and should_include_file(d):
                files.append(d)
        dirs.sort()
        files.sort()
        entries = dirs + files
        total = len(entries)
        for idx, name in enumerate(entries):
            path = os.path.join(root, name)
            is_last = (idx == total - 1)
            connector = "└── " if is_last else "├── "
            tree_lines.append(
                f"{prefix}{connector}{name}/" if os.path.isdir(path)
                else f"{prefix}{connector}{name}"
            )
            if os.path.isdir(path):
                ext = "    " if is_last else "│   "
                tree_walk(path, prefix + ext)
            else:
                rel_file = os.path.relpath(path, base_dir)
                file_paths.append((rel_file, path))

    tree_lines.append(os.path.basename(base_dir.rstrip(os.sep)) + "/")
    tree_walk(base_dir)
    return tree_lines, file_paths


def write_structure_and_contents(root_dir, output_file):
    abs_output = os.path.abspath(output_file)
    abs_root = os.path.abspath(root_dir)

    tree_lines, file_paths = walk_dir(abs_root)

    # Exclude the output file itself
    file_paths = [
        (rel_f, abs_f) for rel_f, abs_f in file_paths
        if not is_output_file(abs_f, abs_output)
    ]

    os.makedirs(os.path.dirname(abs_output) or '.', exist_ok=True)

    with open(abs_output, 'w', encoding='utf-8', errors='replace') as out:
        # Header
        out.write("### PROJECT DIRECTORY STRUCTURE\n\n")
        for line in tree_lines:
            out.write(line + '\n')
        out.write('\n\n')

        # File contents
        for rel_file, abs_file in file_paths:
            out.write(f"\n#+{'='*60}+\n")
            out.write(f"# File: {rel_file}\n")
            out.write(f"#+{'='*60}+\n")
            try:
                with open(abs_file, 'r', encoding='utf-8', errors='replace') as fin:
                    out.write(fin.read())
            except Exception as e:
                out.write(f"[Could not read this file: {e}]\n")
            out.write(f"\n#+{'-'*60}+\n")

    return len(file_paths)


def main():
    abs_root = os.path.abspath(ROOT_DIR)
    abs_output = os.path.abspath(OUTPUT_FILE)

    try:
        common = os.path.commonpath([abs_root, abs_output])
        if common == abs_root:
            print(f"Note: Output file is inside the source directory — it will be excluded.")
    except ValueError:
        pass

    print(f"Scanning  : {abs_root}")
    print(f"Outputting: {abs_output}\n")

    count = write_structure_and_contents(ROOT_DIR, OUTPUT_FILE)
    print(f"Done! Wrote {count} files to '{OUTPUT_FILE}'.")


if __name__ == '__main__':
    if len(sys.argv) > 1:
        ROOT_DIR = sys.argv[1]
    if len(sys.argv) > 2:
        OUTPUT_FILE = sys.argv[2]

    main()