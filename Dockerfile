FROM node:6

ENV NODE_ENV production
ENV WAREHAUS_LOGS_DIR /logs
ENV WAREHAUS_INSTALL_DIR /opt/warehaus
ENV WAREHAUS_HTTP_PORT 80

RUN mkdir -p ${WAREHAUS_LOGS_DIR}
VOLUME ${WAREHAUS_LOGS_DIR}

WORKDIR ${WAREHAUS_INSTALL_DIR}

COPY . ${WAREHAUS_INSTALL_DIR}

RUN cd ${WAREHAUS_INSTALL_DIR} && npm link --production && rm -rf /root/.npm

EXPOSE ${WAREHAUS_HTTP_PORT}

CMD ["node", "dist/backend.js"]
