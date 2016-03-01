import httplib
import itertools
from contextlib import contextmanager
from labsome_api.app import create_app
from .restful_test_base import AuthorizedRestfulTestBase

lab_num = itertools.count()

class LabsomeApiTestBase(AuthorizedRestfulTestBase):
    def create_app(self):
        return create_app(TESTING=True)

    def get_labs(self):
        return self.get('/api/v1/labs')['labs']

    def create_lab(self, slug):
        return self.post('/api/v1/labs', dict(slug=slug, display_name=slug.title()))

    def delete_lab(self, lab_slug, expected_status=httplib.NO_CONTENT):
        return self.delete('/api/v1/labs/{}/'.format(lab_slug), expected_status=expected_status)

    def create_type_object(self, lab, type_key, slug, name_singular, name_plural, **kwargs):
        self.post('/api/v1/labs/{}/type-objects'.format(lab['slug']), dict(
            type_key = type_key,
            slug     = slug,
            display_name = dict(
                singular = name_singular,
                plural   = name_plural,
            ),
        ), **kwargs)
        return '/api/v1/labs/{}/~/{}/'.format(lab['slug'], slug)

    @contextmanager
    def temp_lab(self):
        lab_slug = 'asdf' + str(lab_num.next())
        if any(lab['slug'] == lab_slug for lab in self.get_labs()):
            self.delete_lab(lab_slug)
        self.delete_lab(lab_slug, expected_status=httplib.NOT_FOUND)
        before_lab_creation = self.get_labs()
        lab = self.create_lab(lab_slug)
        after_lab_creation = self.get_labs()
        self.assertEqual(len(before_lab_creation) + 1, len(after_lab_creation))
        assert any(lab['slug'] == lab_slug for lab in after_lab_creation), after_lab_creation
        yield lab
        self.delete_lab(lab_slug)
        after_lab_deletion = self.get_labs()
        self.assertEqual(len(before_lab_creation), len(after_lab_deletion))
        assert all(lab['slug'] != lab_slug for lab in after_lab_deletion), after_lab_deletion
