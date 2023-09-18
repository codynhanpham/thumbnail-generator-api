import {Request, Response, NextFunction} from 'express';
const express = require('express');
const router = express.Router();
const {Resvg} = require('@resvg/resvg-js');
const svg = require('svg-builder');

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

function checkColorHex(hex: string, length: number) {
  const hexRegex = new RegExp(`^[0-9a-fA-F]{${length}}$`);
  return hexRegex.test(hex);
}

function renderSvg(
  colorHex: string,
  alpha: string,
  width: number,
  height: number
): Promise<{buffer: Buffer; svg: string}> {
  return new Promise((resolve, reject) => {
    try {
      const svgImage = svg.newInstance();
      svgImage.width(width).height(height);

      svgImage.rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: `#${colorHex}${alpha}`,
      });

      const resvg = new Resvg(svgImage.render());
      const pngData = resvg.render();
      const png = pngData.asPng();

      resolve({
        buffer: png,
        svg: svgImage.render(),
      });
    } catch (err) {
      reject(err);
    }
  });
}

// refactor the color generation into a separate function
async function generateColor(
  color: string
): Promise<{buffer?: Buffer; svg?: string; error?: string}> {
  return new Promise(async (resolve, reject) => {
    const defaultColor = randomColor(1200, 630);
    if (!color) {
      color = `${defaultColor.color}${defaultColor.alpha}@${defaultColor.width}x${defaultColor.height}`;
    }
    const colorSplit = color.split('@');
    const hex = colorSplit[0];
    const alpha = hex.length === 8 ? hex.substring(6, 8) : defaultColor.alpha;
    const colorHex =
      hex.length === 8 ? hex.substring(0, 6) : hex || defaultColor.color;

    if (!checkColorHex(colorHex, 6) || !checkColorHex(alpha, 2)) {
      reject('Invalid color hex');
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
      reject('Invalid width or height');
    }

    // cap either width or height at 10000 px
    if (Number(width) > 10000) {
      width = 10000;
    }
    if (Number(height) > 10000) {
      height = 10000;
    }

    const png = await renderSvg(
      colorHex,
      alpha,
      Number(width),
      Number(height)
    ).catch((err: Error) => {
      reject(err.message);
    });

    if (!png || !png.buffer || !(png.buffer instanceof Buffer)) {
      reject('Invalid png buffer. Error during rendering svg');
    }

    resolve({
      buffer: png ? png.buffer : undefined,
      svg: png ? png.svg : undefined,
      error: undefined,
    });
  });
}

router.get(
  '/color/:color?/:svg?/:preview?',
  async (req: Request, res: Response, next: NextFunction) => {
    // also handle the request as query params (all as strings)
    const color = (req.params.color || req.query.color || '') as string;
    const asSVGstr = (req.params.svg || req.query.svg || '') as string;
    const previewStr = (req.params.preview ||
      req.query.preview ||
      'true') as string;

    const trueOps = ['svg', 'true', '1', 'yes', 't', 'y'];
    const asSVG = trueOps.includes(asSVGstr.toLowerCase());
    trueOps.push('preview');
    const preview = trueOps.includes(previewStr.toLowerCase());

    const png = await generateColor(color).catch((err: Error) => {
      return {
        buffer: undefined,
        svg: undefined,
        error: err,
      };
    });

    if (png.error) {
      res.status(400).send(png.error);
      return;
    }

    // if asSVG is true, return the svg instead of the png
    if (asSVG) {
      if (!png.svg) {
        res.status(400).send('Error rendering svg');
        return;
      }

      if (!preview) {
        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Content-Length': png.svg.length || 0,
        });
        res.end(png.svg);
        return;
      }

      const html = `<html><body><object>${png.svg}</object></body></html>`;
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': html.length || 0,
      });
      res.end(html);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': (png.buffer as Buffer).length || 0,
    });
    res.end(png.buffer);
    return;
  }
);

module.exports = router;
