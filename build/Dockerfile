FROM node:13-alpine
ARG VERSION
RUN npm install -g allrounder@${VERSION} --allow-root --unsafe-perm=true
USER nobody:nobody
ENTRYPOINT ["allrounder"]
