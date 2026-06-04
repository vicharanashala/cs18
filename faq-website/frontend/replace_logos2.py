import os
import re

src_dir = '/Users/animeshpathak/ocfaqproj/faq-website/frontend/src'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    
    # Replace in Headers: <div...> <Book/> </div> <span>FAQ Hive</span>
    # Wait, the previous script might have missed some
    
    # Let's replace the block: 
    # <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
    #   <Book size={16} className="text-slate-300" strokeWidth={2} />
    # </div>
    # <span className="font-bold font-bricolage text-lg text-slate-100">FAQ Hive</span>
    
    pattern1 = re.compile(r'<div[^>]*>\s*<Book[^>]*>\s*</Book>\s*</div>\s*<span[^>]*>FAQ Hive</span>', re.DOTALL)
    pattern1a = re.compile(r'<div[^>]*>\s*<Book[^>]*/>\s*</div>\s*<span[^>]*>FAQ Hive</span>', re.DOTALL)
    
    content = pattern1.sub('<BeeLogo variant="full-brand" />', content)
    content = pattern1a.sub('<BeeLogo variant="full-brand" />', content)

    # In Login/Register:
    # <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
    #   <Book size={24} className="text-amber-500" />
    # </div>
    
    pattern2 = re.compile(r'<div[^>]*mx-auto mb-4[^>]*>\s*<Book[^>]*/>\s*</div>', re.DOTALL)
    content = pattern2.sub('<div className="mx-auto mb-4 flex justify-center"><BeeLogo variant="large" /></div>', content)

    content = content.replace('FAQ Hive', 'Bee')
    
    # Add BeeLogo import if it changed and needs it
    if content != original_content:
        if "import BeeLogo from" not in content and "BeeLogo" in content:
            imports = re.findall(r'^import .*;', content, re.MULTILINE)
            if imports:
                last_import = imports[-1]
                rel_path = os.path.relpath(os.path.join(src_dir, 'components'), os.path.dirname(filepath))
                if rel_path == '.':
                    import_str = "import BeeLogo from './BeeLogo';"
                else:
                    import_str = f"import BeeLogo from '{rel_path}/BeeLogo';"
                content = content.replace(last_import, f"{last_import}\n{import_str}")
        
        # Remove Book from lucide-react if not used
        if "<Book" not in content:
            content = re.sub(r'Book,\s*', '', content)
            content = re.sub(r',\s*Book\b', '', content)
            content = re.sub(r'import\s*\{\s*Book\s*\}\s*from\s*\'lucide-react\';', '', content)
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))

