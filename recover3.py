with open("diff_dump.txt", "r") as f:
    text = f.read()

chunks = text.split("---")
# A diff chunk has lines. Let's look for a chunk that starts with '@@ -1,'
for i, chunk in enumerate(chunks):
    if "@@ -1," in chunk:
        print(f"Found @@ -1, in chunk {i}")
        # Let's extract the lines
        lines = chunk.split("\n")
        out = []
        for line in lines:
            if line.startswith("-") and not line.startswith("---"):
                pass
            elif line.startswith("+") and not line.startswith("+++"):
                out.append(line[1:])
            elif line.startswith(" "):
                out.append(line[1:])
        
        with open(f"recovered_file_{i}.js", "w") as out_f:
            out_f.write("\n".join(out))
