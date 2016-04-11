FROM warehaus/base-image:v12

RUN mkdir -p /var/log/warehaus
VOLUME /var/log/warehaus

COPY . /opt/warehaus

RUN cd /opt/warehaus/backend/api-server && python setup.py develop
RUN cd /opt/warehaus/backend/warehaus-backend && npm link
RUN ln -s /opt/warehaus/bin/warehaus /usr/local/bin/warehaus

EXPOSE 80

CMD ["warehaus"]
