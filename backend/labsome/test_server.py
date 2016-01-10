from argparse import ArgumentParser
from .app import create_app
from .sio import socketio

def print_config(app):
    print 'Configuration:'
    for key, value in sorted(app.config.iteritems()):
        print '  ', key, '=', repr(app.config[key])

def main():
    parser = ArgumentParser()
    parser.add_argument('-d', '--debug', default=False, action='store_true',
                        help='Run the server in debug mode')
    parser.add_argument('-H', '--host', default='0.0.0.0',
                        help='Hostname to listen on')
    parser.add_argument('-p', '--port', default=5000, type=int,
                        help='Port to listen on')
    parser.add_argument('-c', '--print-config', default=False, action='store_true',
                        help=('Print full server configuration before starting to serve ' +
                              'requests. CAREFUL: This prints sensitive information, do ' +
                              'not share or post your configuration anywhere.'))
    args = parser.parse_args()
    app = create_app()
    if args.print_config:
        print_config(app)
    socketio.run(app, host=args.host, port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()
