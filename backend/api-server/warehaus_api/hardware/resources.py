import httplib
from logging import getLogger
from flask import request
from flask import abort as flask_abort
from flask_restful import Resource
from flask_restful.reqparse import RequestParser
from ..auth.roles import require_user
from ..auth.roles import require_admin
from .models import Object
from .type_class import get_object_action
from .type_class import get_type_action
from .all_type_classes import all_type_classes
from .labs import Lab

logger = getLogger(__name__)

#----------------------------------------------------------#
# Object lookup                                            #
#----------------------------------------------------------#

def get_object_by_id(obj_id):
    obj = Object.query.get(obj_id)
    if obj is None:
        flask_abort(httplib.NOT_FOUND, 'Could not find object with id={!r}'.format(obj_id))
    return obj

def _object_path_parts(obj_path):
    '''Splits the object path `obj_path` into path and action.

    >>> _object_path_parts('a/')
    (['a'], '')
    >>> _object_path_parts('a/b')
    (['a'], 'b')
    >>> _object_path_parts('a/b/')
    (['a', 'b'], '')
    >>> _object_path_parts('a/b/~/xxx')
    (['a', 'b', '~'], 'xxx')
    >>> _object_path_parts('')
    Traceback (most recent call last):
    ...
    werkzeug.exceptions.NotFound: 404: Not Found
    >>> _object_path_parts('a')
    Traceback (most recent call last):
    ...
    werkzeug.exceptions.NotFound: 404: Not Found
    '''
    path_parts = obj_path.split('/')
    if len(path_parts) <= 1:
        flask_abort(httplib.NOT_FOUND, 'Path {!r} is too short'.format(obj_path))
    return path_parts[:-1], path_parts[-1]

def _get_type_object(obj):
    '''Finds and returns the type object of `obj`. If `obj` doesn't
    have a type object or the type object is not found, `None` is returned.
    '''
    if obj is None:
        return None
    if obj.type_id is None:
        return None
    return Object.query.get(obj.type_id)

def _get_object_child(parent, child_slug):
    '''Finds the child of `parent` named `child_slug`. If no child is found
    `None` is returned. If more than one child is found this function fails
    the request with `INTERNAL_SERVER_ERROR`.
    '''
    parent_id = None if parent is None else parent.id
    possible_objs = tuple(Object.query.filter(dict(slug=child_slug, parent_id=parent_id)))
    if len(possible_objs) == 0:
        return None
    if len(possible_objs) == 1:
        return possible_objs[0]
    flask_abort(httplib.INTERNAL_SERVER_ERROR, 'Got multiple results for slug={!r} parent_id={!r}'.format(child_slug, parent_id))

def get_object_by_path(obj_path):
    '''Finds an object by walking the object hierarchy. For example,
    a valid path can be:

        A/B/C/~/D/E/

    The search would go as follows:
    - Search for an object with `slug='A'` where `parent_id=None`.
    - Search for an object with `slug='B'` where `parent_id=A.id`.
    - Same for `C`.
    - Search for the type object of `C`.
    - Search for an object with `slug='D'` where `parent_id=C.type_id`.
    - Search for an object with `slug='E'` where `parent_id=D.id`.

    An object path must end with a '/' to point to the object itself.
    When an object's type supports actions, the action name should
    come after the last '/'. For example, the path for the 'labels'
    action of the X/Y/Z object is:

        X/Y/Z/labels

    '''
    logger.debug('Looking for object+action with path={!r}'.format(obj_path))
    cur_obj = None
    path_parts, action = _object_path_parts(obj_path)
    for part in path_parts:
        if part == '~':
            cur_obj = _get_type_object(cur_obj)
        else:
            cur_obj = _get_object_child(cur_obj, part)
        if cur_obj is None:
            flask_abort(httplib.NOT_FOUND, 'Could not find an object for {!r}'.format(part))
    # cur_obj must not be None. We must enter the for loop at least once
    # so we should call flask_abort if something is wrong.
    assert cur_obj is not None
    return cur_obj, action

def serialize_object(obj):
    return obj.as_dict()

#----------------------------------------------------------#
# Resources                                                #
#----------------------------------------------------------#

class TypeClasses(Resource):
    def get(self):
        require_user()
        return dict(types=[dict(
            type_key     = type_class.type_key(),
            display_name = type_class.display_name(),
        ) for type_class in all_type_classes])

class RawObjects(Resource):
    '''The collection of all objects by their ID.'''
    def get(self):
        require_user()
        return dict(objects=tuple(serialize_object(obj) for obj in Object.query.all()))

class RawObject(Resource):
    '''Object resource by ID.'''
    def get(self, obj_id):
        require_user()
        return serialize_object(get_object_by_id(obj_id))

class ObjectTreeRoot(Resource):
    '''A resource for the root of the object hierarchy tree. Although
    all nodes in the object tree have the same behaviour, we give the
    root a special role as the place that stores all labs and where
    new labs can be created.
    '''
    def get(self):
        '''Returns all labs. In the object tree, the root is actually
        "null" so labs are the only objects with no parent.
        '''
        require_user()
        return dict(labs=list(serialize_object(lab) for lab in Object.query.filter(
            lambda row: (row['parent_id'] == None) & (row['type_id'] != None))))

    create_lab_parser = RequestParser()
    create_lab_parser.add_argument('slug', required=True)
    create_lab_parser.add_argument('display_name', required=True)

    def _create_lab_type_object(self):
        lab_type = Object(
            parent_id = None,
            type_id   = None,
            slug      = None,
            type_key  = Lab.type_key(),
        )
        lab_type.save()
        return lab_type['id']

    def _create_lab(self, slug, display_name):
        lab_type_id = self._create_lab_type_object()
        lab = Object(
            parent_id    = None,
            type_id      = lab_type_id,
            slug         = slug,
            display_name = display_name,
        )
        lab.save()
        return lab

    def post(self):
        require_admin()
        args = self.create_lab_parser.parse_args()
        if any(Object.query.filter(lambda row: ((row['slug'] == args['slug']) &
                                                (row['parent_id'] == None) &
                                                (row['type_id'] != None)))):
            flask_abort(httplib.CONFLICT, 'A lab with slug={!r} already exists'.format(args['slug']))
        lab = self._create_lab(args['slug'], args['display_name'])
        return serialize_object(lab), httplib.CREATED

class ObjectTreeNode(Resource):
    '''An object resource that allows for:
    - Accessing an object by its place in the object hierarchy
    - Invoking actions supported by the object type
    '''
    def _find_type_class(self, type_key):
        try:
            return all_type_classes[type_key]
        except LookupError, error:
            flask_abort(httplib.INTERNAL_SERVER_ERROR, error)

    def _find_and_invoke_from_type_class(self, type_class, get_action, obj, action_name):
        http_error = httplib.NOT_FOUND
        for attr in dir(type_class):
            action = getattr(type_class, attr)
            action_info = get_action(action)
            if action_info is None:
                continue
            if action_info['name'] == action_name:
                http_error = httplib.METHOD_NOT_ALLOWED
                if action_info['method'] == request.method:
                    return action(obj)
        flask_abort(http_error, 'Could not find handler for {!r}'.format(action_name))

    def invoke_type_action(self, type_obj, action_name):
        type_class = self._find_type_class(type_obj.type_key)
        return self._find_and_invoke_from_type_class(type_class, get_type_action, type_obj, action_name)

    def invoke_object_action(self, obj, action_name):
        type_obj = get_object_by_id(obj.type_id)
        type_class = self._find_type_class(type_obj.type_key)
        return self._find_and_invoke_from_type_class(type_class, get_object_action, obj, action_name)

    def invoke_action(self, path):
        obj, action_name = get_object_by_path(path)
        if obj['type_id'] is None:
            return self.invoke_type_action(obj, action_name)
        return self.invoke_object_action(obj, action_name)

    get    = invoke_action
    post   = invoke_action
    put    = invoke_action
    delete = invoke_action
