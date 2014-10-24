import unittest2
import mock
import json
import flask
import rq
import fakeredis
import webmonitor
from webmonitor import start_worker

# The resolve_connection method in rq.connections calls patch_connection(conn)
# in rq.compat.connections. This method checks if conn is an instance of
# Redis or StrictRedis.
# As the mocked (Strict)Redis connection in fakeredis is not such an instance,
# the check fails, and so we patch resolve_connection to not make the call.
# The addition of the underscore-prefixed properties are taken directly from
# the rq.compat.connections.resolve_connection source
def mocked_resolve_connection(connection):
    connection._setex = connection.setex
    connection._lrem = connection.lrem
    connection._zadd = connection.zadd
    connection._pipeline = connection.pipeline
    connection._ttl = connection.ttl
    if hasattr(connection, 'pttl'):
        connection._pttl = connection.pttl
    return connection

def str_resolver(jname):
    """Job resolver that always returns the str builtin name."""
    return 'str'

def conditional_resolver(jname):
    """Job resolver that resolves to str_resolver if jnames start with 'a'."""
    return str_resolver(jname) if jname.startswith('a') else None

# The decorators on the TestCase class apply the patch to all test_* methods
@mock.patch('redis.StrictRedis', fakeredis.FakeStrictRedis)
@mock.patch('rq.queue.resolve_connection', mocked_resolve_connection)
@mock.patch('rq.job.resolve_connection', mocked_resolve_connection)
class TestJobs(unittest2.TestCase):
    # The setUp method is not patched by the class decorators, and so we must
    # repeat ourselves
    @mock.patch('redis.StrictRedis', fakeredis.FakeStrictRedis)
    @mock.patch('rq.queue.resolve_connection', mocked_resolve_connection)
    @mock.patch('rq.job.resolve_connection', mocked_resolve_connection)
    def setUp(self):
        self.app = webmonitor.create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.queue = rq.Queue(connection=start_worker.create_connection())
        # Make sure there are some of jobs on the queue, so we can validate
        # job retrieval and `GET /jobs`
        for i in range(2):
            self.queue.enqueue('str', args=('foo',))
        # Dummy request data
        self.request_data = json.dumps(dict(task_name='task_name'))

    def get_json_response(self, url):
        """Return the rv for the URL and the decoded JSON data."""
        rv = self.client.get(url)
        data = json.loads(rv.data)
        return rv, data

    def validate_job(self, job):
        """Assert that a job dictionary, from JSON, is valid.

        As this method checks the job URI with flask.url_for, it must be called
        in an app.test_request_context.
        """
        assert 'id' in job
        job_id = job['id']
        assert 'uri' in job
        assert job['uri'] == flask.url_for('jobs.get_job',
            job_id=job_id, _external=True)
        assert 'status' in job
        # Status should be one of the values allowed by rq
        # https://github.com/nvie/rq/blob/0.4.6/rq/job.py#L30
        assert job['status'] in ('queued', 'finished', 'failed', 'started')
        assert 'result' in job

    def test_list_jobs(self):
        """The correct number of jobs should be returned."""
        rv, data = self.get_json_response('/jobs')
        assert len(data['jobs']) == self.queue.count

    def test_list_job_serialisation(self):
        """All jobs in a list should be serialise correctly."""
        with self.app.test_request_context():
            rv, data = self.get_json_response('/jobs')
            for job in data['jobs']: self.validate_job(job)

    def test_create_job(self):
        """Job response should be the new job and a success status code."""
        # Add a job resolver so the job actually submits
        self.app.add_job_resolver(str_resolver)
        # Get the number of jobs before the request, so we can compare after
        njobs = self.queue.count
        rv = self.client.post('/jobs', data=self.request_data,
            content_type='application/json')
        # Remove the job resolver now we're done with it
        self.app.remove_job_resolver(str_resolver)
        data = json.loads(rv.data)
        assert 'job' in data
        assert rv.status_code == 201
        assert self.queue.count == (njobs + 1)

    def test_invalid_job_creation_no_task_name(self):
        """Attempting to create a job without a task name should give 400."""
        rv = self.client.post('/jobs', data=json.dumps(dict()),
            content_type='application/json')
        data = json.loads(rv.data)
        assert rv.status_code == 400
        assert 'message' in data
        assert len('message') > 0

    def test_invalid_job_creation_job_name_unresolved_task_name(self):
        """Attempting to create a job with an unresolvable name should 400."""
        # Add the conditional resolver that we know we'll fail
        self.app.add_job_resolver(conditional_resolver)
        rv = self.client.post('/jobs', data=json.dumps(dict(task_name='bcd')),
            content_type='application/json')
        data = json.loads(rv.data)
        assert rv.status_code == 400
        assert 'message' in data
        assert len('message') > 0

    def test_invalid_job_creation_not_json(self):
        """Only JSON requests can create jobs, else 400."""
        rv = self.client.post('/jobs', data=self.request_data)
        data = json.loads(rv.data)
        assert 'message' in data
        assert len(data['message']) > 0
        assert rv.status_code == 400

    def test_get_job(self):
        """A job existing in the queue can be retrieved with its ID."""
        job_id = self.queue.job_ids[0]
        rv, data = self.get_json_response('/jobs/{0}'.format(job_id))
        job = data['job']
        assert 'id' in job

    def test_get_job_serialisation(self):
        """All necessary information should be present in the job response."""
        job_id = self.queue.job_ids[0]
        with self.app.test_request_context():
            rv, data = self.get_json_response('/jobs/{0}'.format(job_id))
            self.validate_job(data['job'])

    def test_bad_request(self):
        """`400 bad request` should be a JSON response with a message."""
        rv = self.client.post('/jobs', data=json.dumps(dict()),
            content_type='application/json')
        data = json.loads(rv.data)
        assert 'message' in data
        assert len(data['message']) > 0
        assert rv.status_code == 400

    def test_not_found(self):
        """`404 not found` should be a JSON response with a message."""
        rv, data = self.get_json_response('/jobs/fake_id')
        assert 'message' in data
        assert len(data['message']) > 0
        assert rv.status_code == 404


if __name__ == '__main__':
    unittest2.main()
