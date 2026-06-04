import os
import glob

files = glob.glob('src/pages/*.jsx')
for filepath in files:
    if filepath == 'src/pages/AdminDashboard.jsx': continue
    
    with open(filepath, 'r') as f:
        content = f.read()
        
    if 'const navSection' not in content: continue
    if 'StaffToolsNav' in content: continue
    
    # 1. Add import right after the last import
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import_idx = i
            
    lines.insert(last_import_idx + 1, "import StaffToolsNav from '../components/StaffToolsNav';")
    
    # 2. Inject <StaffToolsNav close={close} /> right before </nav>
    # Since navSection might be defined as:
    #   const navSection = (close = () => {}) => (
    #     <nav>
    #        ...
    #        </div>
    #     </nav>
    #   );
    
    # Let's find </nav> and if it's inside navSection, add StaffToolsNav before it.
    new_content = '\n'.join(lines)
    
    # find the occurrence of </nav> inside navSection.
    # A simple replace works if there's only one </nav> in the file.
    if new_content.count('</nav>') == 1:
        new_content = new_content.replace('</nav>', '  <StaffToolsNav close={close} />\n    </nav>')
    else:
        # manual replace
        parts = new_content.split('</nav>')
        # The first </nav> is usually the one in navSection if it's the only nav in the file.
        # Dashboard.jsx has multiple? No, it usually only has one navSection. Let's replace the first.
        # But wait, dashboard already has the inline StaffTools block!
        pass
        
    with open(filepath, 'w') as f:
        f.write(new_content)
        print(f"Updated {filepath}")
