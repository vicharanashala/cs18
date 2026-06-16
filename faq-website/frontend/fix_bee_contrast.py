import sys

file_path = "/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/components/VoiceAssistant.jsx"
with open(file_path, 'r') as f:
    content = f.read()

# Replace text-white with text-[#FFFFFF] in specific lines to guarantee pure white text independent of CSS variables.
content = content.replace("text-white", "text-[#FFFFFF]")

# Fix default theme resolution in useState
old_use_state = "const [theme, setTheme] = useState('dark');"
new_use_state = """const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || systemTheme;
    }
    return 'dark';
  });"""
content = content.replace(old_use_state, new_use_state)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully replaced text-white and fixed theme initialization.")
