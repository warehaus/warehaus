from datetime import datetime
from pytz import timezone

UTC = timezone('UTC')

def now():
    return datetime.now(UTC)
