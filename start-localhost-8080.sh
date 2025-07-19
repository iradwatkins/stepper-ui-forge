#!/bin/bash

# Force localhost:8080 to work by using a simple proxy
echo "🔧 Starting localhost:8080 proxy to fix connectivity issues..."

# Kill any existing processes
pkill -f "vite --port 8080" 2>/dev/null
pkill -f "python.*8080" 2>/dev/null

# Start Vite on a different port first
echo "Starting Vite on port 3000..."
npm run dev -- --port 3000 --host 0.0.0.0 &
VITE_PID=$!

# Wait for Vite to start
sleep 3

# Start a simple proxy from 8080 to 3000
echo "Starting proxy from localhost:8080 to localhost:3000..."
python3 -c "
import http.server
import socketserver
import urllib.request
import threading
from urllib.parse import urlparse

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Proxy to localhost:3000
            url = 'http://localhost:3000' + self.path
            response = urllib.request.urlopen(url)
            self.send_response(response.code)
            for header, value in response.headers.items():
                if header.lower() not in ['connection', 'transfer-encoding']:
                    self.send_header(header, value)
            self.end_headers()
            self.wfile.write(response.read())
        except Exception as e:
            self.send_error(500, str(e))
    
    def do_POST(self):
        self.do_GET()
    
    def log_message(self, format, *args):
        pass  # Suppress logging

print('✅ Proxy running: http://localhost:8080 -> http://localhost:3000')
print('🌐 Your app is now available at: http://localhost:8080')
print('Press Ctrl+C to stop')

with socketserver.TCPServer(('localhost', 8080), ProxyHandler) as httpd:
    httpd.serve_forever()
" &
PROXY_PID=$!

echo "✅ Setup complete!"
echo "🌐 Your app is now available at: http://localhost:8080"
echo "💻 Vite dev server: http://localhost:3000"
echo "To stop: kill $VITE_PID $PROXY_PID"

# Wait for interrupt
wait $PROXY_PID