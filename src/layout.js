const round = value => Math.round(value * 1000) / 1000;

export function caseLayoutFor(keyboard) {
  const [keyboardWidth, keyboardHeight, keyboardDepth] = keyboard.dims;
  const width = Math.max(116, keyboardWidth + 14);
  const height = keyboardHeight + 128;
  const depth = Math.max(36, Math.min(44, keyboardDepth + 20));
  const keyboardY = -height / 2 + keyboardHeight / 2 + 8;
  const displayY = height / 2 - 39;
  const keyboardTop = keyboardY + keyboardHeight / 2;
  const displayBottom = displayY - 33;
  const navY = (keyboardTop + displayBottom) / 2;
  const frontZ = depth / 2;
  const keyboardZ = frontZ - keyboardDepth / 2 - 0.6;
  const pocketClearance = 1.5;
  const pocketWall = 1.8;
  const pocketDepth = keyboardDepth + pocketClearance * 2;
  const pocketWidth = Math.min(keyboardWidth + pocketClearance * 2 + pocketWall * 2, width - 6);
  const pocketHeight = keyboardHeight + pocketClearance * 2 + pocketWall * 2;

  return {
    w: round(width),
    h: round(height),
    d: round(depth),
    keyboardY: round(keyboardY),
    keyboardZ: round(keyboardZ),
    displayY: round(displayY),
    navY: round(navY),
    frontZ: round(frontZ),
    faceplateCenterZ: round(frontZ - 0.2),
    faceplateFrontZ: round(frontZ + 0.6),
    pocket: {
      w: round(pocketWidth),
      h: round(pocketHeight),
      d: round(pocketDepth),
      wall: pocketWall,
      clearance: pocketClearance,
      centerZ: round(frontZ - pocketDepth / 2 - 1.2),
      backZ: round(frontZ - pocketDepth - 1.2)
    }
  };
}
