export const isString = (str): boolean =>
  typeof str === 'string' || str instanceof String;

export const notEmptyString = (str, min = 1): boolean =>
  isString(str) && str.length >= min;

const numPattern = `\s*-?\\d+(\\.\\d+)?`;

const numRgx = new RegExp('^' + numPattern);

export const isNumericType = (inval) =>
  typeof inval === 'number' || inval instanceof Number;

export const isNumber = (inval) => isNumericType(inval) && !isNaN(inval);

export const isNumeric = (inval) => isNumber(inval) || numRgx.test(inval);

export const smartCastNumber = (item: any, defVal = 0, isInt = false) => {
  let out = defVal;

  if (typeof item === 'string') {
    if (item.length > 0) {
      if (/^\s*-?\d+(\.\d+)?\s*/.test(item)) {
        out = isInt ? parseInt(item, 10) : parseFloat(item);
      }
    }
  } else if (typeof item === 'number') {
    out = item;
  }
  return out;
};

export const smartCastInt = (item: any, defVal = 0) => {
  return smartCastNumber(item, defVal, true);
};

export const smartCastFloat = (item: any, defVal = 0) => {
  return smartCastNumber(item, defVal, false);
};

export const uuidToNum = (hex: string): number[] => {
  const parts = [hex.substring(0, 8), hex.substring(8, 16), hex.substring(16)];
  return parts.map((part) => parseInt(part, 16));
};

export const uuidTo36 = (hex: string): string => {
  return uuidToNum(hex)
    .map((n) => n.toString(36))
    .join('');
};

export const uuidPairSort = (hex1: string, hex2: string): string[] => {
  const p1 = uuidToNum(hex1);
  const p2 = uuidToNum(hex2);
  if (p1[0] > p2[0]) {
    return [hex1, hex2];
  } else if (p1[0] === p2[0]) {
    if (p1[1] > p2[1]) {
      return [hex1, hex2];
    } else if (p1[1] === p2[1]) {
      return p1[2] > p2[2] ? [hex1, hex2] : [hex2, hex1];
    } else {
      return [hex2, hex1];
    }
  } else {
    return [hex2, hex1];
  }
};

/*
  Ensure the same combination of uuids always generates the same chat id
  irrespective of who iniatiated it
*/
export const generateChatId = (hex1: string, hex2: string): string => {
  return uuidPairSort(hex1, hex2).join('_');
};

export const extractStringFromArrayOrString = (
  str: string | string[],
): string => {
  return str instanceof Array ? (str.length > 0 ? str[0] : '') : str;
};
