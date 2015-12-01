from datetime import datetime
from pytz import timezone
from flask.json import JSONEncoder

UTC = timezone('UTC')

def now():
    return datetime.now(UTC)

class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return str(obj)
        return super(CustomJSONEncoder, self).default(obj)
