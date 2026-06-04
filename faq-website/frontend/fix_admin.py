import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Make sure all sections have activeSection check
if "{activeSection === 'queue' && canAccess('queue') && (" not in content:
    content = content.replace(
        "{/* Review Queue Section */}\n        {activeSection === 'queue'",
        "{/* Review Queue Section */}\n        {activeSection === 'queue' && canAccess('queue')"
    )

if "{activeSection === 'contributions' && canAccess('contributions') && (" not in content:
    content = content.replace(
        "{/* Contributions Section */}\n        {activeSection === 'contributions'",
        "{/* Contributions Section */}\n        {activeSection === 'contributions' && canAccess('contributions')"
    )

if "{activeSection === 'settings' && canAccess('settings') && (" not in content:
    content = content.replace(
        "{/* Settings Section */}\n        {activeSection === 'settings'",
        "{/* Settings Section */}\n        {activeSection === 'settings' && canAccess('settings')"
    )

with open(file_path, "w") as f:
    f.write(content)

print("Fixed access checks")
