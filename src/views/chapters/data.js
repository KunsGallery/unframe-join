export const VENUE_ADDRESS = "서울 종로구 인사동4길 17, 건국빌딩 건국관 108호";

export const PHOTO_CREDITS = [
  {
    label: "Insa-dong 인사동 October 1 2020 20",
    author: "S h y numis",
    url: "https://commons.wikimedia.org/wiki/File:Insa-dong_%EC%9D%B8%EC%82%AC%EB%8F%99_October_1_2020_20.jpg",
  },
  {
    label: "Seoul, Jongno District, Insa-dong, Insadong-gil",
    author: "Dr. Thomas Liptak",
    url: "https://commons.wikimedia.org/wiki/File:Seoul,_Jongno_District,_Insa-dong,_Insadong-gil.jpg",
  },
  {
    label: "Insa-dong 인사동 October 1 2020 14",
    author: "S h y numis",
    url: "https://commons.wikimedia.org/wiki/File:Insa-dong_%EC%9D%B8%EC%82%AC%EB%8F%99_October_1_2020_14.jpg",
  },
  {
    label: "Insa-dong 인사동 October 1 2020 12",
    author: "S h y numis",
    url: "https://commons.wikimedia.org/wiki/File:Insa-dong_%EC%9D%B8%EC%82%AC%EB%8F%99_October_1_2020_12.jpg",
  },
];

const MARK_REACH = 1.6;
const MARK_REST_SCALE = 0.82;

// With a pointer over the mark, the nearest block rises fully and the rest settle lower.
export const getMarkHeights = (bases, pointerRatio) => {
  if (pointerRatio === null || pointerRatio === undefined) return bases;
  const pointer = Math.min(1, Math.max(0, pointerRatio)) * bases.length;
  return bases.map((base, index) => {
    const distance = Math.abs(index + 0.5 - pointer);
    const lift = Math.max(0, 1 - distance / MARK_REACH);
    const rest = base * MARK_REST_SCALE;
    return Math.round(rest + (100 - rest) * lift);
  });
};
