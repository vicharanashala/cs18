import json

log_file = "/Users/animeshpathak/.gemini/antigravity-ide/brain/72d41117-e916-48aa-b74d-4aa85a35a92d/.system_generated/logs/transcript.jsonl"
target_file = "/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/pages/AdminDashboard.jsx"

# First parse all tool responses to find successful tool call IDs
successful_call_ids = set()
with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            # Find tool responses. In gemini, it might be in a TOOL_RESPONSE type
            if entry.get("type") == "TOOL_RESPONSE":
                resp = entry.get("tool_response", {})
                call_id = resp.get("id")
                # How do we know if it was successful? The output shouldn't contain "error" or "failed" usually, 
                # but if it's multi_replace_file_content, it outputs "The following changes were made"
                output = resp.get("output", "")
                if "The following changes were made" in output or "replaced" in output:
                    successful_call_ids.add(call_id)
        except:
            pass

# Also, in gemini style without explicit TOOL_RESPONSE steps?
# The transcript for Gemini might store tool calls in MODEL_RESPONSE with `tool_calls` array, and the next step is TOOL_RESPONSE.
# Let's just collect all tool calls and their outputs from the transcript!

