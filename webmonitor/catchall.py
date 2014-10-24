# Flask API: http://flask.pocoo.org/docs/api/
from flask import (
    # Create Blueprints
    Blueprint,
    # Rendering Jinja2 templates
    render_template,
    # Access the current app instance inside requests
    current_app,
    # Set and access variables global to the app instance and views
    g,
    # Raise HTTP error code exceptions
    abort
)
# So we can catch Jinja2 exception
from jinja2.exceptions import TemplateNotFound

catchall = Blueprint('catchall', __name__,
                     template_folder='templates', static_folder='static')


def default_child_path(path):
    """Return the default child of the parent path ,if it exists, else path.

    As an example, if the path `parent` show show the page `parent/child` by
    default, this method will return `parent/child` given `parent`.
    If `parent/child` should show `parent/child/grandchild` by default,
    this method will return `parent/child/grandchild` given `parent`.
    If no default child path exists, then `path` is returned.
    Keyword arguments:
    path -- The parent path to resolve in to its deepest default child path.
    """
    try:
        # Recurse until we find a path with no default child
        child_path = default_child_path(
            current_app.config['DEFAULT_CHILDREN'][path]
        )
    except KeyError:
        child_path = path
    return child_path


@catchall.route('/', defaults={'path': ''})
@catchall.route('/<path:path>')
def serve_page(path):
    # Find the default child page
    child_path = default_child_path(path)
    # Expose the child path value
    g.active_page = child_path
    # Try find a template called path.html, else 404
    try:
        return render_template('{0}.html'.format(child_path))
    except TemplateNotFound:
        abort(404)


# TODO should we respond with JSON when 404'ing from the jobs API?
@catchall.errorhandler(404)
def page_not_found(e):
    g.active_page = '404'
    return render_template('errors/404.html'), 404
