import re

file_path = "src/pages/AdminDashboard.jsx"
with open(file_path, "r") as f:
    content = f.read()

if "import AttachmentDisplay" not in content:
    content = content.replace(
        "import PriorityBadge from '../components/PriorityBadge';",
        "import PriorityBadge from '../components/PriorityBadge';\nimport AttachmentDisplay from '../components/AttachmentDisplay';"
    )

# Inject into queue
queue_attachment = """
                    {cluster.attachments?.length > 0 && (
                      <div className="px-9 pb-4">
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-bricolage">Initial Attachments</label>
                        <AttachmentDisplay attachments={cluster.attachments} showUploader={false} />
                      </div>
                    )}
                        </div>
                        <div className="flex flex-col gap-2 items-end mt-6">
"""
if "cluster.attachments?.length" not in content:
    content = content.replace(
        """                        </div>\n                        <StatusBadge variant="purple" className="self-start mt-6">""",
        queue_attachment + """                          <PriorityBadge level={cluster.priorityLevel} score={cluster.severityScore} breakdown={cluster.severityBreakdown} />\n                          <StatusBadge variant="purple">"""
    )
    # the second half of replace
    content = content.replace(
        """                          {cluster.submissionsCount === 0\n                            ? 'No merges yet'\n                            : `${cluster.submissionsCount} merged`}\n                        </StatusBadge>""",
        """                            {cluster.submissionsCount === 0\n                              ? 'No merges yet'\n                              : `${cluster.submissionsCount} merged`}\n                          </StatusBadge>\n                        </div>"""
    )

# Inject into Golden Tickets
golden_attachment = """
                    {ticket.attachments?.length > 0 && (
                      <div className="mt-4">
                        <AttachmentDisplay attachments={ticket.attachments} showUploader={false} />
                      </div>
                    )}
"""
# Golden tickets map over `goldenQueue`, each is `ticket`.
# Wait, let's just insert it after the `context` div.
if "ticket.attachments?.length" not in content:
    content = content.replace(
        """                    <div className="text-slate-300 bg-white/[0.005] p-6 rounded-2xl border border-white/5 font-medium leading-relaxed whitespace-pre-wrap">\n                      {ticket.context}\n                    </div>""",
        """                    <div className="text-slate-300 bg-white/[0.005] p-6 rounded-2xl border border-white/5 font-medium leading-relaxed whitespace-pre-wrap">\n                      {ticket.context}\n                    </div>""" + golden_attachment
    )

with open(file_path, "w") as f:
    f.write(content)
