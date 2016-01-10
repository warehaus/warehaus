FROM labsome/base-image:v7

RUN mkdir -p /var/log/labsome

COPY dist /opt/labsome

RUN cd /opt/labsome && easy_install *.egg
RUN ln -s /opt/labsome/bin/labsome /usr/local/bin/labsome

EXPOSE 80

CMD ["labsome"]
