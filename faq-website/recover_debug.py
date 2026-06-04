import json

log_file = "/Users/animeshpathak/.gemini/antigravity-ide/brain/72d41117-e916-48aa-b74d-4aa85a35a92d/.system_generated/logs/transcript.jsonl"
edits = []
with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("type") == "TOOL_CALL":
                tc = entry.get("tool_call", {})
                name = tc.get("name", "")
                if "replace" in name:
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    if isinstance(args, dict):
                        if "AdminDashboard.jsx" in args.get("TargetFile", "") or "AdminDashboard.jsx" in str(args):
                            edits.append(tc)
        except Exception:
            pass

print(f"Found {len(edits)} tool calls.")
if len(edits) > 0:
    print(json.dumps(edits[0], indent=2))
    print("---")
    print(json.dumps(edits[-1], indent=2))
