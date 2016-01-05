FROM labsome/base-image:v7

RUN mkdir -p /var/log/labsome

COPY dist /opt/labsome

RUN cd /opt/labsome && easy_install *.egg

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/opt/labsome/etc/supervisor-labsome.conf"]
