from webmonitor import FlaskWithJobResolvers
from webmonitor import FlaskWithAuth


def create_app():
    # Define the app and load its configuration from config.py
    app = FlaskWithAuth.FlaskWithAuth(__name__)
    app.config.from_object('webmonitor.config')
    app.secret_key = 'cH\xc5\xd9\xd2\xc4,^\x8c\x9f3S\x94Y\xe5\xc7!\x06>A'


    # Add jobs API and generic views
    from .catchall import catchall
    from .jobs import jobs
    from auth import mod_auth
    app.register_blueprint(catchall)
    app.register_blueprint(jobs)
    app.register_blueprint(mod_auth)



    return app


def wsgi(*args, **kwargs):
    return create_app()(*args, **kwargs)


