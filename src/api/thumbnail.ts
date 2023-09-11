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

function renderSvg(
  description: string,
  backgroundHex: string,
  alpha: string,
  width: number,
  height: number
): Promise<Buffer> {
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
            Math.pow(1 - 0.0205, Math.floor(descWordCount / 2))
        ),
        120 // max font size
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

      resolve(png);
    } catch (err) {
      reject(err);
    }
  });
}

router.get(
  '/thumbnail/:description?/:background?',
  async (req: Request, res: Response, next: NextFunction) => {
    const defaultBackground = randomBackground(1200, 630);
    const defaultText = randomString(randomInt(12, 40));
    const description = req.params.description || defaultText;

    // cap description word count at 25
    if (description.split(' ').length > 25) {
      return res.status(400).send('Description too long. Max 25 words');
    }

    const background =
      req.params.background ||
      `${defaultBackground.color}${defaultBackground.alpha}@${defaultBackground.width}x${defaultBackground.height}`;

    const backgroundSplit = background.split('@');
    const hex = backgroundSplit[0];
    const alpha =
      hex.length === 8 ? hex.substring(6, 8) : defaultBackground.alpha;
    const backgroundHex =
      hex.length === 8 ? hex.substring(0, 6) : hex || defaultBackground.color;

    if (backgroundHex.length !== 6) {
      return res.status(400).send('Invalid hex color');
    }

    const dimensions =
      backgroundSplit[1] ||
      `${defaultBackground.width}x${defaultBackground.height}`;
    const dimensionsSplit = dimensions.split('x');
    if (dimensionsSplit.length === 1) {
      dimensionsSplit[1] = dimensionsSplit[0];
    }
    const width = dimensionsSplit[0] || defaultBackground.width;
    const height = dimensionsSplit[1] || defaultBackground.height;

    if (isNaN(Number(width)) || isNaN(Number(height))) {
      return res.status(400).send('Invalid width or height');
    }

    const png = await renderSvg(
      description,
      backgroundHex,
      alpha,
      Number(width),
      Number(height)
    ).catch((err: Error) => {
      res.status(500).send(err.message);
      return;
    });

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': (png as Buffer).length,
    });
    res.end(png);

    return;
  }
);

module.exports = router;