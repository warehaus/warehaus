import ldap
from flask import request
from flask import current_app
from flask.ext.security.forms import Form
from flask.ext.security.forms import NextFormMixin
from wtforms import StringField
from wtforms import PasswordField
from wtforms import BooleanField
from wtforms import SubmitField
from werkzeug.local import LocalProxy
from .roles import roles

_datastore = LocalProxy(lambda: current_app.extensions['security'].datastore)

class LdapLoginError(Exception):
    pass

# Thanks https://gist.github.com/ibeex/1288159
def attempt_ldap_login(ldap_server_uri, ldap_base_dn, ldap_username_property, username, password):
    who = '{}={},{}'.format(ldap_username_property, username, ldap_base_dn)
    try:
        ldap_client = ldap.initialize(ldap_server_uri)
        ldap_client.set_option(ldap.OPT_REFERRALS,0)
        ldap_client.simple_bind_s(who, password)
    except ldap.INVALID_CREDENTIALS:
        ldap_client.unbind()
        raise LdapLoginError('Username or password incorrect')
    except ldap.SERVER_DOWN:
        raise LdapLoginError('Could not connect to LDAP server')
    ldap_client.unbind()

def attempt_ldap_login_in_app(username, password):
    return attempt_ldap_login(
        ldap_server_uri        = current_app.config['LDAP_SERVER_URI'],
        ldap_base_dn           = current_app.config['LDAP_BASE_DN'],
        ldap_username_property = current_app.config['LDAP_USERNAME_PROPERTY'],
        username = username,
        password = password)

class LdapLoginForm(Form, NextFormMixin):
    username = StringField('Username')
    password = PasswordField('Password')
    remember = BooleanField('Remember me')
    submit = SubmitField('Login')

    def __init__(self, *args, **kwargs):
        super(LdapLoginForm, self).__init__(*args, **kwargs)
        if not self.next.data:
            self.next.data = request.args.get('next', '')
        self.remember.default = True

    def validate(self):
        if not super(LdapLoginForm, self).validate():
            return False

        if self.username.data.strip() == '':
            self.username.errors.append('Please fill-in your username')
            return False

        if self.password.data.strip() == '':
            self.password.errors.append('Please fill-in your password')
            return False

        try:
            attempt_ldap_login_in_app(self.username.data, self.password.data)
        except LdapLoginError as error:
            self.password.errors.append(str(error))
            return False

        self.user = _datastore.get_user(self.username.data)
        if self.user is None:
            self.user = _datastore.create_user(username=self.username.data)
            _datastore.add_role_to_user(self.user, roles.User)

        if not self.user.is_active():
            self.email.errors.append('Your account has been deactivated. If you believe this is a mistake, please contact your administrator.')
            return False
        return True
