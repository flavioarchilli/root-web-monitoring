import unittest2
from mock import patch
import flask
import webmonitor

class TestCatchAll(unittest2.TestCase):
    def setUp(self):
        self.app = webmonitor.create_app()
        self.client = self.app.test_client()
        # Set known DEFAULT_CHILDREN dict
        self.app.config['DEFAULT_CHILDREN'] = {
            '': 'foo',
            'baz': 'baz/qux'
        }

    def test_nonexistent_template(self):
        """A route without a template should return a 404 status code."""
        rv = self.client.get('/fake_route')
        assert rv.status_code == 404
        assert '404' in rv.data

    # Mock out render_template else it will raise TemplateNotFound, calling
    # the 404 error handler and setting g.active_page to '404'
    @patch('webmonitor.catchall.render_template')
    def test_active_path(self, mocked):
        """Global active path var should be set to the resolved child."""
        # We need to wrap the GET in a request context, else g won't persist
        with self.app.test_request_context():
            self.client.get('/')
            # The call to render_template should have a first argument of
            # `{g.active_page}.html`
            assert mocked.call_args[0][0] == 'foo.html'
            assert flask.g.active_page == 'foo'
        with self.app.test_request_context():
            self.client.get('/foo')
            assert mocked.call_args[0][0] == 'foo.html'
            assert flask.g.active_page == 'foo'
        with self.app.test_request_context():
            self.client.get('/foo/bar')
            assert mocked.call_args[0][0] == 'foo/bar.html'
            assert flask.g.active_page == 'foo/bar'
        with self.app.test_request_context():
            self.client.get('/baz')
            assert mocked.call_args[0][0] == 'baz/qux.html'
            assert flask.g.active_page == 'baz/qux'


if __name__ == '__main__':
    unittest2.main()
