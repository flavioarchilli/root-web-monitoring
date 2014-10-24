import unittest2
import webmonitor

def module_resolver(jname):
    """Job resolver which adds a module name (called foo)."""
    return "foo.{0}".format(jname)

def conditional_resolver(jname):
    """Passes jname to module_resolver if jname starts with a vowel."""
    return module_resolver(jname) if jname.startswith('a') else None

class TestWebMonitor(unittest2.TestCase):
    def setUp(self):
        self.app = webmonitor.create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        """Clear the list of job resolvers."""
        for r in self.app.job_resolvers():
            self.app.remove_job_resolver(r)

    def test_should_be_of_class_flaskwithjobresolvers(self):
        """App should derive from the correct class."""
        assert isinstance(
            self.app,
            webmonitor.FlaskWithJobResolvers.FlaskWithJobResolvers
        )

    def test_no_job_resolvers_on_instantiation(self):
        """App should instatantiate with an empty list of resolvers."""
        assert len(self.app.job_resolvers()) == 0

    def test_addition_of_job_resolvers(self):
        """App should allow more job resolves to be added to it."""
        nresolvers = len(self.app.job_resolvers())
        self.app.add_job_resolver(module_resolver)
        assert len(self.app.job_resolvers()) == nresolvers + 1

    def test_addition_of_duplicate_job_resolvers(self):
        self.app.add_job_resolver(module_resolver)
        nresolvers = len(self.app.job_resolvers())
        with self.assertRaises(webmonitor.FlaskWithJobResolvers.ExistingJobResolverError):
            self.app.add_job_resolver(module_resolver)
        # Ensure the job resolver count has remained constant
        assert len(self.app.job_resolvers()) == nresolvers

    def test_removal_of_job_resolvers(self):
        """App should allow removal of job resolves by function reference."""
        # First add a resolver
        self.app.add_job_resolver(module_resolver)
        nresolvers = len(self.app.job_resolvers())
        self.app.remove_job_resolver(module_resolver)
        assert len(self.app.job_resolvers()) == nresolvers - 1

    def test_retrieval_of_jobs_resolvers(self):
        """App should return a list of all job resolvers."""
        # First add some job resolvers
        resolvers = [module_resolver, conditional_resolver]
        for r in resolvers:
            self.app.add_job_resolver(r)
        assert len(self.app.job_resolvers()) == len(resolvers)
        for i, r in enumerate(self.app.job_resolvers()):
            assert r == resolvers[i]

    def test_job_resolution(self):
        """App should return a string if the job is resolved, else None."""
        # We use the known behaviour of conditional_resolver
        self.app.add_job_resolver(conditional_resolver)
        assert self.app.resolve_job('bcd') == None
        assert self.app.resolve_job('abc') == 'foo.abc'


if __name__ == '__main__':
    unittest2.main()
