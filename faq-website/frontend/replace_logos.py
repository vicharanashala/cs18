import os
import re

src_dir = '/Users/animeshpathak/ocfaqproj/faq-website/frontend/src'

logo_pattern = re.compile(
    r'(<div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">\s*<Book size=\{16\} className="text-slate-300" strokeWidth=\{2\} />\s*</div>\s*<span className="font-bold font-bricolage text-xl text-slate-100 tracking-tight">FAQ Hive</span>)',
    re.MULTILINE
)

# Also pattern where Book is used without the div:
logo_pattern2 = re.compile(
    r'(<Book size=\{20\} className="text-amber-400" />\s*<span className="font-bold font-bricolage text-xl text-slate-100 tracking-tight">FAQ Hive</span>)',
    re.MULTILINE
)

# A general replacement approach:
# Just replace any "FAQ Hive" with "Bee" if we are replacing the brand.
# Wait, let's just find where FAQ Hive is and use BeeLogo full-brand.

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    
    # Simple replace
    # We want to replace the whole logo block
    
    # 1. 
    block1 = """<div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Book size={16} className="text-slate-300" strokeWidth={2} />
            </div>
            <span className="font-bold font-bricolage text-xl text-slate-100 tracking-tight">FAQ Hive</span>"""
    
    block1_inline = """<div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Book size={16} className="text-slate-300" strokeWidth={2} /></div><span className="font-bold font-bricolage text-xl text-slate-100 tracking-tight">FAQ Hive</span>"""
    
    # Use regex to find the logo structure inside a button or link
    # This regex looks for an element containing Book and FAQ Hive text
    pattern = re.compile(r'<div[^>]*>\s*<Book[^>]*>\s*</Book>\s*</div>\s*<span[^>]*>FAQ Hive</span>', re.DOTALL)
    # Book might be self closing
    pattern = re.compile(r'<div[^>]*>\s*<Book[^>]*/>\s*</div>\s*<span[^>]*>FAQ Hive</span>', re.DOTALL)
    
    content = pattern.sub('<BeeLogo variant="full-brand" />', content)

    pattern2 = re.compile(r'<Book[^>]*/>\s*<span[^>]*>FAQ Hive</span>', re.DOTALL)
    content = pattern2.sub('<BeeLogo variant="full-brand" />', content)
    
    # also replace <Book size={24} className="text-slate-300" />\n            <span className="font-bold font-bricolage text-2xl text-slate-100">FAQ Hive</span>
    pattern3 = re.compile(r'<Book[^>]*/>\s*<h1[^>]*>FAQ Hive</h1>', re.DOTALL)
    content = pattern3.sub('<BeeLogo variant="full-brand" />', content)
    
    # If content changed, we must import BeeLogo if not already imported
    if content != original_content:
        if "import BeeLogo from" not in content and "BeeLogo" in content:
            # Add import after last import
            imports = re.findall(r'^import .*;', content, re.MULTILINE)
            if imports:
                last_import = imports[-1]
                
                # Figure out path to components
                rel_path = os.path.relpath(os.path.join(src_dir, 'components'), os.path.dirname(filepath))
                if rel_path == '.':
                    import_str = "import BeeLogo from './BeeLogo';"
                else:
                    import_str = f"import BeeLogo from '{rel_path}/BeeLogo';"
                
                content = content.replace(last_import, f"{last_import}\n{import_str}")
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))

