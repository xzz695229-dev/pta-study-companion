"""Check publishable source tree for broken relative links and obvious secret artifacts."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
issues=[]
secret_name=re.compile(r'^(?:auth\.json|credentials(?:\..*)?|\.env(?:\..*)?)$',re.I)
secret_value=[re.compile(r'\bsk-[A-Za-z0-9_-]{24,}'),re.compile(r'\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}')]
for p in root.rglob('*'):
 if not p.is_file() or any(x in p.parts for x in ('.git','.venv','__pycache__','node_modules')):continue
 if secret_name.match(p.name):issues.append(f'Runtime/secret file: {p.relative_to(root)}')
 if p.suffix in ('.png','.zip','.pyc'):continue
 try:text=p.read_text(encoding='utf-8')
 except UnicodeDecodeError:issues.append(f'Unexpected binary file: {p.relative_to(root)}');continue
 for pattern in secret_value:
  if pattern.search(text):issues.append(f'Possible credential in {p.relative_to(root)}')
 if p.suffix=='.md':
  for dest in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)',text):
   if dest.startswith(('https://','http://','#','mailto:')):continue
   target=dest.split('#',1)[0]
   if target and not (p.parent/target).exists():issues.append(f'Broken link in {p.relative_to(root)}: {target}')
if issues:raise SystemExit('\n'.join(issues))
print('Release checks passed: relative Markdown links and obvious credential artifacts.')
print('This pattern scan does not replace manual review or a full secret scanner.')
