import json

log_file = "/Users/animeshpathak/.gemini/antigravity-ide/brain/72d41117-e916-48aa-b74d-4aa85a35a92d/.system_generated/logs/transcript.jsonl"
edits = []
with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            if "tool_calls" in entry:
                for tc in entry["tool_calls"]:
                    name = tc.get("name", "")
                    if name in ["multi_replace_file_content", "replace_file_content", "default_api:multi_replace_file_content", "default_api:replace_file_content"]:
                        args = tc.get("args", {})
                        if "AdminDashboard.jsx" in args.get("TargetFile", ""):
                            edits.append(args)
        except Exception:
            pass

print(json.dumps(edits[:1], indent=2))
