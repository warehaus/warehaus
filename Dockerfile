FROM labsome/base-image:v6

RUN mkdir -p /opt/labsome
RUN mkdir -p /var/log/labsome

COPY . /opt/labsome

RUN cd /opt/labsome/src/labsome/frontend && \
    npm install && \
    ./node_modules/.bin/bower install --allow-root && \
    ./node_modules/.bin/gulp build && \
    rm -rf node_modules && \
    cd /opt/labsome/src && \
    python setup.py install && \
    rm -rf build/* dist/* *.egg-info labsome/static/*

EXPOSE 5000

CMD ["/usr/bin/supervisord", "-c", "/opt/labsome/etc/supervisor-labsome.conf"]
