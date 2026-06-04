import json

log_file = "/Users/animeshpathak/.gemini/antigravity-ide/brain/72d41117-e916-48aa-b74d-4aa85a35a92d/.system_generated/logs/transcript.jsonl"
target_file = "/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/pages/AdminDashboard.jsx"

import subprocess
subprocess.run(["git", "checkout", target_file], check=True)

with open(target_file, "r") as f:
    content = f.read()

edits = []
with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            
            # 1. From tool_calls array
            if "tool_calls" in entry:
                for tc in entry["tool_calls"]:
                    name = tc.get("name", "")
                    if name in ["multi_replace_file_content", "replace_file_content", "default_api:multi_replace_file_content", "default_api:replace_file_content"]:
                        args = tc.get("args", {})
                        if "AdminDashboard.jsx" in args.get("TargetFile", "") or "AdminDashboard.jsx" in str(args):
                            if "ReplacementChunks" in args:
                                for chunk in args["ReplacementChunks"]:
                                    edits.append({"tc": chunk["TargetContent"], "rc": chunk["ReplacementContent"]})
                            elif "TargetContent" in args:
                                edits.append({"tc": args["TargetContent"], "rc": args["ReplacementContent"]})
            
            # 2. From direct TOOL_CALL step
            if entry.get("type") == "TOOL_CALL":
                tc = entry.get("tool_call", {})
                name = tc.get("name", "")
                if name in ["multi_replace_file_content", "replace_file_content", "default_api:multi_replace_file_content", "default_api:replace_file_content"]:
                    args = tc.get("args", {})
                    if "AdminDashboard.jsx" in args.get("TargetFile", "") or "AdminDashboard.jsx" in str(args):
                        if "ReplacementChunks" in args:
                            for chunk in args["ReplacementChunks"]:
                                edits.append({"tc": chunk["TargetContent"], "rc": chunk["ReplacementContent"]})
                        elif "TargetContent" in args:
                            edits.append({"tc": args["TargetContent"], "rc": args["ReplacementContent"]})
        except Exception:
            pass

print(f"Found {len(edits)} chunks to apply...")
failed = 0
for i, edit in enumerate(edits):
    tc = edit["tc"]
    rc = edit["rc"]
    
    if isinstance(tc, str) and tc.startswith('"') and tc.endswith('"'):
        try:
            tc = json.loads(tc)
        except:
            pass
    if isinstance(rc, str) and rc.startswith('"') and rc.endswith('"'):
        try:
            rc = json.loads(rc)
        except:
            pass

    if tc in content:
        content = content.replace(tc, rc, 1)
        print(f"Applied chunk {i+1}")
    else:
        print(f"WARNING: Chunk {i+1} TargetContent not found!")
        failed += 1

with open(target_file, "w") as f:
    f.write(content)

print(f"Done. {len(edits)} total, {failed} failed.")
