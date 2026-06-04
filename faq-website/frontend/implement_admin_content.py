import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Import UserManagementTab
if "UserManagementTab" not in content:
    content = content.replace(
        "import PriorityBadge from '../components/PriorityBadge';",
        "import PriorityBadge from '../components/PriorityBadge';\nimport UserManagementTab from '../components/UserManagementTab';"
    )

# 2. Add 'users' render block
users_block = """
        {/* User Management Section */}
        {activeSection === 'users' && canAccess('users') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-bricolage tracking-tight flex items-center gap-2 text-slate-100">
                <Shield size={24} className="text-purple-400" /> User Management
              </h2>
            </div>
            <UserManagementTab />
          </div>
        )}
"""
if "activeSection === 'users'" not in content:
    # Insert it right before {/* Settings Section */}
    content = content.replace("{/* Settings Section */}", users_block + "\n        {/* Settings Section */}")

# 3. Add Accept Ticket button and routingReason to personal tickets
accept_btn = """
                    <div className="flex justify-end pt-4 border-t border-white/5 gap-2">
                      {!ticket.acceptedAt && ticket.autoRouted && (
                         <button
                           onClick={() => axiosClient.post(`/personal-issues/${ticket._id}/accept`).then(() => window.location.reload())}
                           className="bg-emerald-500/20 text-emerald-400 font-bold py-2 px-4 rounded-xl shadow-md text-sm hover:bg-emerald-500/30 transition-all"
                         >
                           Accept Ticket
                         </button>
                      )}
"""
if "Accept Ticket" not in content:
    content = content.replace(
        """<div className="flex justify-end pt-4 border-t border-white/5">""",
        accept_btn
    )

routing_reason = """
                    <div className="text-slate-300 bg-white/[0.005] p-6 rounded-2xl border border-white/5 font-medium leading-relaxed whitespace-pre-wrap">
                      {ticket.context}
                    </div>
                    {ticket.routingReason && (
                      <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs font-semibold text-blue-300">
                        Route Reason: {ticket.routingReason}
                      </div>
                    )}
"""
if "routingReason" not in content:
    content = content.replace(
        """<div className="text-slate-300 bg-white/[0.005] p-6 rounded-2xl border border-white/5 font-medium leading-relaxed whitespace-pre-wrap">
                      {ticket.context}
                    </div>""",
        routing_reason
    )


with open(file_path, "w") as f:
    f.write(content)

print("Injected AdminDashboard content")
