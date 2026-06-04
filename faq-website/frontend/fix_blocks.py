import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Instead of doing regex on the whole thing, let's just find the end of the div for each section.
# We know the markers.

def wrap_section(content, sec_marker, next_marker, condition):
    start_idx = content.find(sec_marker)
    if start_idx == -1: return content
    
    # Check if it's already properly wrapped
    if f"{{activeSection === '{condition}'" in content[start_idx:start_idx+200] and "}" in content[start_idx:start_idx+200]:
        # Actually wait, if I did `{activeSection === '...' && <div`, it's unclosed.
        # Let's revert ALL `{activeSection === '...' && <div` back to `<div>` first!
        pass
    
    return content

# Let's just fix it manually using string replacements
content = content.replace("{activeSection === 'queue' && canAccess('queue') && <div>", "<div>")
content = content.replace("{activeSection === 'personal' && canAccess('personal') && <div>", "<div>")
content = content.replace("{activeSection === 'golden' && canAccess('golden') && <div>", "<div>")
content = content.replace("{activeSection === 'contributions' && canAccess('contributions') && <div>", "<div>")
content = content.replace("{activeSection === 'settings' && canAccess('settings') && <div>", "<div>")

# Now re-wrap properly
content = content.replace(
    "{/* Review Queue Section */}\n        <div>",
    "{/* Review Queue Section */}\n        {activeSection === 'queue' && canAccess('queue') && (<div>"
)
content = content.replace(
    "{/* Deduplication Section",
    "</div>)}\n\n        {/* Deduplication Section"
)

content = content.replace(
    "{/* Personal Tickets Section */}\n        <div>",
    "{/* Personal Tickets Section */}\n        {activeSection === 'personal' && canAccess('personal') && (<div>"
)
content = content.replace(
    "{/* Golden Tickets Section */}",
    "</div>)}\n\n        {/* Golden Tickets Section */}"
)

content = content.replace(
    "{/* Golden Tickets Section */}\n        <div>",
    "{/* Golden Tickets Section */}\n        {activeSection === 'golden' && canAccess('golden') && (<div>"
)
content = content.replace(
    "{/* Contributions Section */}",
    "</div>)}\n\n        {/* Contributions Section */}"
)

content = content.replace(
    "{/* Contributions Section */}\n        <div>",
    "{/* Contributions Section */}\n        {activeSection === 'contributions' && canAccess('contributions') && (<div>"
)
content = content.replace(
    "{/* User Management Section */}",
    "</div>)}\n\n        {/* User Management Section */}"
)

content = content.replace(
    "{/* Settings Section */}\n        <div>",
    "{/* Settings Section */}\n        {activeSection === 'settings' && canAccess('settings') && (<div>"
)

# the end of Settings Section is before `      </div>\n    </div>\n  );\n}`
content = content.replace(
    "            </div>\n          </div>\n        </div>",
    "            </div>\n          </div>\n        </div>\n        )}", 
    1 # wait, this might be fragile. 
)

with open(file_path, "w") as f:
    f.write(content)
