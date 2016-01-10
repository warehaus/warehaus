FROM labsome/base-image:v7

RUN mkdir -p /var/log/labsome/dist

COPY dist /opt/labsome/dist

RUN cd /opt/labsome && easy_install *.egg
RUN ln -s /opt/labsome/dist/bin/labsome /usr/local/bin/labsome

EXPOSE 80

CMD ["labsome"]
