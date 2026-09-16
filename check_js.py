import sys

with open('app.js', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()
stack = []
for line_no, line in enumerate(lines, 1):
    in_str = False
    str_char = ''
    i = 0
    while i < len(line):
        ch = line[i]
        if in_str:
            if ch == '\\':
                i += 1
            elif ch == str_char:
                in_str = False
        else:
            if ch in ('"', "'", '`'):
                in_str = True
                str_char = ch
            elif ch == '/' and i + 1 < len(line) and line[i+1] == '/':
                break
            elif ch == '{':
                stack.append((line_no, line))
            elif ch == '}':
                if stack:
                    stack.pop()
                else:
                    print(f"Unmatched closing brace at line {line_no}: {line}")
        i += 1

print(f"Total unclosed open braces: {len(stack)}")
for l_no, l_text in stack:
    print(f"  Line {l_no}: {l_text[:70]}")
