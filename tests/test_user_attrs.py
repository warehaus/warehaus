import random
import httplib
from urlparse import urljoin

def _type_attributes_slugs(warehaus, type_path):
    return set(attr['slug'] for attr in warehaus.api.get(type_path)['attrs'])

def test_attr_definition(warehaus):
    '''Tests the definition of type attributes:
    - Delete a non-existent attribute
    - Define an attribute
    - Try to define the same attribute again
    - Define another attribute
    - Rename an attribute
    - Try to rename an attribute to a name that's already defined
    - Delete an attribute
    '''
    with warehaus.temp_lab() as lab:
        type_path = warehaus.create_type_object(lab, type_key='builtin-cluster', slug='cluster1',
                                                name_singular='Cluster', name_plural='Clusters')
        attrs_url = urljoin(type_path, 'attrs')
        assert 'attrs' not in warehaus.api.get(type_path)

        # Try to delete a non-existent attribute
        warehaus.api.delete(attrs_url, dict(slug='moo'), expected_status=httplib.NOT_FOUND)

        # Create an attribute
        warehaus.api.post(attrs_url, dict(), expected_status=httplib.BAD_REQUEST)
        warehaus.api.post(attrs_url, dict(attr=dict(slug='enabled', type='bool', display_name='Enabled')))
        assert _type_attributes_slugs(warehaus, type_path) == set(['enabled'])

        # Create another attribute
        warehaus.api.post(attrs_url, dict(attr=dict(slug='enabled', type='bool', display_name='Enabled')), expected_status=httplib.CONFLICT)
        warehaus.api.post(attrs_url, dict(attr=dict(slug='rating', type='number', display_name='Rating')))
        assert _type_attributes_slugs(warehaus, type_path) == set(['enabled', 'rating'])

        # Rename attempts
        warehaus.api.put(attrs_url, dict(slug='enabled', updated_attr=dict()), expected_status=httplib.BAD_REQUEST)
        warehaus.api.put(attrs_url, dict(slug='enabled', updated_attr=dict(slug='not_disabled')))
        warehaus.api.put(attrs_url, dict(slug='unknown', updated_attr=dict(slug='known')), expected_status=httplib.NOT_FOUND)
        warehaus.api.put(attrs_url, dict(slug='not_disabled', updated_attr=dict(slug='rating')), expected_status=httplib.CONFLICT)
        assert _type_attributes_slugs(warehaus, type_path) == set(['not_disabled', 'rating'])

        # Delete an attribute
        warehaus.api.delete(attrs_url, dict(slug='rating'))
        assert _type_attributes_slugs(warehaus, type_path) == set(['not_disabled'])

        # Rename an attribute to a name that was deleted
        warehaus.api.put(attrs_url, dict(slug='not_disabled', updated_attr=dict(slug='rating')))
        assert _type_attributes_slugs(warehaus, type_path) == set(['rating'])

        # Make sure we can create the deleted/renamed attribute again
        warehaus.api.post(attrs_url, dict(attr=dict(slug='not_disabled', type='text', display_name='Not Disabled')))
        assert _type_attributes_slugs(warehaus, type_path) == set(['rating', 'not_disabled'])

def _cluster_url(lab, cluster):
    return '/api/v1/labs/{}/{}/'.format(lab['slug'], cluster['slug'])

def _cluster_attrs_url(lab, cluster):
    return urljoin(_cluster_url(lab, cluster), 'attrs')

def test_user_attributes(warehaus):
    '''Tests the API for user attributes:
    - Create a type object and some objects
    - Define some attributes
    - Set the value of an attribute to one object
      - Verify that only that object was updated
    - Remove an attribute that was not defined on an object
    - Remove an attribute that was defined on an object
    - Try to set an attribute value for a non-existent attribute
    '''
    with warehaus.temp_lab() as lab:
        # Create some clusters
        type_path = warehaus.create_type_object(lab, type_key='builtin-cluster', slug='cluster1',
                                                name_singular='Cluster', name_plural='Clusters')
        clusters = tuple(warehaus.api.post(type_path, dict(display_name='Cluster {}'.format(i)))
                         for i in range(100))

        # Define attributes for the cluster type
        attrs = (
            'paulina',
            'scherrer',
            'allyson',
            'pinnix',
            'kassandra',
            'wilson',
        )
        for attr in attrs:
            warehaus.api.post(urljoin(type_path, 'attrs'), dict(attr=dict(slug=attr, type='text', display_name=attr.title())))
        assert _type_attributes_slugs(warehaus, type_path) == set(attrs)

        def _ensure_correct_attributes(*expected):
            current = set(
                (cluster['slug'], slug, value)
                for cluster in clusters
                for slug, value in warehaus.api.get(_cluster_url(lab, cluster)).get('attrs', {}).iteritems()
            )
            assert current == set(expected)

        # Set attribute value for one of the clusters
        c1, c2 = random.sample(clusters, 2)
        random_attr = random.choice(attrs)
        warehaus.api.put(_cluster_attrs_url(lab, c1), dict(), expected_status=httplib.BAD_REQUEST)
        warehaus.api.put(_cluster_attrs_url(lab, c1), dict(slug='nonexistent', value=True), expected_status=httplib.NOT_FOUND)
        warehaus.api.put(_cluster_attrs_url(lab, c1), dict(slug=random_attr, value='3'))
        _ensure_correct_attributes((c1['slug'], random_attr, '3'))
        warehaus.api.put(_cluster_attrs_url(lab, c1), dict(slug=random_attr, value='4'))
        _ensure_correct_attributes((c1['slug'], random_attr, '4'))

        # Remove attributes from objects
        warehaus.api.delete(_cluster_attrs_url(lab, c2), dict(), expected_status=httplib.BAD_REQUEST)
        warehaus.api.delete(_cluster_attrs_url(lab, c2), dict(slug='nonexistent'), expected_status=httplib.NOT_FOUND)
        warehaus.api.delete(_cluster_attrs_url(lab, c1), dict(slug=random_attr))
        warehaus.api.delete(_cluster_attrs_url(lab, c1), dict(slug=random_attr)) # deleting twice is ok
        warehaus.api.delete(_cluster_attrs_url(lab, c2), dict(slug=random_attr)) # also when attribute was never set
        _ensure_correct_attributes()

        # Set other attributes
        c3, c4 = random.sample(clusters, 2)
        random_attr3, random_attr4 = random.sample(attrs, 2)
        warehaus.api.put(_cluster_attrs_url(lab, c3), dict(slug=random_attr3, value='one'))
        warehaus.api.put(_cluster_attrs_url(lab, c4), dict(slug=random_attr4, value='two'))
        _ensure_correct_attributes((c3['slug'], random_attr3, 'one'),
                                   (c4['slug'], random_attr4, 'two'))
        warehaus.api.delete(_cluster_attrs_url(lab, c3), dict(slug=random_attr3))
        warehaus.api.delete(_cluster_attrs_url(lab, c4), dict(slug=random_attr4))

        # Delete one attribute out of three
        c5 = random.choice(clusters)
        random_attr1, random_attr2, random_attr3 = random.sample(attrs, 3)
        warehaus.api.put(_cluster_attrs_url(lab, c5), dict(slug=random_attr1, value='the'))
        warehaus.api.put(_cluster_attrs_url(lab, c5), dict(slug=random_attr2, value='mantises'))
        warehaus.api.put(_cluster_attrs_url(lab, c5), dict(slug=random_attr3, value='are'))
        warehaus.api.delete(_cluster_attrs_url(lab, c5), dict(slug=random_attr1))
        _ensure_correct_attributes((c5['slug'], random_attr2, 'mantises'),
                                   (c5['slug'], random_attr3, 'are'))
