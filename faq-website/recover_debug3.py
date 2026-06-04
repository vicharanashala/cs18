import json

log_file = "/Users/animeshpathak/.gemini/antigravity-ide/brain/72d41117-e916-48aa-b74d-4aa85a35a92d/.system_generated/logs/transcript.jsonl"
with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            if "tool_calls" in entry:
                print(type(entry["tool_calls"][0]), str(entry["tool_calls"][0])[:100])
                break
        except Exception:
            pass
