import os
import httplib
from flask import request
from flask import abort as flask_abort
from flask_restful import Resource
from flask_jwt import current_identity
from .models import User
from .roles import user_required
from .roles import admin_required
from .roles import roles

SAFE_FIELDS = (
    'id',
    'username',
    'display_name',
    'email',
    'api_tokens',
)

def cleaned_user(user):
    if roles.Admin in current_identity.roles:
        return user
    return {field_name: user[field_name] for field_name in SAFE_FIELDS}

def cleaned_current_user():
    user = cleaned_user(current_identity.as_dict())
    user['roles'] = current_identity.roles
    return user

def get_user(user_id):
    user = User.query.get(user_id)
    if user is None:
        flask_abort(httplib.NOT_FOUND)
    return user

class CurrentUser(Resource):
    @user_required
    def get(self):
        return cleaned_current_user()

class AllUsers(Resource):
    @user_required
    def get(self):
        return dict(objects=tuple(cleaned_user(user.as_dict()) for user in User.query.all()))

    @admin_required
    def post(self):
        user = User(**request.json)
        user.save()
        return user.as_dict(), httplib.CREATED

class SingleUser(Resource):
    @user_required
    def get(self, user_id):
        return get_user(user_id).as_dict()

    @admin_required
    def put(self, user_id):
        user = get_user(user_id)
        user.update(**request.json)
        user.save()
        return user.as_dict(), httplib.ACCEPTED

    @admin_required
    def delete(self, user_id):
        user = get_user(user_id)
        user.delete()
        return user.as_dict(), httplib.NO_CONTENT

class UserTokens(Resource):
    @user_required
    def post(self, user_id):
        user = get_user(user_id)
        if (current_identity.id != user_id) and (roles.Admin not in current_identity.roles):
            flask_abort(httplib.FORBIDDEN)
        api_token = os.urandom(20).encode('hex')
        user.api_tokens.append(api_token)
        user.save()
        return dict(api_token=api_token), httplib.CREATED

    @user_required
    def delete(self, user_id):
        user = get_user(user_id)
        if (current_identity.id != user_id) and (roles.Admin not in current_identity.roles):
            flask_abort(httplib.FORBIDDEN)
        user.api_tokens = []
        user.save()
        return dict(), httplib.NO_CONTENT
