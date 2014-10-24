from flask import Flask


class ExistingJobResolverError(Exception):
    pass


class FlaskWithJobResolvers(Flask):
    """A Flask app that manages the resolution of task names in to job names.

    A task name is that received by the Jobs API from the client.
    The workers need to know where this job actually is though, i.e. what
    method it corresponds to and what module that method lives in.

    The task of a *job resolver* is to take a task name, as a string, and
    return a full, dotted import-like path to the method.
    For example, the job resolver below just adds a module name to the task:

        def module_resolver(task_name):
            return 'foo.{0}'.format(job_name)

    Given a task name of 'bar', this resolver returns 'foo.bar', and the worker
    process calls the method 'bar' inside the module 'foo'.
    If a job resolver can't resolve a task name to a method, it must return
    None.

    This application class manages job resolvers by holding references to them
    as a list of methods.
    For example, to add the above module_resolver, do

        app.add_job_resolver(module_resolver)

    You cannot add the same resolver twice.
    To remove it, do

        app.remove_job_resolver(module_resolver)

    The application resolves a task name in to a 'module.method'-type string
    by interrogating all job resolvers it has

        app.resolve_job_name('bar')

    This would return 'foo.bar', if the module_resolver was added to the app.
    Resolvers are interrogated in the order they were added, i.e. the most
    recently added resolver will be called last, the least recent first.
    """
    def __init__(self, *args, **kwargs):
        super(FlaskWithJobResolvers, self).__init__(*args, **kwargs)
        self._job_resolvers = []

    def job_resolvers(self):
        return self._job_resolvers

    def add_job_resolver(self, job_resolver):
        for r in self.job_resolvers():
            if job_resolver == r:
                raise ExistingJobResolverError
        self._job_resolvers.append(job_resolver)

    def remove_job_resolver(self, job_resolver):
        """Remove job_resolver from the list of job resolvers.

        Keyword arguments:
        job_resolver -- Function reference of the job resolver to be removed.
        """
        for i, r in enumerate(self.job_resolvers()):
            if job_resolver == r:
                del self._job_resolvers[i]

    def resolve_job(self, name):
        """Attempt to resolve the task name in to a job name.

        If no job resolver can resolve the task, i.e. they all return None,
        return None.

        Keyword arguments:
        name -- Name of the task to be resolved.
        """
        for r in self.job_resolvers():
            resolved_name = r(name)
            if resolved_name is not None:
                return resolved_name
        return None
