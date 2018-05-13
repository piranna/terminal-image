'use strict';

const Jimp = require('@sindresorhus/jimp');
const chalk = require('chalk');
const {string: termImg} = require('term-img');
const terminalCharWidth = require('terminal-char-width');

const CHAR_HEIGHT = 16;
const CHAR_WIDTH = CHAR_HEIGHT * terminalCharWidth;

async function render(fileBuffer, {height, width}) {
	const image = await Jimp.read(fileBuffer);
	const {bitmap} = image;

	if (height === undefined && width === undefined) {
		height = bitmap.height / CHAR_HEIGHT;
		width = bitmap.width / CHAR_WIDTH;
	} else if (height === undefined) {
		height = bitmap.height * terminalCharWidth * width / bitmap.width;
	} else {
		width = bitmap.width / terminalCharWidth * height / bitmap.height;
	}

	// Each character has two vertical blocks, so we double the number of rows
	height *= 2;

	height = Math.round(height);
	width = Math.round(width);

	if (height !== bitmap.height || width !== bitmap.width) {
		image.resize(width, height);
	}

	const ret = new Array(Math.ceil(bitmap.height / 2));
	for (let y = 0; y < bitmap.height - 1; y += 2) {
		const rowIndex = y / 2;
		let row = '';
		for (let x = 0; x < bitmap.width; x++) {
			const {r, g, b, a} = Jimp.intToRGBA(image.getPixelColor(x, y));
			const {r: r2, g: g2, b: b2, a: a2} = Jimp.intToRGBA(image.getPixelColor(x, y + 1));

			if (a === 0 && a2 === 0) {
				// Both pixels are full transparent
				row += chalk.reset(' ');
			} else if (a) {
				// Only upper pixel is full transparent
				row += chalk.rgb(r2, g2, b2)('▄');
			} else if (a2) {
				// Only lower pixel is full transparent
				row += chalk.rgb(r, g, b)('▀');
			} else if (r === r2 && g === g2 && b === b2) {
				// Both pixels has the same color
				row += chalk.rgb(r, g, b)('█');
			} else {
				// Pixels has different colors
				row += chalk.rgb(r, g, b).bgRgb(r2, g2, b2)('▀');
			}
		}

		ret[rowIndex] = row;
	}

	// Image has an odd number of rows
	if (height % 2) {
		const y = height - 1;
		const rowIndex = y / 2;
		let row = '';
		for (let x = 0; x < bitmap.width; x++) {
			const {r, g, b} = Jimp.intToRGBA(image.getPixelColor(x, y));

			row += chalk.rgb(r, g, b)('▀');
		}

		ret[rowIndex] = row;
	}

	return ret.join('\n');
}

module.exports = function (fileBuffer, {height, width} = {}) {
	function fallback() {
		return render(fileBuffer, {height, width});
	}

	return termImg(fileBuffer, {fallback, height, width});
};
