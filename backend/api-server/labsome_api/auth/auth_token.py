from flask import request
from flask import _request_ctx_stack
from .models import User

def attempt_auth_token_login():
    api_token = request.args.get('token') or request.headers.get('Authentication-Token')
    if not api_token:
        return False
    user = User.get_by_api_token(api_token)
    if user is None:
        return False
    _request_ctx_stack.top.current_identity = user
    return True
