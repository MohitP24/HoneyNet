#!/usr/bin/env python3
"""
Production-grade HTTP Honeypot using Flask
Logs all HTTP requests with headers, body, and attempts to exploit common vulnerabilities
"""

import os
import json
import logging
from datetime import datetime
from flask import Flask, request, Response, render_template_string
from werkzeug.serving import make_server

# Configuration
HTTP_HOST = "0.0.0.0"
HTTP_PORT = 8080
LOG_FILE = "/tmp/http_honeypot.json"

# Setup Flask app
app = Flask(__name__)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[HTTP Honeypot] %(asctime)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Disable Flask's default logging to reduce noise
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


def log_request(event_type="http_request", additional_data=None):
    """Log HTTP request to JSON file"""
    try:
        # Extract request data
        data = {
            "timestamp": datetime.now().isoformat(),
            "eventType": event_type,
            "sourceIP": request.remote_addr,
            "sourcePort": request.environ.get('REMOTE_PORT', 0),
            "service": "HTTP",
            "protocol": "HTTP",
            "destination_port": HTTP_PORT,
            "method": request.method,
            "path": request.path,
            "url": request.url,
            "command": f"{request.method} {request.path}",
            "user_agent": request.headers.get('User-Agent', ''),
            "referrer": request.headers.get('Referer', ''),
            "host": request.headers.get('Host', ''),
            "content_type": request.headers.get('Content-Type', ''),
            "content_length": request.headers.get('Content-Length', 0),
            "query_string": request.query_string.decode('utf-8', errors='ignore'),
            "message": f"{request.method} {request.path}"
        }
        
        # Add POST/PUT data if present
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if request.is_json:
                    data['body'] = request.get_json()
                else:
                    data['body'] = request.get_data(as_text=True)[:1000]  # Limit to 1KB
            except Exception:
                data['body'] = '[Unable to parse body]'
        
        # Add additional data if provided
        if additional_data:
            data.update(additional_data)
        
        # Write to log file
        with open(LOG_FILE, "a") as f:
            f.write(json.dumps(data) + "\n")
        
        logger.info(f"{request.method} {request.path} from {request.remote_addr}")
    
    except Exception as e:
        logger.error(f"Failed to log request: {e}")


# Fake login page HTML
LOGIN_PAGE = """
<!DOCTYPE html>
<html>
<head>
    <title>Admin Login</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f0f0f0; }
        .login-box { width: 300px; margin: 100px auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #333; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .error { color: red; text-align: center; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>Admin Panel</h2>
        {% if error %}
        <p class="error">{{ error }}</p>
        {% endif %}
        <form method="POST">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>
"""

# Fake admin panel HTML
ADMIN_PAGE = """
<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
        .header { background: #007bff; color: white; padding: 20px; margin: -20px -20px 20px -20px; }
        .content { background: white; padding: 20px; border-radius: 5px; }
        h1 { margin: 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {{ username }}</p>
    </div>
    <div class="content">
        <h2>System Status</h2>
        <p>All systems operational</p>
        <p><a href="/admin/users">Manage Users</a></p>
        <p><a href="/admin/config">System Configuration</a></p>
        <p><a href="/admin/logs">View Logs</a></p>
    </div>
</body>
</html>
"""


@app.route('/')
def index():
    """Root path - fake server info"""
    log_request("http_request")
    return Response(
        "Apache/2.4.41 (Ubuntu) Server at localhost Port 80",
        mimetype='text/html'
    )


@app.route('/admin')
@app.route('/admin/')
@app.route('/login')
@app.route('/admin/login')
def admin_login_get():
    """Fake admin login page - GET"""
    log_request("admin_access")
    return render_template_string(LOGIN_PAGE)


@app.route('/admin', methods=['POST'])
@app.route('/admin/', methods=['POST'])
@app.route('/login', methods=['POST'])
@app.route('/admin/login', methods=['POST'])
def admin_login_post():
    """Fake admin login page - POST (capture credentials)"""
    username = request.form.get('username', '')
    password = request.form.get('password', '')
    
    log_request("credential_theft", {
        "username": username,
        "password": password,
        "attack_type": "credential_capture",
        "message": f"Login attempt: {username}:{password}"
    })
    
    # Always show "logged in" to keep attacker engaged
    return render_template_string(ADMIN_PAGE, username=username)


@app.route('/admin/<path:subpath>')
def admin_panel(subpath):
    """Fake admin panel pages"""
    log_request("admin_access", {
        "subpath": subpath,
        "message": f"Admin panel access: /admin/{subpath}"
    })
    return render_template_string(ADMIN_PAGE, username="admin")


@app.route('/<path:path>')
def catch_all(path):
    """Catch all other requests - log everything"""
    
    # Detect common attack patterns
    attack_patterns = {
        'php': 'PHP file access attempt',
        'wp-admin': 'WordPress admin access',
        'wp-login': 'WordPress login attempt',
        'phpmyadmin': 'phpMyAdmin access attempt',
        'sql': 'SQL injection attempt',
        '../': 'Path traversal attempt',
        'shell': 'Shell upload attempt',
        'cmd': 'Command injection attempt',
        'eval': 'Code execution attempt',
        'passwd': 'Password file access',
        'shadow': 'Shadow file access'
    }
    
    attack_type = None
    for pattern, description in attack_patterns.items():
        if pattern in path.lower():
            attack_type = description
            break
    
    additional_data = {}
    if attack_type:
        additional_data['attack_type'] = attack_type
        additional_data['suspicious'] = True
        log_request("attack_attempt", additional_data)
    else:
        log_request("http_request", additional_data)
    
    # Return fake 200 response to encourage more probing
    return Response(
        f"<!-- Path: {path} -->\n<html><body><h1>Index of /{path}</h1></body></html>",
        mimetype='text/html'
    )


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    log_request("http_request", {"error": "404"})
    return Response("404 Not Found", status=404)


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    log_request("http_request", {"error": "500"})
    return Response("500 Internal Server Error", status=500)


def main():
    """Start HTTP honeypot server"""
    
    logger.info(f"HTTP Honeypot starting on {HTTP_HOST}:{HTTP_PORT}")
    logger.info(f"Logging to: {LOG_FILE}")
    logger.info("Fake endpoints: /, /admin, /login, /admin/*, /<any path>")
    
    try:
        # Create custom server with error handling
        server = make_server(HTTP_HOST, HTTP_PORT, app, threaded=True)
        logger.info(f"✅ HTTP Honeypot listening on http://{HTTP_HOST}:{HTTP_PORT}")
        server.serve_forever()
    
    except KeyboardInterrupt:
        logger.info("HTTP Honeypot shutting down...")
    except Exception as e:
        logger.error(f"HTTP Honeypot error: {e}")
        raise


if __name__ == "__main__":
    main()
