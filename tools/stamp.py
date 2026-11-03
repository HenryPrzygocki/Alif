"""Stamp a new version before each release, so browsers fetch the new files instead of old cached ones.

Rewrites the ?v= on every script and stylesheet in index.html and writes version.json,
which open tabs check to offer a reload. Run from the repo root:  python3 tools/stamp.py
"""
import re, json, datetime, pathlib

v = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
idx = pathlib.Path('index.html')
s = idx.read_text(encoding='utf8')
s = re.sub(r'(href="css/app\.css)(\?v=\d+)?"', rf'\g<1>?v={v}"', s)
s = re.sub(r'(src="js/[^"?]+\.js)(\?v=\d+)?"', rf'\g<1>?v={v}"', s)
s = re.sub(r'window\.HURUF_VERSION = "\d*"', f'window.HURUF_VERSION = "{v}"', s)
idx.write_text(s, encoding='utf8')
pathlib.Path('version.json').write_text(json.dumps({'v': v}) + '\n', encoding='utf8')
print('version', v)
