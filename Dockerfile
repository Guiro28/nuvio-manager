FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
COPY --chown=node:node vendor/proxy/package.json ./vendor/proxy/package.json
COPY --chown=node:node vendor/proxy/src ./vendor/proxy/src
RUN mkdir /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3100 DATA_DIR=/app/data
EXPOSE 3100
CMD ["node", "server/index.js"]
