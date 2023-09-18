export function rgbaToHex(rgbaArray: number[], withAlpha = true): string {
  if (rgbaArray.length !== 4) {
    throw new Error('RGBA array must contain 4 values: R, G, B, A');
  }

  const [r, g, b, a] = rgbaArray.map(value =>
    Math.min(255, Math.max(0, value))
  ); // Ensure values are in the range [0, 255]

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  if (withAlpha) {
    const aHex = a.toString(16).padStart(2, '0'); // Convert A to hexadecimal and ensure it has two digits
    return `#${rHex}${gHex}${bHex}${aHex}`;
  } else {
    return `#${rHex}${gHex}${bHex}`;
  }
}
