import json

log_path = '/Users/julierothschild/.gemini/antigravity/brain/a2e3b11b-b198-4bfa-9543-7b2eebd4a802/.system_generated/logs/overview.txt'

latest_file = None

with open(log_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'content' in data:
                content = data['content']
                if '[diff_block_start]' in content and 'platanus-hack-26-argentina-arcade/game.js' in content:
                    latest_file = content
        except Exception:
            pass

if latest_file:
    # extract the file content from the diff block
    # Note: the content is usually formatted as:
    # The following changes were made by the USER to: ...
    # [diff_block_start]
    # @@ -1,156 +1,162 @@
    #  <line_number>: <original_line> -- wait no, diff format.
    import re
    # The diff has lines like " " or "-" or "+".
    blocks = latest_file.split('[diff_block_start]')
    full_text = []
    
    for block in blocks[1:]:
        diff_text = block.split('[diff_block_end]')[0]
        # We need to extract the target file content.
        # Since it's a full replace diff from the IDE, we just grab lines starting with '+' or ' '.
        # Actually, let's just write the diff out so I can inspect it.
        with open('diff_dump.txt', 'a') as df:
            df.write(diff_text)
            df.write("\n---\n")

print("Dumped diffs.")
