export const uuidToNum = (hex: string): number[] => {
  const parts = [hex.substring(0, 8), hex.substring(8, 16), hex.substring(16)];
  return parts.map((part) => parseInt(part, 16));
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
