# Thanks https://gist.github.com/ibeex/1288159
import ldap

class LdapLoginError(Exception):
    pass

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
