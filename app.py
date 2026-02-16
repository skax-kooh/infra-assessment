from flask import Flask, render_template
from modules.infrastructure.routes import infrastructure_bp

app = Flask(__name__)

# Register Blueprints
app.register_blueprint(infrastructure_bp, url_prefix='/infrastructure')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
