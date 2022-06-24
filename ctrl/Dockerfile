FROM node:18
WORKDIR /usr/src/ctrl
COPY package*.json ./
RUN npm install
# RUN npm ci --only=production
COPY . .
EXPOSE 3006 5000
# CMD ["npm", "start"]
