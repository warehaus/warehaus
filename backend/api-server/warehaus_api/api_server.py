from argparse import ArgumentParser
from .app import create_app_with_console_logging

def main():
    parser = ArgumentParser()
    parser.add_argument('-d', '--debug', default=False, action='store_true',
                        help='Run the server in debug mode')
    parser.add_argument('-H', '--host', default='0.0.0.0',
                        help='Hostname to listen on')
    parser.add_argument('-p', '--port', default=5000, type=int,
                        help='Port to listen on')
    args = parser.parse_args()
    app = create_app_with_console_logging()
    app.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()
