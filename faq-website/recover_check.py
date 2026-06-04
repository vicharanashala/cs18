import json

log_file = "/Users/animeshpathak/.gemini/antigravity-ide/brain/72d41117-e916-48aa-b74d-4aa85a35a92d/.system_generated/logs/transcript.jsonl"
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
                if not isinstance(tc, dict): continue
                name = tc.get("name", "")
                if "replace" in name:
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try: args = json.loads(args)
                        except: pass
                    if isinstance(args, dict):
                        file_path = args.get("TargetFile", "")
                        edits.append(file_path)
        except Exception:
            pass

from collections import Counter
print(json.dumps(Counter(edits), indent=2))
