from datetime import datetime
from flask.json import JSONEncoder

class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return str(obj)
        return super(CustomJSONEncoder, self).default(obj)
