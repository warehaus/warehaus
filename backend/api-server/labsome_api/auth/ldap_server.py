import ldap
from bunch import Bunch
from flask import current_app

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
