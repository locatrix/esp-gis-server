import {isNumberLike} from "@mantine/core";

const specialLevels = ['coverage', 'uncategorised', 'unknown', 'unused', 'site'] as const;
// branded literal:
export type TilesetName = string & { readonly TilesetName: unique symbol };

export type Tileset = (typeof specialLevels)[number] | `${number}` | TilesetName;

export function isNumber(value: Tileset): value is `${number}` {
  return isNumberLike(value)
}

export function isTileName(level: Tileset): level is TilesetName {
  return !isNumber(level) && !specialLevels.includes(level as any);
}

export function formatLevel(level: Tileset): string {
  if (isTileName(level)) {
    return level as string;
  }
  
  if (level === 'coverage') {
    return '🗺️Coverage';
  } else if (level === 'uncategorised') {
    return '📝Uncategorised';
  } else if (level === 'unknown') {
    return '❓Unknown';
  } else if (level === 'unused') {
    return '🏚️Unused';
  } else if (level === 'site') {
    return '🏘️Site Plan';
  }
  
  const num = parseFloat(level);

  const isMezzanine = Math.abs(num) % 1 !== 0;
  
  if (num < 0) {
    return `Basement Level ${Math.abs(num)}` + (isMezzanine ? ' (Mezzanine)' : '');
  }
  
  if (num === 0) {
    return 'Ground Level';
  }
  
  return `Level ${num}` + (isMezzanine ? ' (Mezzanine)' : '');
}
