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
        self.listed_blueprints = []

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


   def create_bplist(self):
         cases = self.listed_blueprints
         string = ''
         for iSet in cases :
             string = string + '<li><a href=\"/'+iSet[0]+'\">'+iSet[1]+'</a></li>'
         return string

   def add_to_bplist(self, info):
         if info not in self.listed_blueprints:
              self.listed_blueprints.append(info)
 

   def make_project_buttons(self):
         cases = self.listed_blueprints
         string = ''
         for iSet in cases :
                 string = string + '<a href=\"/'+iSet[0]+'\" class=\"btn btn-default\" role=\"button\">'+iSet[1]+'</a><br>'

         return string

