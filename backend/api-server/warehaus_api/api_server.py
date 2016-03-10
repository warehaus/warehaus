from argparse import ArgumentParser
from .app import create_app_with_console_logging

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
    parser.add_argument('-t', '--test-server', default=False, action='store_true',
                        help='Start a test server instead of a production one.')
    args = parser.parse_args()
    extra_config = {}
    if args.test_server:
        extra_config['TESTING'] = True
    app = create_app_with_console_logging(**extra_config)
    if args.print_config:
        print_config(app)
    app.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()
