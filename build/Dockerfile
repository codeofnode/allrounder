FROM node:18-alpine
ARG VERSION
RUN npm install -g allrounder@${VERSION} --allow-root --unsafe-perm=true
USER nobody:nobody
WORKDIR /app
ENTRYPOINT ["allrounder"]
