FROM adeo-docker.jfrog.io/dockerfiles-distroless-collection/distroless-adeo-node20:latest

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/web-app

COPY .next/. ./.next/
COPY node_modules/. ./node_modules/
COPY package.json/. ./package.json

CMD ["node_modules/next/dist/bin/next", "start"]
