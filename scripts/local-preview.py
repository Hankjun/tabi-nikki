#!/usr/bin/env python3
"""Start an independent, loopback-only preview of the built journal."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = 'http://127.0.0.1:4173/'

class JournalHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'dist/client'), **kwargs)

    def do_GET(self):
        if self.path == '/_tabi/health':
            data = json.dumps({'app': 'tabi-nikki', 'root': str(ROOT)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def end_headers(self):
        # Refreshes always pick up newly added photos and page revisions.
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def running():
    try:
        with urllib.request.urlopen(URL + '_tabi/health', timeout=1) as response:
            state = json.load(response)
        return state.get('app') == 'tabi-nikki' and state.get('root') == str(ROOT)
    except (OSError, ValueError):
        return False

def start():
    if running():
        print('旅行日记已在运行：' + URL)
        return
    if not (ROOT / 'dist/client/index.html').is_file():
        subprocess.run(['npm', 'run', 'build'], cwd=ROOT, check=True)
    runtime = ROOT / '.runtime'
    runtime.mkdir(exist_ok=True)
    with (runtime / 'preview.log').open('ab') as log:
        child = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '--serve'],
                                 stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                 start_new_session=True, cwd=ROOT)
    for _ in range(40):
        if running():
            print('旅行日记已启动：' + URL)
            return
        if child.poll() is not None:
            raise SystemExit('启动失败，请查看 .runtime/preview.log；4173 端口可能已被占用。')
        time.sleep(0.1)
    raise SystemExit('启动超时，请查看 .runtime/preview.log。')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true')
    args = parser.parse_args()
    if args.serve:
        ThreadingHTTPServer(('127.0.0.1', 4173), JournalHandler).serve_forever()
    else:
        start()
