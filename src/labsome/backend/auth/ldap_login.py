from flask import request
from flask_wtf import Form
from wtforms import StringField
from wtforms import PasswordField
from wtforms import SubmitField
from .roles import roles
from .ldap_server import LdapServer
from .ldap_server import LdapError
from ..auth.models import User

class LdapLoginForm(Form):
    username = StringField('Username')
    password = PasswordField('Password')
    submit = SubmitField('Login')

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

        self.user = User.get_by_username(self.username.data)
        if self.user is None:
            self.user = User(username=self.username.data, roles=[roles.User])
        self.user.first_name = user_details.get('attribute_first_name', None)
        self.user.last_name  = user_details.get('attribute_last_name', None)
        self.user.email      = user_details.get('attribute_email', None)
        self.user.save()

        if not self.user.is_active:
            self.username.errors.append('Your account has been deactivated. If you believe this is a mistake, please contact your administrator.')
            return False
        return True
