import os
import pkg_resources
from flask import Flask
from flask import redirect

def main():
    static_folder = pkg_resources.resource_filename('labsome', 'static')
    print static_folder
    app = Flask(__name__, static_folder=static_folder)

    @app.route('/')
    def index():
        return redirect('/site/')

    @app.route('/site')
    def site_redirect():
        return redirect('/site/')

    @app.route('/site/')
    @app.route('/site/<path:path>')
    def site(path=None):
        return app.send_static_file('site/index.html')

    app.run(host='0.0.0.0')

if __name__ == '__main__':
    main()
