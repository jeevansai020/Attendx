import http.server
import socketserver
import os
import sys

PORT = 5500

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Remove trailing slash to normalize path
        path_norm = self.path.rstrip('/')
        if not path_norm or path_norm == '/':
            path_norm = '/index.html'

        # Translate request path to local file path
        local_path = self.translate_path(path_norm)

        # If file doesn't exist and has no extension, try appending .html
        if not os.path.exists(local_path) and not os.path.splitext(local_path)[1]:
            html_path = local_path + '.html'
            if os.path.exists(html_path):
                self.path = path_norm + '.html'

        return super().do_GET()

    def log_message(self, format, *args):
        # Suppress noisy request logs
        pass

# Allow immediate port reuse
socketserver.TCPServer.allow_reuse_address = True

try:
    with socketserver.TCPServer(("", PORT), CleanURLHandler) as httpd:
        print(f"✅ AttendX dev server running → http://localhost:{PORT}")
        print("   Press Ctrl+C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")
            sys.exit(0)
except OSError as e:
    print(f"\n❌ Could not start server: {e}")
    print("   Try running:  fuser -k 5500/tcp  then re-run npm run dev")
    sys.exit(1)
