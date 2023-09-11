require('dotenv').config();
import {Request, Response, NextFunction} from 'express';
const express = require('express');
const app = express();
import fetch, {Response as FetchResponse} from 'node-fetch';

const imageGenRouter = require('./api/color');
const thumbnailGenRouter = require('./api/thumbnail');

const port = process.env.PORT || 3000; // default port to listen

app.get('/ping', (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).send('pong');
});

app.get('/', (req: Request, res: Response, next: NextFunction) => {
  fetch(`http://localhost:${port}/thumbnail/${randomString(randomInt(12, 40))}/@1920x1080`)
    .then((response: FetchResponse) => {
      return response.buffer();
    })
    .then((buffer: Buffer) => {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    })
    .catch((err: Error) => {
      console.log(err);
      res.status(500).send('Something went wrong');
    });
});

app.use('/', imageGenRouter);
app.use('/', thumbnailGenRouter);

// Start the Express server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});

function randomString(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  // also, every 4-6 characters, insert a space
  const spaceInterval = Math.floor(Math.random() * 3) + 4;
  for (let i = 0; i < length; i++) {
    if (i % spaceInterval === 0) {
      result += ' ';
    }
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}