FROM node:18
COPY . /home/node/app
WORKDIR /home/node/app
RUN yarn install
CMD yarn start
EXPOSE 3000