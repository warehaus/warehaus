from .. import db

class Event(db.Model):
    timestamp = db.Field()
    obj_id    = db.Field() # The object for which this event was created about
    user_id   = db.Field() # The user who performed the action

    # A list of IDs which are interested in this event. For example, when creating
    # a server we obviously want this event to be shows in the server page, but we
    # also want it to be shown in the lab page. So we put two IDs in the list: the
    # server ID and the lab ID.
    # Another example is when we delete the server. Then we would be able to show
    # that event in the lab page although the server is already deleted.
    interested_ids = db.Field()

    title   = db.Field() # Event title
    content = db.Field() # Event content

def create_event(obj_id, user_id, interested_ids, title, content=''):
    event = Event(
        timestamp      = db.times.now(),
        obj_id         = obj_id,
        interested_ids = interested_ids,
        title          = title,
        content        = content,
    )
    event.save()
