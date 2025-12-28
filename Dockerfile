# Use official Node.js image as the base
FROM node:20-alpine as build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
