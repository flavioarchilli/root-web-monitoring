from webmonitor import FlaskWithJobResolvers


def create_app():
    # Define the app and load its configuration from config.py
    app = FlaskWithJobResolvers.FlaskWithJobResolvers(__name__)
    app.config.from_object('webmonitor.config')

    # Add jobs API and generic views
    from .catchall import catchall
    from .jobs import jobs
    app.register_blueprint(catchall)
    app.register_blueprint(jobs)

    return app


def wsgi(*args, **kwargs):
    return create_app()(*args, **kwargs)
