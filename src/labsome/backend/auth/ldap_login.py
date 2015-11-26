import ldap
from bunch import Bunch
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

class LdapError(Exception):
    pass

class LdapServer(object):
    AVAILABLE_SETTINGS = {
        'server_scheme': True,
        'server_address': True,
        'server_port': False,
        'base_dn': True,
        'users_dn': True,
        'attribute_username': True,
        'attribute_first_name': True,
        'attribute_last_name': True,
        'attribute_email': True,
    }

    def __init__(self, **kwargs):
        super(LdapServer, self).__init__()
        extraneous_settings = set(kwargs) - set(self.AVAILABLE_SETTINGS)
        if extraneous_settings:
            raise TypeError('Unknown LDAP kwargs: {}'.format(', '.join(extraneous_settings)))
        self.settings = Bunch(current_app.config.get('LDAP_SETTINGS', {}) or {})
        for key, value in kwargs.iteritems():
            self.settings[key] = value
        for key, required in self.AVAILABLE_SETTINGS.iteritems():
            if key not in self.settings or (required and not self.settings[key]):
                raise TypeError('Missing LDAP configuration: {}'.format(key))
        self._conn = None

    def _user_filter(self, username):
        return '{}={}'.format(self.settings.attribute_username, username)

    def _user_dn(self, username):
        return ','.join((self._user_filter(username), self.settings.users_dn, self.settings.base_dn))

    def _server_uri(self):
        server_uri = self.settings.server_scheme + self.settings.server_address
        if self.settings.server_port:
            server_uri += ':' + self.settings.server_port
        return server_uri

    def attempt_login(self, username, password):
        who = self._user_dn(username)
        try:
            ldap_client = ldap.initialize(self._server_uri())
            ldap_client.set_option(ldap.OPT_REFERRALS,0)
            ldap_client.simple_bind_s(who, password)
        except ldap.INVALID_CREDENTIALS:
            ldap_client.unbind()
            raise LdapError('Username or password incorrect')
        except ldap.SERVER_DOWN:
            raise LdapError('Could not connect to LDAP server')
        except ldap.INVALID_DN_SYNTAX:
            raise LdapError('The format for "Base DN" is not valid')
        result = self._get_attributes(ldap_client, username,
                                      {key: value for key, value in self.settings.iteritems()
                                       if key.startswith('attribute_')})
        ldap_client.unbind()
        return result

    def _get_attributes(self, ldap_client, username, attrs):
        user_filter = self._user_filter(username)
        results = ldap_client.search_s(self.settings.base_dn, ldap.SCOPE_SUBTREE, user_filter)
        if len(results) == 0:
            raise LdapError(('Got no results while searching for attributes of "{username}" (the ' +
                             'filter used was "{user_filter}"). Please make sure the given attributes match ' +
                             "your directory's configuration").format(username=username, user_filter=user_filter))
        if len(results) > 1:
            raise LdapError(('Got more than 1 result while searching for "{username}". Please make sure ' +
                             "the given attributes match your directory's configuration").format(username=username))
        [(_, user_attributes)] = results
        result = {}
        for attr_name, ldap_attr in attrs.iteritems():
            if ldap_attr in user_attributes:
                result[attr_name] = user_attributes[ldap_attr][0]
        return result

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
            ldap_server = LdapServer()
            user_details = ldap_server.attempt_login(self.username.data, self.password.data)
        except LdapError as error:
            self.password.errors.append(str(error))
            return False

        self.user = _datastore.get_user(self.username.data)
        if self.user is None:
            self.user = _datastore.create_user(username=self.username.data)
            _datastore.add_role_to_user(self.user, roles.User)

        self.user.first_name = user_details.get('attribute_first_name', None)
        self.user.last_name  = user_details.get('attribute_last_name', None)
        self.user.email      = user_details.get('attribute_email', None)

        if not self.user.is_active():
            self.username.errors.append('Your account has been deactivated. If you believe this is a mistake, please contact your administrator.')
            return False
        return True
