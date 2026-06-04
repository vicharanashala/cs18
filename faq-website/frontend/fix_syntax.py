import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# I added `&& (<div` but I didn't add `)}` at the end of the div.
# Instead of `&& (<div`, I should just leave it as it was if it was a JSX expression.
# Let's revert the unclosed expressions.
content = content.replace(
    "{/* Personal Tickets Section */}\n        {activeSection === 'personal' && canAccess('personal') && (<div",
    "{/* Personal Tickets Section */}\n        {activeSection === 'personal' && canAccess('personal') && <div"
)

content = content.replace(
    "{/* Golden Tickets Section */}\n        {activeSection === 'golden' && canAccess('golden') && (<div",
    "{/* Golden Tickets Section */}\n        {activeSection === 'golden' && canAccess('golden') && <div"
)

# wait, if I did `&& <div`, it will expect the `</div>` to just close it, but it's JSX, so it works.
# But what if there was NO `{` before?
# If it was `{/* Golden Tickets Section */}\n        <div>`, and I changed it to `{... && (<div>`, then I need `)}` at the end.
# If it was `{/* Golden Tickets Section */}\n        {activeSection === 'golden' && (\n          <div>`, then it's fine.

with open(file_path, "w") as f:
    f.write(content)
