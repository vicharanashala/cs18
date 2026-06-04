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
            tcs = []
            if "tool_calls" in entry and isinstance(entry["tool_calls"], list):
                tcs.extend(entry["tool_calls"])
            if entry.get("type") == "TOOL_CALL" and "tool_call" in entry:
                if isinstance(entry["tool_call"], dict):
                    tcs.append(entry["tool_call"])
            
            for tc in tcs:
                if not isinstance(tc, dict):
                    continue
                name = tc.get("name", "")
                if "replace" in name:
                    args = tc.get("args", {})
                    # handle stringified args
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    # handle double stringified args
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    
                    if isinstance(args, dict):
                        file_path = args.get("TargetFile", "")
                        if "AdminDashboard.jsx" in file_path:
                            if "ReplacementChunks" in args:
                                for chunk in args["ReplacementChunks"]:
                                    edits.append({"tc": chunk["TargetContent"], "rc": chunk["ReplacementContent"]})
                            elif "TargetContent" in args:
                                edits.append({"tc": args["TargetContent"], "rc": args["ReplacementContent"]})
        except Exception as e:
            pass

print(f"Found {len(edits)} chunks to apply...")
failed = 0
for i, edit in enumerate(edits):
    tc = edit["tc"]
    rc = edit["rc"]
    
    # parse tc/rc if they are json strings
    if isinstance(tc, str) and tc.startswith('"') and tc.endswith('"'):
        try:
            parsed = json.loads(tc)
            if isinstance(parsed, str): tc = parsed
        except: pass
    if isinstance(rc, str) and rc.startswith('"') and rc.endswith('"'):
        try:
            parsed = json.loads(rc)
            if isinstance(parsed, str): rc = parsed
        except: pass

    if tc in content:
        content = content.replace(tc, rc, 1)
        print(f"Applied chunk {i+1}")
    else:
        # print first 50 chars of missing chunk to debug
        print(f"WARNING: Chunk {i+1} TargetContent not found! ({repr(tc[:50])}...)")
        failed += 1

with open(target_file, "w") as f:
    f.write(content)

print(f"Done. {len(edits)} total, {failed} failed.")
