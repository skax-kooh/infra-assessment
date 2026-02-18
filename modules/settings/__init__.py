from flask import Blueprint, render_template

config_bp = Blueprint('config', __name__)

@config_bp.route('/llm')
def llm_settings():
    return render_template('settings/llm.html')
