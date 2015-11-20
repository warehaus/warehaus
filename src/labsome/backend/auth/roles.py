from bunch import Bunch
from flask.ext.security import roles_accepted

roles = Bunch(
    Admin = 'admin',
    User = 'user',
)

admin_required = roles_accepted('admin')
user_required = roles_accepted('admin', 'user')
