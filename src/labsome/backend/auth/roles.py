from functools import wraps
from bunch import Bunch
from flask.ext.security import login_required
from flask.ext.security import roles_accepted

roles = Bunch(
    Admin = 'admin',
    User = 'user',
)

def admin_required(func):
    return login_required(roles_accepted(roles.Admin)(func))

def user_required(func):
    return login_required(roles_accepted(roles.Admin, roles.User)(func))
