import sys
import logging

def log_to_console():
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.DEBUG)
    formatter = logging.Formatter('[%(asctime)s] %(levelname)5s: %(message)s')
    ch.setFormatter(formatter)
    root.addHandler(ch)
