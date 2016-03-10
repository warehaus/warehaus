FROM warehaus/base-image:v9

RUN mkdir -p /var/log/warehaus
VOLUME /var/log/warehaus

COPY dist /opt/warehaus/dist

RUN cd /opt/warehaus/dist/pkg && easy_install *.egg
RUN cd /opt/warehaus/dist/pkg && npm install --global warehaus-*.tgz
RUN ln -s /opt/warehaus/dist/bin/warehaus /usr/local/bin/warehaus

EXPOSE 80

CMD ["warehaus"]
