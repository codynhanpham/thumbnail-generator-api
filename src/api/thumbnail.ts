import {Request, Response, NextFunction} from 'express';
const express = require('express');
const router = express.Router();
const {Resvg} = require('@resvg/resvg-js');
const svg = require('svg-builder');
const chroma = require('chroma-js');

const svgOpts = {
  font: {
    fontFiles: ['./fonts/Dongle-Regular.ttf'], // Load custom fonts.
    loadSystemFonts: false, // It will be faster to disable loading system fonts.
    defaultFontFamily: 'Dongle',
  },
};

function randomBackground(width: number, height: number) {
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

function checkColorHex(hex: string, length: number) {
  const hexRegex = new RegExp(`^[0-9a-fA-F]{${length}}$`);
  return hexRegex.test(hex);
}

function renderSvg(
  description: string,
  backgroundHex: string,
  alpha: string,
  width: number,
  height: number
): Promise<{buffer: Buffer; svg: string}> {
  return new Promise((resolve, reject) => {
    try {
      const svgImage = svg.newInstance();
      svgImage.width(width).height(height);

      const descWordCount = description.split(' ').length;
      const textFill =
        chroma.contrast(`#${backgroundHex}${alpha}`, '#010102') > 4.5
          ? '#010102bf'
          : '#f1f2f2bf';

      // font size is the smaller of the two dimensions divided by 5, reduced by a power factor of 0.0.. something for every 5 word, while capping max size at 86
      const fontSize = Math.min(
        Math.floor(
          (Math.min(width, height) / 5) *
            Math.pow(1 - 0.021, Math.floor(descWordCount / 2))
        ),
        900 // max font size
      );

      // estimate the width of the text for warping, split into multiple lines with \n if necessary
      const textWidth = description.length * fontSize * 0.5;
      const textLines = Math.ceil(textWidth / width);
      const textSplit = description.split(' ');
      // distribute words into lines evenly if there are multiple lines
      const wordsPerLine = Math.ceil(textSplit.length / textLines);
      const formattedDesc = [];
      for (let i = 0; i < textLines; i++) {
        formattedDesc.push(
          textSplit.slice(i * wordsPerLine, (i + 1) * wordsPerLine).join(' ')
        );
      }

      svgImage.rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: `#${backgroundHex}${alpha}`,
      });

      const textX = Math.floor(width / 2);
      // multiple lines of text, textY reduces from the center by fontSize for every line
      for (let i = 0; i < textLines; i++) {
        const textY = Math.ceil(
          height / 2 - 0.9 * fontSize * (textLines / 2 - i) + fontSize / 2
        );
        svgImage.text(
          {
            x: textX,
            y: textY,
            fill: textFill,
            'font-size': fontSize,
            'font-family': 'Dongle-Regular',
            'text-anchor': 'middle',
            'alignment-baseline': 'baseline',
          },
          formattedDesc[i]
        );
      }

      const resvg = new Resvg(svgImage.render(), svgOpts);
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

async function generateThumbnail(
  description: string,
  background: string
): Promise<{buffer?: Buffer; svg?: string; error?: string}> {
  return new Promise(async (resolve, reject) => {
    const defaultBackground = randomBackground(1200, 630);
    const defaultText = randomString(randomInt(12, 40));
    if (!description) {
      description = defaultText;
    }

    // cap description word count at 25
    if (description.split(' ').length > 25) {
      reject('Description too long. Max 25 words');
    }

    if (!background) {
      background = `${defaultBackground.color}${defaultBackground.alpha}@${defaultBackground.width}x${defaultBackground.height}`;
    }

    const backgroundSplit = background.split('@');
    const hex = backgroundSplit[0];
    const alpha =
      hex.length === 8 ? hex.substring(6, 8) : defaultBackground.alpha;
    const backgroundHex =
      hex.length === 8 ? hex.substring(0, 6) : hex || defaultBackground.color;

    if (!checkColorHex(backgroundHex, 6) || !checkColorHex(alpha, 2)) {
      reject('Invalid background hex');
    }

    const dimensions =
      backgroundSplit[1] ||
      `${defaultBackground.width}x${defaultBackground.height}`;
    const dimensionsSplit = dimensions.split('x');
    if (dimensionsSplit.length === 1) {
      dimensionsSplit[1] = dimensionsSplit[0];
    }
    let width = dimensionsSplit[0] || defaultBackground.width;
    let height = dimensionsSplit[1] || defaultBackground.height;

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
      description,
      backgroundHex,
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
  '/thumbnail/:description?/:background?/:svg?/:preview?',
  async (req: Request, res: Response, next: NextFunction) => {
    // also handle the request as query params (all as strings)
    const description = (req.params.description ||
      req.query.description ||
      '') as string;
    const background = (req.params.background ||
      req.query.background ||
      '') as string;
    const asSVGstr = (req.params.svg || req.query.svg || '') as string;
    const previewStr = (req.params.preview ||
      req.query.preview ||
      'true') as string;

    const trueOps = ['svg', 'true', '1', 'yes', 't', 'y'];
    const asSVG = trueOps.includes(asSVGstr.toLowerCase());
    trueOps.push('preview');
    const preview = trueOps.includes(previewStr.toLowerCase());

    const png = await generateThumbnail(description, background).catch(
      (err: Error) => {
        return {
          buffer: undefined,
          svg: undefined,
          error: err,
        };
      }
    );

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

      // otherwise if preview is true, render the svg as html object
      // embed the font into the svg
      let svgString = png.svg.replace(
        '</svg>',
        "<style>@import url('https://fonts.googleapis.com/css2?family=Dongle&family=Open+Sans&display=swap');</style></svg>"
      );
      // also replace "Dongle-Regular" with "Dongle"
      svgString = svgString.replace(/Dongle-Regular/g, 'Dongle');
      // render as an html object so that the font can be fetched
      const html = `<html><body><object>${svgString}</object></body></html>`;

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
