from flask import Blueprint, render_template, request, jsonify
import random

infrastructure_bp = Blueprint('infrastructure', __name__)

@infrastructure_bp.route('/web-server')
def web_server_assessment():
    return render_template('assessments/web_server.html')

@infrastructure_bp.route('/web-server/scan', methods=['POST'])
def scan_web_servers():
    data = request.json
    ips = data.get('ips', [])
    results = []

    for ip in ips:
        # Simulate connecting and collecting Apache config
        mock_config = {
            'ip': ip,
            'server_root': '/etc/httpd',
            'document_root': '/var/www/html',
            'listen_port': 80,
            'max_clients': random.choice([150, 256, 500]),
            'keep_alive': random.choice(['On', 'Off']),
            'timeout': 60
        }
        results.append(mock_config)
    
    return jsonify(results)
