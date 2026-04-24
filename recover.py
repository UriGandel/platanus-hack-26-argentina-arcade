import re
import json

log_path = '/Users/julierothschild/.gemini/antigravity/brain/a2e3b11b-b198-4bfa-9543-7b2eebd4a802/.system_generated/logs/overview.txt'

with open(log_path, 'r') as f:
    lines = f.readlines()

diffs = []
current_diff = []
in_diff = False

for line in lines:
    if '[diff_block_start]' in line:
        in_diff = True
        current_diff = []
        continue
    if '[diff_block_end]' in line:
        in_diff = False
        if current_diff:
            diffs.append(current_diff)
        continue
    if in_diff:
        current_diff.append(line)

print("Found", len(diffs), "diffs.")
for i, d in enumerate(diffs):
    print(f"Diff {i}: {len(d)} lines")

# Let's write the sizes out so we can inspect
