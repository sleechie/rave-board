FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node site ./site
ENV NODE_ENV=production
ENV PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
