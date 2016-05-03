import httplib

def test_type_classes_api(warehaus):
    '''Gets the supported type classes.'''
    warehaus.api.get('/api/v1/hardware/types')

def test_create_delete_lab(warehaus):
    '''Create and delete some labs.'''
    with warehaus.temp_lab():
        pass
    with warehaus.temp_lab():
        pass
    with warehaus.temp_lab():
        with warehaus.temp_lab():
            pass

def test_type_objects(warehaus):
    '''Create and delete type objects, see that we can query
    them through the APIs.
    '''
    type_names = [
        'Hanh', 'Frederick',
        'Melody', 'Mignon',
        'Ora', 'Marguerite',
        'Horacio', 'Mendy',
        'Faith', 'Sharyn',
    ]
    with warehaus.temp_lab() as lab:
        type_urls = tuple(
            warehaus.create_type_object(
                lab,
                type_key      = 'builtin-cluster',
                slug          = type_name.lower(),
                name_singular = type_name,
                name_plural   = type_name + 's')
            for type_name in type_names)
        types = tuple(warehaus.api.get(type_url) for type_url in type_urls)
        children = warehaus.api.get('/api/v1/labs/{}/~/children'.format(lab['slug']))['children']
        assert set(typeobj['id'] for typeobj in types) == set(child['id'] for child in children)
        for type_name in type_names:
            warehaus.api.delete('/api/v1/labs/{}/~/{}/'.format(lab['slug'], type_name.lower()))

def test_type_objects_with_same_slug(warehaus):
    '''Try to create two type objects with the same slug:
    - In the same lab: should fail
    - In different labs: should succeed
    '''
    type_name = 'Horacio'
    fixed_kwargs = dict(
        type_key      = 'builtin-server',
        slug          = type_name.lower(),
        name_singular = type_name,
        name_plural   = type_name + 's',
    )
    with warehaus.temp_lab() as lab1:
        warehaus.create_type_object(lab1, **fixed_kwargs)
        warehaus.create_type_object(lab1, expected_status=httplib.CONFLICT, **fixed_kwargs)
        with warehaus.temp_lab() as lab2:
            warehaus.create_type_object(lab2, **fixed_kwargs)
