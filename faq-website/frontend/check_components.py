import re

with open("src/pages/AdminDashboard.jsx", "r") as f:
    content = f.read()

# Find all <ComponentName
components_used = set(re.findall(r'<([A-Z][a-zA-Z0-9_]*)', content))

# Find all imports: import { A, B } from '...'; or import A from '...';
imports = set()
for m in re.finditer(r'import\s+({[^}]+}|\S+)\s+from', content):
    imp_str = m.group(1).replace('{', '').replace('}', '')
    for item in imp_str.split(','):
        imports.add(item.strip())

# Find all local components/variables defined with const A = or function A(
locals_def = set(re.findall(r'(?:const|let|var|function)\s+([A-Z][a-zA-Z0-9_]*)', content))

missing = components_used - imports - locals_def

if missing:
    print("MISSING COMPONENTS:", missing)
else:
    print("All uppercase components are either imported or defined locally.")
