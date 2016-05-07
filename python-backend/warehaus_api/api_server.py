from gevent import monkey
monkey.patch_all()

from .app import create_app_with_console_logging

app = create_app_with_console_logging()
