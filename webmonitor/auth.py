from flask import (
    Blueprint,
    render_template,
    current_app,
    g,
    abort,
    session, 
    redirect,
    request,
    escape,
    url_for,
    flash,
    request
)

from flask_sso import SSO
from datetime import datetime, timedelta
from functools import wraps


mod_auth  = Blueprint('mod_auth', __name__,
                     template_folder='templates', static_folder='static')


def get_info(info):
    if 'username' in session:
        our_var = session[info]
        return our_var
    return "0"


def get_uid():
    if 'username' in session:
        our_var = session['uid']
        return our_var
    return "0"

def check_user_account():
    if 'username' in session:
        User = session['username']
        print User, 'is logged in'
        if User != "": 
           return "true"
        else :
           return "false"
    return "false"

@mod_auth.route('/logout')
def logout():
        if 'username' in session:
             User = session['username']
             session.pop('username', None)
             current_app.setauth(False)
             return '''
              <html>
              <head>
              <meta http-equiv="refresh" content="3;url=/" />
               </head>
             <body>
             <form action="/" method="get">
               <H1> User logged out. Redirecting to home page.  </H1>
                <button type="submit">Continue</button><br>
             </form>
              </body>
              </html>
             '''
        else :
             return '''
              <html>
              <head>
              <meta http-equiv="refresh" content="3;url=/" />
               </head>
             <body>
             <form action="/" method="get">
               <H1> User was not logged in.  Redirecting to home page.  </H1>
                <button type="submit">Continue</button><br>
             </form>
              </body>
              </html>
             '''

@mod_auth.route('/login', methods=['GET', 'POST'])
def login():
        if request.method == 'POST':
           session['username'] = request.form['username']
           session['uid'] = request.form['uid']
           current_app.setUserName(session['username'])
           current_app.setUID(session['uid'])
           current_app.auth = True
           return redirect(current_app.redirectroute)
        return '''
        <form action="" method="post">
            <H1> Welcome to fake shibboleth</H1>
            your username:<br>
            <p><input type=text name=username>
            <br>
            your user id:<br>
            <p><input type=text name=uid>
            <p><input type=submit value=Login>
        </form>
    '''
 
def requires_auth():
    def wrapper(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if check_user_account() == "false":
                return error_response()
            return f(*args, **kwargs)
        return wrapped
    return wrapper

def error_response():
      rule = request.url_rule
      returnRoute = rule.rule
      current_app.redirectroute = returnRoute
      return redirect('/login')

