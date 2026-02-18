from flask import Blueprint, render_template, request, jsonify
import paramiko
import re
import os

# Helper to normalize path (handle absolute/relative and ServerRoot)
def resolve_path(path, server_root):
    path = path.strip('"\'')  # Remove quotes
    if not path.startswith('/'):
        return os.path.join(server_root, path)
    return path

def get_files_from_glob(client, pattern):
    # Use ls to expand glob patterns on the remote server
    # -1: list one file per line
    # -d: list directories themselves, not their contents (though we expect files)
    stdin, stdout, stderr = client.exec_command(f"ls -1d {pattern}")
    output = stdout.read().decode('utf-8').strip()
    if not output:
        return []
    return output.split('\n')

def fetch_config_recursively(client, file_path, server_root, visited, configs):
    if file_path in visited:
        return
    
    visited.add(file_path)
    
    stdin, stdout, stderr = client.exec_command(f"cat {file_path}")
    content = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    if not content and err:
        configs.append({
            'path': file_path,
            'content': f"Error reading file: {err}",
            'error': True
        })
        return

    configs.append({
        'path': file_path,
        'content': content,
        'error': False
    })
    
    # Find Includes
    # Patterns: Include path/to/file, IncludeOptional path/to/*.conf
    include_pattern = re.compile(r'^\s*Include(Optional)?\s+(.+)$', re.MULTILINE)
    matches = include_pattern.findall(content)
    
    for _, include_path in matches:
        full_pattern = resolve_path(include_path, server_root)
        
        # Expand glob if present
        if '*' in full_pattern or '?' in full_pattern:
            expanded_files = get_files_from_glob(client, full_pattern)
            for f in expanded_files:
                fetch_config_recursively(client, f.strip(), server_root, visited, configs)
        else:
             fetch_config_recursively(client, full_pattern, server_root, visited, configs)


infrastructure_bp = Blueprint('infrastructure', __name__)

@infrastructure_bp.route('/web-server')
def web_server_assessment():
    return render_template('assessments/web_server.html')

@infrastructure_bp.route('/web-server/scan', methods=['POST'])
def scan_web_servers():
    data = request.json
    servers = data.get('servers', [])
    results = []

    for server in servers:
        ip = server.get('ip')
        user = server.get('username')
        password = server.get('password')
        
        result = {'ip': ip}
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        try:
            # Attempt connection with provided credentials
            client.connect(ip, username=user, password=password, timeout=10)

            # 1. Check process
            stdin, stdout, stderr = client.exec_command("ps -ef | grep httpd | grep -v grep")
            process_output = stdout.read().decode('utf-8').strip()

            if not process_output:
                result['status'] = 'error'
                result['message'] = 'httpd process not found'
            else:
                result['status'] = 'success'
                result['process_info'] = process_output

                # 2. Extract config file path & ServerRoot
                # Look for -f (config) and -d (server root) flags
                config_path = '/etc/httpd/conf/httpd.conf' # Default
                server_root = '/etc/httpd' # Default
                
                match_f = re.search(r'-f\s+([\w/.-]+)', process_output)
                if match_f:
                    config_path = match_f.group(1)
                
                match_d = re.search(r'-d\s+([\w/.-]+)', process_output)
                if match_d:
                    server_root = match_d.group(1)
                elif not config_path.startswith('/'):
                     # If config path is relative and no -d, we might need a better guess or assume default
                     pass

                # If config_path is relative, prepend ServerRoot
                if not config_path.startswith('/'):
                    config_path = os.path.join(server_root, config_path)

                result['main_config_file'] = config_path
                result['server_root'] = server_root

                # 3. Recursively read config files
                collected_configs = []
                visited_paths = set()
                
                fetch_config_recursively(client, config_path, server_root, visited_paths, collected_configs)
                
                result['configs'] = collected_configs
                result['config_count'] = len(collected_configs)

        except Exception as e:
            result['status'] = 'error'
            result['message'] = str(e)
        finally:
            client.close()

        results.append(result)

    return jsonify(results)
