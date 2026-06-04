import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add role check at the top
if "const role =" not in content:
    content = content.replace(
        "const [activeSection, setActiveSection] = useState('queue');",
        "const [activeSection, setActiveSection] = useState('queue');\n  const role = localStorage.getItem('role');\n\n  const canAccess = (section) => {\n    if (['admin', 'superadmin'].includes(role)) return true;\n    if (role === 'moderator' && ['queue', 'golden', 'contributions'].includes(section)) return true;\n    if (role === 'mentor' && ['personal'].includes(section)) return true;\n    return false;\n  };\n"
    )

# 2. Update initial section logic (if it exists) to respect role
# Wait, let's just make it simple.

# 3. Add Users tab to Sidebar
users_tab = """
      {canAccess('users') && (
        <button onClick={() => { setActiveSection('users'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'users' ? 'active' : ''}`}><Users size={16} /> User Management</button>
      )}
"""
queue_tab = "<button onClick={() => { setActiveSection('queue'); close(); }}"

# We need to wrap the existing buttons in canAccess checks
replacements = {
    """<button onClick={() => { setActiveSection('queue'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'queue' ? 'active' : ''}`}><Inbox size={16} /> Review Queue</button>""":
    """{canAccess('queue') && (<button onClick={() => { setActiveSection('queue'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'queue' ? 'active' : ''}`}><Inbox size={16} /> Review Queue</button>)}""",
    
    """<button onClick={() => { setActiveSection('golden'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'golden' ? 'active' : ''}`}><Sparkles size={16} /> Golden Tickets</button>""":
    """{canAccess('golden') && (<button onClick={() => { setActiveSection('golden'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'golden' ? 'active' : ''}`}><Sparkles size={16} /> Golden Tickets</button>)}""",

    """<button onClick={() => { setActiveSection('personal'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'personal' ? 'active' : ''}`}><Ticket size={16} /> Personal Tickets</button>""":
    """{canAccess('personal') && (<button onClick={() => { setActiveSection('personal'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'personal' ? 'active' : ''}`}><Ticket size={16} /> Assigned Work</button>)}""",

    """<button onClick={() => { setActiveSection('contributions'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'contributions' ? 'active' : ''}`}><CheckCircle size={16} /> Contributions</button>""":
    """{canAccess('contributions') && (<button onClick={() => { setActiveSection('contributions'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'contributions' ? 'active' : ''}`}><CheckCircle size={16} /> Contributions</button>)}\n      {canAccess('users') && (<button onClick={() => { setActiveSection('users'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'users' ? 'active' : ''}`}><Shield size={16} /> User Management</button>)}""",

    """<button onClick={() => { setActiveSection('settings'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'settings' ? 'active' : ''}`}><Settings size={16} /> Settings</button>""":
    """{canAccess('settings') && (<button onClick={() => { setActiveSection('settings'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'settings' ? 'active' : ''}`}><Settings size={16} /> Settings</button>)}"""
}

for k, v in replacements.items():
    if k in content:
        content = content.replace(k, v)

# 4. Imports for Icons
if "Shield " not in content and "Shield," not in content:
    content = content.replace("Settings, Ticket, BarChart2 } from 'lucide-react';", "Settings, Ticket, BarChart2, Shield, Users } from 'lucide-react';")

with open(file_path, "w") as f:
    f.write(content)

print("Injected RBAC sidebar checks")
