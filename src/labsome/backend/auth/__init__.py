from flask import current_app
from flask.ext.security import Security
from .models import user_datastore
from .models import User
from ..db import db
from .ldap_login import LdapLoginForm
from .roles import roles

def _ensure_roles():
    for role_name in roles.itervalues():
        user_datastore.find_or_create_role(name=role_name)
    db.session.commit()

def init_app():
    security = Security(current_app, user_datastore,
                        login_form=LdapLoginForm)
    _ensure_roles()
