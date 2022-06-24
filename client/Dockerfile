FROM node:10
RUN npm install -g create-react-app && npm install react-router-dom
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
#CMD ["npm", "start"]
