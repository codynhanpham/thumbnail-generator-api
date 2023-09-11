import {Request, Response, NextFunction} from 'express';
const express = require('express');
const router = express.Router();
const Jimp = require('jimp');

function randomColor(width: number, height: number) {
  const randomColor = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0');
  return {
    color: randomColor,
    alpha: 'ff',
    width: width,
    height: height,
  };
}

router.get(
  '/color/:color?',
  async (req: Request, res: Response, next: NextFunction) => {
    const defaultColor = randomColor(512, 512);
    const color =
      req.params.color ||
      `${defaultColor.color}${defaultColor.alpha}@${defaultColor.width}x${defaultColor.height}`;
    const colorSplit = color.split('@');
    const hex = colorSplit[0];
    const alpha = hex.length === 8 ? hex.substring(6, 8) : defaultColor.alpha;
    const colorHex =
      hex.length === 8 ? hex.substring(0, 6) : hex || defaultColor.color;

    if (colorHex.length !== 6) {
      return res.status(400).send('Invalid hex color');
    }

    const dimensions =
      colorSplit[1] || `${defaultColor.width}x${defaultColor.height}`;
    const dimensionsSplit = dimensions.split('x');
    if (dimensionsSplit.length === 1) {
      dimensionsSplit[1] = dimensionsSplit[0];
    }
    let width = dimensionsSplit[0] || defaultColor.width;
    let height = dimensionsSplit[1] || defaultColor.height;

    if (isNaN(Number(width)) || isNaN(Number(height))) {
      return res.status(400).send('Invalid width or height');
    }

    // cap either width or height at 10000 px
    if (Number(width) > 10000) {
      width = 10000;
    }
    if (Number(height) > 10000) {
      height = 10000;
    }

    const image = await new Jimp(
      Number(width),
      Number(height),
      `#${colorHex}${alpha}`
    );
    const buffer: Buffer = await image
      .getBufferAsync(Jimp.MIME_PNG)
      .catch((err: Error) => {
        res.status(500).send(err.message);
        return;
      });

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length || 0,
    });
    res.end(buffer);

    return;
  }
);

module.exports = router;