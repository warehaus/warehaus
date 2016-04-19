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
