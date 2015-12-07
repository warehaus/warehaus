FROM labsome/base-image:v6

RUN mkdir -p /opt/labsome
RUN mkdir -p /var/log/labsome

COPY . /opt/labsome

RUN cd /opt/labsome/src/labsome/frontend && bower install --allow-root
RUN cd /opt/labsome/src/labsome/frontend && gulp build
RUN cd /opt/labsome/src && python setup.py develop

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/opt/labsome/etc/supervisor-labsome.conf"]
