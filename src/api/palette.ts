import {Request, Response, NextFunction} from 'express';
const express = require('express');
const router = express.Router();
const iq = require('image-q');
const PNG = require('pngjs').PNG;
const sharp = require('sharp');
const fs = require('fs');
const fetch = require('node-fetch');
const multer = require('multer');

const {rgbaToHex} = require('../utils/utils');

router.use(express.json());

router.post(
  '/palette',
  [multer().none()],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      res.status(400).send('Missing body');
      return;
    }
    const image = req.body.image as string;
    const colorCount = (req.body.colorCount as number) || 5;
    const noAlpha = (req.body.noAlpha as boolean) || false;

    if (!image) {
      res.status(400).send('Missing image');
      return;
    }

    // image can be a url or a base64 encoded string
    // accepted file types: JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG
    let imageBuffer: Buffer;
    if (image.startsWith('http')) {
      const response = await fetch(image).catch((err: Error) => {
        res.status(400).send('Error downloading image from URL');
        return;
      });
      imageBuffer = await response.buffer();
    } else {
      imageBuffer = Buffer.from(image, 'base64');
    }

    const pngBuffer = await sharp(imageBuffer).png().toBuffer();

    const {data, width, height} = PNG.sync.read(pngBuffer);
    const inPointContainer = iq.utils.PointContainer.fromUint8Array(
      data,
      width,
      height
    );

    const palette = iq.buildPaletteSync([inPointContainer], {
      colorDistanceFormula: 'euclidean',
      paletteQuantization: 'neuquant',
      colors: colorCount || 5,
    });

    const hexPalette = palette._pointArray.map((point: any) => {
      return rgbaToHex(point.rgba, !noAlpha);
    });

    res.status(200).json({
      palette: hexPalette,
    });
    return;
  }
);

module.exports = router;
