import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Wrap main sections in canAccess checks
blocks_to_wrap = {
    "{/* Review Queue Section */}": "queue",
    "{/* Golden Tickets Section */}": "golden",
    "{/* Personal Tickets Section */}": "personal",
    "{/* Contributions Section */}": "contributions",
    "{/* Settings Section */}": "settings"
}

for marker, sec in blocks_to_wrap.items():
    if f"activeSection === '{sec}' && canAccess('{sec}')" not in content:
        content = content.replace(
            f"{marker}\n        {{activeSection === '{sec}'",
            f"{marker}\n        {{activeSection === '{sec}' && canAccess('{sec}')"
        )
        # Handle the case where it might be wrapped in a div immediately
        content = content.replace(
            f"{marker}\n        <div",
            f"{marker}\n        {{activeSection === '{sec}' && canAccess('{sec}') && (<div"
        )

with open(file_path, "w") as f:
    f.write(content)

print("Wrapped render blocks")
