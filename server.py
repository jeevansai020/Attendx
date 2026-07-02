import http.server
import socketserver
import os

PORT = 5500

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Remove trailing slash if present to normalize path
        path_norm = self.path.rstrip('/')
        if not path_norm:
            path_norm = '/index.html'

        # Translate request path to local file path
        local_path = self.translate_path(path_norm)

        # If file doesn't exist and has no extension, try appending .html
        if not os.path.exists(local_path) and not os.path.splitext(local_path)[1]:
            html_path = local_path + '.html'
            if os.path.exists(html_path):
                self.path = path_norm + '.html'

        return super().do_GET()

# Allow port reuse immediately after killing previous servers
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), CleanURLHandler) as httpd:
    print(f"Server started at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
