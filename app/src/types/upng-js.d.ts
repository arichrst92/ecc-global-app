/**
 * Minimal types for upng-js — pure-JS PNG decoder.
 * https://github.com/photopea/UPNG.js
 */
declare module 'upng-js' {
  export interface UpngImage {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: Record<string, unknown>;
    data: Uint8Array;
  }

  export function decode(buffer: ArrayBuffer | Uint8Array): UpngImage;
  export function toRGBA8(img: UpngImage): ArrayBuffer[];
  export function encode(
    imgs: ArrayBuffer[],
    width: number,
    height: number,
    cnum: number,
    dels?: number[],
  ): ArrayBuffer;

  const _default: {
    decode: typeof decode;
    toRGBA8: typeof toRGBA8;
    encode: typeof encode;
  };
  export default _default;
}
