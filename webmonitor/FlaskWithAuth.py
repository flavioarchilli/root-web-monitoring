from FlaskWithJobResolvers import FlaskWithJobResolvers


class WrongAuthInfo(Exception):
    pass

class FlaskWithAuth(FlaskWithJobResolvers):
   """The class inherites from FlaskWithJobResolvers with a purporse of creating the correct authentification flow. 
   It can be safely turned of, if you do not need the auth for your project.

   """
   def __init__(self, *args, **kwargs):
        super(FlaskWithAuth, self).__init__(*args, **kwargs)
        self.auth=False
        self.username = ""
        self.uid = ""
        self.redirectroute = "/"

   def setauth(self, userisok):
         if isinstance(userisok, bool):
             self.auth = userisok
             if userisok == False:
                 self.username = ""
                 self.uid = ""
         else :
              raise WrongAuthInfo

   def setUserName(self, uname):
         self.username = uname

   def setUID(self, uid):
         self.uid = uid 


