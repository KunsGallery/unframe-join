const SAMPLE_SIZE = 96;
const BUCKET_SHIFT = 4;
const MIN_SATURATION = 0.15;
const MIN_LIGHTNESS = 0.12;
const MAX_LIGHTNESS = 0.92;
const MIN_COLOR_DISTANCE = 70;

const toHex = (channels) =>
  `#${channels.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

const measure = (r, g, b) => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  return { lightness, saturation };
};

// Groups pixels into coarse colours, ignoring paper, ink and greys, and ranks vivid ones higher.
export const pickPaletteFromPixels = (data, limit = 4) => {
  const buckets = new Map();
  for (let index = 0; index + 3 < data.length; index += 4) {
    const [r, g, b, a] = [data[index], data[index + 1], data[index + 2], data[index + 3]];
    if (a < 128) continue;
    const { lightness, saturation } = measure(r, g, b);
    if (saturation < MIN_SATURATION || lightness < MIN_LIGHTNESS || lightness > MAX_LIGHTNESS) continue;

    const key = (r >> BUCKET_SHIFT) << 8 | (g >> BUCKET_SHIFT) << 4 | (b >> BUCKET_SHIFT);
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .map(({ r, g, b, count }) => {
      const color = [r / count, g / count, b / count];
      // Chroma, unlike saturation, stays low for pale washes spread across a poster's background.
      const chroma = (Math.max(...color) - Math.min(...color)) / 255;
      return { color, score: count * chroma ** 2 };
    })
    .sort((first, second) => second.score - first.score);

  const picked = [];
  for (const { color } of ranked) {
    const isDistinct = picked.every((other) => Math.hypot(...color.map((value, channel) => value - other[channel])) >= MIN_COLOR_DISTANCE);
    if (isDistinct) picked.push(color);
    if (picked.length === limit) break;
  }
  return picked.map(toHex);
};

// The poster store allows this site's origin, so a stored poster can be read as well as a new file.
export const readPosterPalette = (src, limit = 4) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        resolve(pickPaletteFromPixels(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data, limit));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("포스터 이미지를 읽지 못했습니다."));
    image.src = src;
  });
