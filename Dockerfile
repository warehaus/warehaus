FROM labsome/base-image:v3

RUN mkdir -p /opt/labsome
RUN mkdir -p /var/log/labsome

COPY . /opt/labsome

RUN cd /opt/labsome/src/labsome/frontend && /opt/node/node_modules/.bin/bower install --allow-root
RUN cd /opt/labsome/src/labsome/frontend && NODE_PATH=/opt/node/node_modules /opt/node/node_modules/.bin/gulp build

RUN cd /opt/labsome/src && python setup.py develop

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/opt/labsome/etc/supervisor-labsome.conf"]
