import re

with open("src/pages/AdminDashboard.jsx", "r") as f:
    content = f.read()

# Add imports right below the react-hot-toast import
if "import PriorityBadge from" not in content:
    content = content.replace(
        "import toast from 'react-hot-toast';",
        "import toast from 'react-hot-toast';\nimport PriorityBadge from '../components/PriorityBadge';\nimport AttachmentDisplay from '../components/AttachmentDisplay';"
    )

with open("src/pages/AdminDashboard.jsx", "w") as f:
    f.write(content)
