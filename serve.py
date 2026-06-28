"""
Avatar Base — Local Development HTTP Server
Serves the frontend on http://localhost:8080
Run: python serve.py
"""
import http.server
import socketserver
import os
import webbrowser
import threading

PORT = 8080
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        print(f"  [AvatarBase] {self.address_string()} — {format % args}")

def open_browser():
    import time
    time.sleep(0.8)
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    print(f"""
======================================================
        Avatar Base — Local Dev Server                
   http://localhost:{PORT}                          
   Serving: ./frontend/                            
   Press Ctrl+C to stop                           
======================================================
    """)
    threading.Thread(target=open_browser, daemon=True).start()
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        httpd.allow_reuse_address = True
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  [AvatarBase] Server stopped.")
