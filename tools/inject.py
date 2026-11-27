"""Inject src/*_part.js and src/*.css into www/index.html between marker comments.
Usage: python3 tools/inject.py   (idempotent)"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'www/index.html').read_text()
for part in sorted((root / 'src').glob('*_part.js')):
    name = part.stem
    body = part.read_text()
    a, b = f'// <{name}>', f'// </{name}>'
    block = f'{a}\n{body}\n{b}'
    if a in html:
        html = re.sub(re.escape(a) + r'.*?' + re.escape(b), lambda m: block, html, flags=re.S)
    else:
        anchor = '// ---------- SETTINGS ----------'
        assert html.count(anchor) == 1
        html = html.replace(anchor, block + '\n\n' + anchor)
for css in sorted((root / 'src').glob('*.css')):
    a, b = f'/* <{css.stem}> */', f'/* </{css.stem}> */'
    block = f'{a}\n{css.read_text()}\n{b}'
    if a in html:
        html = re.sub(re.escape(a) + r'.*?' + re.escape(b), lambda m: block, html, flags=re.S)
    else:
        i = html.index('</style>', html.index('</style>') + 1)
        html = html[:i] + block + '\n' + html[i:]
(root / 'www/index.html').write_text(html)
print('ok')
