import json

log_file = "/Users/animeshpathak/.gemini/antigravity-ide/brain/72d41117-e916-48aa-b74d-4aa85a35a92d/.system_generated/logs/transcript.jsonl"
edits = []
with open(log_file, "r") as f:
    for line in f:
        if "AdminDashboard.jsx" in line and "multi_replace_file_content" in line:
            try:
                entry = json.loads(line)
                edits.append(entry)
            except:
                pass

print(f"Found {len(edits)} lines.")
if len(edits) > 0:
    for i, e in enumerate(edits):
        print(f"Line {i+1} keys: {list(e.keys())}, type: {e.get('type')}")
