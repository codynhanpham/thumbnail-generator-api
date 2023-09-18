import {Request, Response, NextFunction} from 'express';
import path = require('path');
const express = require('express');
const router = express.Router();
const iq = require('image-q');
const PNG = require('pngjs').PNG;
const sharp = require('sharp');
const fetch = require('node-fetch');
const multer = require('multer');

router.use(express.json({limit: '3mb', extended: true}));

const multerMiddleware = multer({limits: {fieldSize: 3 * 1024 * 1024}}).none();

router.post(
  '/reduce-palette',
  multerMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      res.status(400).send('Missing body');
      return;
    }

    const image = req.body.image as string;
    const colorCount = (req.body.colorCount as number) || 5;

    if (!image) {
      res.status(400).send('Missing image');
      return;
    }

    if (colorCount > 256) {
      res.status(400).send('Color count must be less than 256');
      return;
    }

    // image can be a url or a base64 encoded string
    // accepted file types: JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG
    let imageBuffer: Buffer;
    if (image.startsWith('http')) {
      const response = await fetch(image).catch(() => {
        res.status(400).send('Error downloading image from URL');
        return;
      });
      imageBuffer = await response.buffer();
    } else {
      imageBuffer = Buffer.from(image, 'base64');
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      res.status(400).send('There is nothing to decode');
      return;
    }

    // check image type is supported
    const supportedFormat = await sharp(imageBuffer)
      .metadata()
      .then((metadata: any) => {
        if (
          !['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'svg'].includes(
            metadata.format
          )
        ) {
          res.status(400).send('Unsupported file format');
          return 'Unsupported file format';
        }
        return 'ok';
      })
      .catch(() => {
        res.status(400).send('Unsupported file format');
        return 'Unsupported file format';
      });

    if (supportedFormat !== 'ok') {
      return;
    }

    try {
      if (imageBuffer.length > 2 * 1024 * 1024) {
        res
          .status(400)
          .send(
            'Image is too large. Please use an image that is less than 2MB in size.'
          );
        return;
      }
    } catch (err) {
      res.status(500).send('Error decoding image');
      return;
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

    const outPointContainer = iq.applyPaletteSync(inPointContainer, palette, {
      colorDistanceFormula: 'euclidean',
      imageQuantization: 'floyd-steinberg',
    });

    const png = new PNG({
      width: outPointContainer.getWidth(),
      height: outPointContainer.getHeight(),
    });
    png.data = outPointContainer.toUint8Array();

    // convert png to buffer and send it back to the client
    const pngReducedBuffer = PNG.sync.write(png);

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': pngReducedBuffer.length || 0,
    });
    res.end(pngReducedBuffer);
    return;
  }
);

router.use(
  '/reduce-palette',
  express.static(path.join(__dirname, '../../src/utils/reducePaletteGet'))
);
router.get(
  '/reduce-palette',
  (req: Request, res: Response, next: NextFunction) => {
    res.sendFile(
      path.join(__dirname, '../../src/utils/reducePaletteGet/uploadImage.html')
    );
  }
);

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res
      .status(400)
      .send(
        'Image is too large. Please use an image that is less than 2MB in size.'
      );
    return;
  }
});

module.exports = router;
