import time
import httplib
from uuid import uuid4

def test_get_login_options(warehaus):
    warehaus.api.get('/api/auth/login')

def test_local_login(warehaus):
    warehaus.api.post('/api/auth/login/local', None, expected_status=httplib.UNAUTHORIZED)
    warehaus.api.post('/api/auth/login/local', dict(username='blah'), expected_status=httplib.UNAUTHORIZED)
    warehaus.api.post('/api/auth/login/local', dict(password='blah'), expected_status=httplib.UNAUTHORIZED)
    warehaus.api.post('/api/auth/login/local', dict(username='hey', password='there'), expected_status=httplib.UNAUTHORIZED)
    warehaus.api.post('/api/auth/login/local', dict(username='admin', password='admin'), expected_status=httplib.OK)

def test_self(warehaus):
    warehaus.api.get('/api/auth/self')
    with warehaus.api.current_user(None, None):
        warehaus.api.get('/api/auth/self', expected_status=httplib.UNAUTHORIZED)

def test_get_users(warehaus):
    warehaus.api.get('/api/auth/users')
    with warehaus.api.current_user(None, None):
        warehaus.api.get('/api/auth/users', expected_status=httplib.UNAUTHORIZED)

def test_get_user(warehaus):
    cur_user = warehaus.api.get('/api/auth/self')
    warehaus.api.get('/api/auth/users/{}'.format(cur_user['id']))
    # XXX to be fixed
    #warehaus.api.get('/api/auth/users/{}'.format(str(uuid4())), expected_status=httplib.NOT_FOUND)
    with warehaus.api.current_user(None, None):
        warehaus.api.get('/api/auth/users/{}'.format(cur_user['id']), expected_status=httplib.UNAUTHORIZED)
        # XXX to be fixed
        #warehaus.api.get('/api/auth/users/{}'.format(str(uuid4())), expected_status=httplib.UNAUTHORIZED)

def _random_username():
    return 'u' + str(time.time())

def _user_count(warehaus):
    return len(warehaus.api.get('/api/auth/users')['objects'])

def test_create_user(warehaus):
    '''Test user creation:
    - Verify that the server checks the input is valid
    - Verify usernames are unique
    - Verify the server checks new user role
    - Verify that only admins can create users
    '''
    user_count = _user_count(warehaus)
    for bad_request in (dict(),
                        dict(display_name='Another Admin', role='admin'),
                        dict(username=_random_username(), role='admin'),
                        dict(username=_random_username()),
                        dict(role='bot'),
                        dict(display_name='Failure'),
                        dict(username=_random_username(), display_name='Legit User', role='welkfwelk')):
        warehaus.api.post('/api/auth/users', bad_request, expected_status=httplib.BAD_REQUEST)
        assert _user_count(warehaus) == user_count
    warehaus.api.post('/api/auth/users', dict(username='admin', display_name='Another Admin', role='admin', email='admin@example.com'),
                      expected_status=httplib.CONFLICT)
    assert _user_count(warehaus) == user_count
    new_username = _random_username()
    new_user = warehaus.api.post('/api/auth/users',
                                 dict(username=new_username, display_name='Dave', role='user', email='dave@example.com'))
    assert _user_count(warehaus) == user_count + 1
    warehaus.api.post('/api/auth/users',
                      dict(username=new_username, display_name='Some Other Dave', role='user', email='dave@example.net'),
                      expected_status=httplib.CONFLICT)
    assert _user_count(warehaus) == user_count + 1
    warehaus.api.put('/api/auth/users/{}'.format(new_user['id']), dict(password=dict(new_password='passwd123')))
    with warehaus.api.current_user('login', dict(username=new_username, password='passwd123')):
        warehaus.api.post('/api/auth/users',
                          dict(username=new_username, display_name='Some Other Dave', role='user', email='dave@example.org'),
                          expected_status=httplib.FORBIDDEN)

def test_delete_user(warehaus):
    # XXX deletion not fully implemented yet
    pass

def _user_uri(user_id):
    return '/api/auth/users/{}'.format(user_id)

def test_update_admin_password(warehaus):
    admin_user = warehaus.api.get('/api/auth/self')
    warehaus.api.put(_user_uri(admin_user['id']), dict(password=dict(new_password='qwerty')))
    with warehaus.api.current_user('login', dict(username=admin_user['username'], password='qwerty')):
        assert warehaus.api.get('/api/auth/self')['id'] == admin_user['id']
    warehaus.api.put(_user_uri(admin_user['id']), dict(password=dict(new_password=warehaus.ADMIN['password'])))

def test_update_user_password(warehaus):
    # Update a regular user's password
    with warehaus.api.current_user('login', warehaus.USER):
        regular_user = warehaus.api.get('/api/auth/self')
        warehaus.api.put(_user_uri(regular_user['id']), dict(password=dict(new_password='blah')),
                         expected_status=httplib.BAD_REQUEST)
        warehaus.api.put(_user_uri(regular_user['id']), dict(password=dict(current='wrongpassword', new_password='blah')),
                         expected_status=httplib.FORBIDDEN)
        warehaus.api.put(_user_uri(regular_user['id']), dict(password=dict(current='user', new_password='blah')))
    # Restore the password to the original one
    with warehaus.api.current_user('login', dict(username=warehaus.USER['username'], password='blah')):
        warehaus.api.put(_user_uri(regular_user['id']), dict(password=dict(current='blah', new_password='user')))
    # Admin updates a user's password
    warehaus.api.put(_user_uri(regular_user['id']), dict(password=dict(new_password='bleh')))
    with warehaus.api.current_user('login', dict(username=warehaus.USER['username'], password='bleh')):
        warehaus.api.put(_user_uri(regular_user['id']), dict(password=dict(current='bleh', new_password='user')))
    # Regular user can't update an admin's password
    admin_user = warehaus.api.get('/api/auth/self')
    with warehaus.api.current_user('login', warehaus.USER):
        warehaus.api.put(_user_uri(admin_user['id']), dict(password=dict(new_password='jjjj')),
                         expected_status=httplib.FORBIDDEN)

def test_update_display_name_and_email(warehaus):
    # Update own display_name
    admin_user = warehaus.api.get('/api/auth/self')
    warehaus.api.put(_user_uri(admin_user['id']), dict(display_name='Allyson', email='ally@example.org'))
    assert warehaus.api.get('/api/auth/self')['display_name'] == 'Allyson'
    assert warehaus.api.get('/api/auth/self')['email'] == 'ally@example.org'
    # User updates display_name for itself
    with warehaus.api.current_user('login', warehaus.USER):
        regular_user = warehaus.api.get('/api/auth/self')
        warehaus.api.put(_user_uri(regular_user['id']), dict(display_name='Paulina', email='paully@example.net'))
        assert warehaus.api.get('/api/auth/self')['display_name'] == 'Paulina'
        assert warehaus.api.get('/api/auth/self')['email'] == 'paully@example.net'
        # User can't update admin's display_name
        warehaus.api.put(_user_uri(admin_user['id']), dict(display_name='Paulina', email='nottheadmin@example.com'), expected_status=httplib.FORBIDDEN)
    assert warehaus.api.get('/api/auth/self')['display_name'] == 'Allyson'
    assert warehaus.api.get('/api/auth/self')['email'] == 'ally@example.org'
    # Admin updates display_name for a user
    warehaus.api.put(_user_uri(regular_user['id']), dict(display_name='Wilson', email='willy@example.co'))
    assert warehaus.api.get(_user_uri(regular_user['id']))['display_name'] == 'Wilson'
    assert warehaus.api.get(_user_uri(regular_user['id']))['email'] == 'willy@example.co'

def test_update_username(warehaus):
    # Admin updates its own username
    admin_user = warehaus.api.get('/api/auth/self')
    warehaus.api.put(_user_uri(admin_user['id']), dict(username='admin'), expected_status=httplib.CONFLICT)
    warehaus.api.put(_user_uri(admin_user['id']), dict(username='user'), expected_status=httplib.CONFLICT)
    warehaus.api.put(_user_uri(admin_user['id']), dict(username='jeff'))
    warehaus.api.put(_user_uri(admin_user['id']), dict(username=warehaus.ADMIN['username']))
    # Admin changes a regular user's username
    with warehaus.api.current_user('login', warehaus.USER):
        regular_user = warehaus.api.get('/api/auth/self')
    warehaus.api.put(_user_uri(regular_user['id']), dict(username='peter'))
    # Then the user changes it back
    with warehaus.api.current_user('login', dict(username='peter', password=warehaus.USER['password'])):
        warehaus.api.put(_user_uri(regular_user['id']), dict(username=warehaus.USER['username']))
        warehaus.api.put(_user_uri(regular_user['id']), dict(username=warehaus.ADMIN['username']), expected_status=httplib.CONFLICT)
        # But don't allow user to change admin's username
        warehaus.api.put(_user_uri(admin_user['id']), dict(username='jeff'), expected_status=httplib.FORBIDDEN)

def test_update_role(warehaus):
    # Try to set to an invalid role
    admin_user = warehaus.api.get('/api/auth/self')
    warehaus.api.put(_user_uri(admin_user['id']), dict(role='blah'), expected_status=httplib.BAD_REQUEST)
    # Make the regular user an admin
    with warehaus.api.current_user('login', warehaus.USER):
        regular_user = warehaus.api.get('/api/auth/self')
    warehaus.api.put(_user_uri(regular_user['id']), dict(role='admin'))
    # The regular user now demotes the admin to be a regular user
    with warehaus.api.current_user('login', warehaus.USER):
        warehaus.api.put(_user_uri(admin_user['id']), dict(role='user'))
    # The admin can't update roles now
    warehaus.api.put(_user_uri(regular_user['id']), dict(role='user'), expected_status=httplib.FORBIDDEN)
    # The regular user now gives admin his role back
    with warehaus.api.current_user('login', warehaus.USER):
        warehaus.api.put(_user_uri(admin_user['id']), dict(role='admin'))
    # And admin makes the regular user a regular user again
    warehaus.api.put(_user_uri(regular_user['id']), dict(role='user'))

def test_api_tokens(warehaus):
    # Try to get labs with a garbage token
    with warehaus.api.current_user('token', 'lkaslkasd'):
        warehaus.api.get('/api/v1/labs', expected_status=httplib.UNAUTHORIZED)
    # Create a token for the admin and try again
    admin_user = warehaus.api.get('/api/auth/self')
    orig_admin_token_count = len(warehaus.api.get(_user_uri(admin_user['id']) + '/api-tokens')['api_tokens'])
    admin_token = warehaus.api.post(_user_uri(admin_user['id']) + '/api-tokens', None)['api_token']
    assert len(warehaus.api.get(_user_uri(admin_user['id']) + '/api-tokens')['api_tokens']) == orig_admin_token_count + 1
    with warehaus.api.current_user('token', admin_token):
        warehaus.api.get('/api/v1/labs')
    # User creates a token for itself
    with warehaus.api.current_user('login', warehaus.USER):
        regular_user = warehaus.api.get('/api/auth/self')
    orig_user_token_count = len(warehaus.api.get(_user_uri(regular_user['id']) + '/api-tokens')['api_tokens'])
    with warehaus.api.current_user('login', warehaus.USER):
        user_token = warehaus.api.post(_user_uri(regular_user['id']) + '/api-tokens', None)['api_token']
    assert len(warehaus.api.get(_user_uri(regular_user['id']) + '/api-tokens')['api_tokens']) == orig_user_token_count + 1
    # Use the user token, verify that it's really not an admin
    with warehaus.api.current_user('token', user_token):
        warehaus.api.get('/api/v1/labs')
        warehaus.api.post('/api/v1/labs', dict(slug=str(uuid4()), display_name=str(uuid4())), expected_status=httplib.FORBIDDEN)
    # Admin creates a token for a user
    user_token2 = warehaus.api.post(_user_uri(regular_user['id']) + '/api-tokens', None)['api_token']
    with warehaus.api.current_user('token', user_token2):
        warehaus.api.get('/api/v1/labs')
        warehaus.api.post('/api/v1/labs', dict(slug=str(uuid4()), display_name=str(uuid4())), expected_status=httplib.FORBIDDEN)
    assert len(warehaus.api.get(_user_uri(regular_user['id']) + '/api-tokens')['api_tokens']) == orig_user_token_count + 2
    # Make sure admin can read users' tokens but not the other way around
    warehaus.api.get(_user_uri(admin_user['id']) + '/api-tokens')
    warehaus.api.get(_user_uri(regular_user['id']) + '/api-tokens')
    with warehaus.api.current_user('login', warehaus.USER):
        warehaus.api.get(_user_uri(admin_user['id']) + '/api-tokens', expected_status=httplib.FORBIDDEN)
        warehaus.api.get(_user_uri(regular_user['id']) + '/api-tokens')
    # Delete the tokens
    warehaus.api.delete(_user_uri(admin_user['id']) + '/api-tokens', dict(api_token=admin_token))
    assert len(warehaus.api.get(_user_uri(admin_user['id']) + '/api-tokens')['api_tokens']) == orig_admin_token_count
    with warehaus.api.current_user('token', admin_token):
        warehaus.api.get('/api/v1/labs', expected_status=httplib.UNAUTHORIZED)
    with warehaus.api.current_user('login', warehaus.USER):
        warehaus.api.delete(_user_uri(regular_user['id']) + '/api-tokens', dict(api_token=user_token))
    assert len(warehaus.api.get(_user_uri(regular_user['id']) + '/api-tokens')['api_tokens']) == orig_user_token_count + 1
    with warehaus.api.current_user('token', user_token):
        warehaus.api.get('/api/v1/labs', expected_status=httplib.UNAUTHORIZED)
    # Admin deletes the token for the user
    warehaus.api.delete(_user_uri(regular_user['id']) + '/api-tokens', dict(api_token=user_token2))
    assert len(warehaus.api.get(_user_uri(regular_user['id']) + '/api-tokens')['api_tokens']) == orig_user_token_count
    with warehaus.api.current_user('token', user_token2):
        warehaus.api.get('/api/v1/labs', expected_status=httplib.UNAUTHORIZED)
    # Some bad deletes
    warehaus.api.delete(_user_uri(admin_user['id']) + '/api-tokens', dict(), expected_status=httplib.BAD_REQUEST)
    warehaus.api.delete(_user_uri(admin_user['id']) + '/api-tokens', dict(api_token='dsklmn3f'), expected_status=httplib.NOT_FOUND)

def test_user_ssh_keys(warehaus):
    # Tests for users managing their own keys
    for user in (warehaus.ADMIN, warehaus.USER):
        with warehaus.api.current_user('login', user):
            user_data = warehaus.api.get('/api/auth/self')
            user_uri = _user_uri(user_data['id'])
            user_key = str(uuid4())
            orig_key_count = len(warehaus.api.get(user_uri)['ssh_keys'])
            warehaus.api.post(user_uri + '/ssh-keys', dict(), expected_status=httplib.BAD_REQUEST)
            warehaus.api.post(user_uri + '/ssh-keys', dict(ssh_key=dict()), expected_status=httplib.BAD_REQUEST)
            warehaus.api.post(user_uri + '/ssh-keys', dict(ssh_key=dict(contents=user_key)))
            assert len(warehaus.api.get(user_uri)['ssh_keys']) == orig_key_count + 1
            warehaus.api.post(user_uri + '/ssh-keys', dict(ssh_key=dict(contents=user_key)), expected_status=httplib.CONFLICT)
            assert len(warehaus.api.get(user_uri)['ssh_keys']) == orig_key_count + 1
            warehaus.api.delete(user_uri + '/ssh-keys', dict(ssh_key=dict(contents=str(uuid4()))), expected_status=httplib.NOT_FOUND)
            warehaus.api.delete(user_uri + '/ssh-keys', dict(), expected_status=httplib.BAD_REQUEST)
            warehaus.api.delete(user_uri + '/ssh-keys', dict(ssh_key=dict()), expected_status=httplib.BAD_REQUEST)
            warehaus.api.delete(user_uri + '/ssh-keys', dict(ssh_key=dict(contents=user_key)))
            assert len(warehaus.api.get(user_uri)['ssh_keys']) == orig_key_count
            warehaus.api.delete(user_uri + '/ssh-keys', dict(ssh_key=dict(contents=user_key)), expected_status=httplib.NOT_FOUND)

def test_admin_modifies_user_ssh_keys(warehaus):
    with warehaus.api.current_user('login', warehaus.USER):
        user_data = warehaus.api.get('/api/auth/self')
    user_uri = _user_uri(user_data['id'])
    key = str(uuid4())
    orig_key_count = len(warehaus.api.get(user_uri)['ssh_keys'])
    warehaus.api.post(user_uri + '/ssh-keys', dict(ssh_key=dict(contents=key)))
    assert len(warehaus.api.get(user_uri)['ssh_keys']) == orig_key_count + 1
    warehaus.api.delete(user_uri + '/ssh-keys', dict(ssh_key=dict(contents=key)))
    assert len(warehaus.api.get(user_uri)['ssh_keys']) == orig_key_count
