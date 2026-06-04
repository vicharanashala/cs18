import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Fix the queue start
content = content.replace(
    "{/* Review Queue Section */}\n        <div>",
    "{/* Review Queue Section */}\n        {activeSection === 'queue' && canAccess('queue') && (\n        <div>"
)

# And make sure queue end has exactly one )}
# We added a stray )} at 456 in my previous replace. 
# Let's just find `)}` that are orphaned and remove them? No, let's look at the file.

