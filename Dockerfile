FROM labsome/base-image:v8

RUN mkdir -p /var/log/labsome
VOLUME /var/log/labsome

COPY dist /opt/labsome/dist

RUN cd /opt/labsome/dist/pkg && easy_install *.egg
RUN cd /opt/labsome/dist/pkg && npm install --global labsome-*.tgz
RUN ln -s /opt/labsome/dist/bin/labsome /usr/local/bin/labsome

EXPOSE 80

CMD ["labsome"]
