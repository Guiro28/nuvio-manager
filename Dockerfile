FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
COPY --chown=node:node vendor/proxy/package.json ./vendor/proxy/package.json
COPY --chown=node:node vendor/proxy/src ./vendor/proxy/src
RUN mkdir /app/data && chown node:node /app/data
# Build metadata injected by CI (shown in the sidebar). Empty for local builds.
ARG GIT_SHA=""
ARG BUILD_NUMBER=""
ARG BUILD_DATE=""
USER node
ENV HOST=0.0.0.0 PORT=3100 DATA_DIR=/app/data \
    GIT_SHA=$GIT_SHA BUILD_NUMBER=$BUILD_NUMBER BUILD_DATE=$BUILD_DATE
EXPOSE 3100
CMD ["node", "server/index.js"]
