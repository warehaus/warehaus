from tempfile import TemporaryFile
from contextlib import contextmanager

@contextmanager
def terminated(popen):
    try:
        yield popen
    finally:
        popen.terminate()
        popen.wait()

@contextmanager
def deleted_tempfile(content):
    with TemporaryFile() as fo:
        fo.write(content)
        fo.seek(0)
        yield fo
