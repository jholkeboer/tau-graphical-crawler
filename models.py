from google.appengine.ext import ndb

class LogEntry(ndb.Model):
    crawlFinished = ndb.BooleanProperty()
    record = ndb.PickleProperty(default={})
    jobID = ndb.StringProperty()
