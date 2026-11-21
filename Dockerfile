FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY .sequelizerc ./
COPY src ./src

EXPOSE 9095

CMD ["node", "src/index.js"]
