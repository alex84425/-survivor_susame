"""本地測試伺服器：與 python -m http.server 相同，但關閉快取，改完程式重新整理就生效。
用法：python tools/serve.py [port]
"""
import http.server
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


class NoCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        # 背景音樂清單：列出 assets/audio 裡的音樂檔，讓遊戲不用盲目試探
        if self.path.split("?")[0] == "/assets/audio/list.json":
            d = os.path.join(ROOT, "assets", "audio")
            files = sorted(f for f in os.listdir(d) if f.lower().endswith((".mp3", ".ogg", ".m4a", ".wav"))) if os.path.isdir(d) else []
            body = json.dumps(files).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
    print(f"http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), NoCache).serve_forever()
