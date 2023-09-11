FROM node:19.7.0 as base

# Create app directory
WORKDIR /usr/src/app
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

RUN npm run compile