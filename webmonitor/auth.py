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
    flash
)

from flask_sso import SSO
from datetime import datetime, timedelta


mod_auth  = Blueprint('mod_auth', __name__,
                     template_folder='templates', static_folder='static')


def get_user_session_info(key):
    return session['user'].get(
        key,
        'Key `{0}` not found in user session info'.format(key)
    )
 
 
def get_user_details(fields):
    defs = [
        '<dt>{0}</dt><dd>{1}</dd>'.format(f, get_user_session_info(f))
        for f in fields
    ]
    return '<dl>{0}</dl>'.format(''.join(defs))

def get_info(info):
    if 'username' in session:
        our_var = session[info]
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

@mod_auth.route('/checklogger')
def auth_index():
    if 'username' in session:
        return 'Logged in as %s' % escape(session['username'])
    return 'You are not logged in'
 
@mod_auth.route('/logout')
def logout():
        if 'username' in session:
             User = session['username']
             session.pop('username', None)
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
           print (session, '-----------------------------------------------')
           print (session, '-----------------------------------------------')
           print (session, '-----------------------------------------------')
           print (session, '-----------------------------------------------')

           return redirect('/')
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
 
