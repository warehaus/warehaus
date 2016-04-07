import httplib
from .warehaus_test_base import WarehausApiTestBase

class TypeSystemTests(WarehausApiTestBase):
    def test_type_classes_api(self):
        '''Gets the supported type classes.'''
        self.api_server.get('/api/v1/hardware/types')

    def test_create_delete_lab(self):
        '''Create and delete some labs.'''
        with self.temp_lab() as lab:
            pass
        with self.temp_lab() as lab:
            pass
        with self.temp_lab() as lab:
            with self.temp_lab() as lab:
                pass

    def test_type_objects(self):
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
        with self.temp_lab() as lab:
            type_urls = tuple(
                self.create_type_object(lab,
                                        type_key      = 'builtin-cluster',
                                        slug          = type_name.lower(),
                                        name_singular = type_name,
                                        name_plural   = type_name + 's')
                for type_name in type_names)
            types = tuple(self.api_server.get(type_url) for type_url in type_urls)
            children = self.api_server.get('/api/v1/labs/{}/~/children'.format(lab['slug']))['children']
            self.assertEqual(set(typeobj['id'] for typeobj in types),
                             set(child['id'] for child in children))
            for type_name in type_names:
                self.api_server.delete('/api/v1/labs/{}/~/{}/'.format(lab['slug'], type_name.lower()))

    def test_type_objects_with_same_slug(self):
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
        with self.temp_lab() as lab1:
            self.create_type_object(lab1, **fixed_kwargs)
            self.create_type_object(lab1, expected_status=httplib.CONFLICT, **fixed_kwargs)
            with self.temp_lab() as lab2:
                self.create_type_object(lab2, **fixed_kwargs)
