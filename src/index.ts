require('dotenv').config();
import {Request, Response, NextFunction} from 'express';
const express = require('express');
const app = express();
import fetch, {Response as FetchResponse} from 'node-fetch';
const {rateLimit} = require('express-rate-limit');

const imageGenRouter = require('./api/color');
const thumbnailGenRouter = require('./api/thumbnail');
const palette = require('./api/palette');
const reducePalette = require('./api/reducePalette');

const port = process.env.PORT || 3000; // default port to listen

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to this number of requests per `window` (here, per 15 minutes)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'You can only make 1000 requests every 15 minutes.',
});

app.use(limiter);

app.get('/ping', (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).send('pong');
});

app.get('/', (req: Request, res: Response, next: NextFunction) => {
  fetch(`http://localhost:${port}/thumbnail?background=@1920x1080`)
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
app.use('/', palette);
app.use('/', reducePalette);

// Start the Express server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
