import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "{/* Discussion Review Queue */}\n        <div>",
    "{/* Discussion Review Queue */}\n        {activeSection === 'queue' && canAccess('queue') && (<div>"
)

with open(file_path, "w") as f:
    f.write(content)
