from .logs import log_to_console
from .base_app import create_base_app

def main():
    log_to_console()
    create_base_app()
