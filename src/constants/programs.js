export const PROGRAMS = [
  {
    id: "for-context",
    name: "FOR-CONTEXT",
    price: 130,
    badge: "Graduate / Emerging",
    subtitle: "학위청구전 연계 전시",
    description:
      "석박사 청구전의 깊이 있는 결과물을 전문 갤러리 씬으로 확장합니다.",
    details: [
      "석박사 청구전 결과물을 갤러리 문맥으로 확장",
      "디렉터 상주 및 전시 운영 지원",
      "기본 온라인 홍보 지원",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
    ],
  },
  {
    id: "on-stage",
    name: "ON-STAGE",
    price: 190,
    badge: "Standard",
    subtitle: "작가의 새로운 시도",
    description:
      "신진 작가들의 새로운 시도가 가장 돋보일 수 있는 구성입니다.",
    details: [
      "신진 작가의 실험적 시도에 적합한 구성",
      "디렉터 상주 및 전시 운영 지원",
      "기본 온라인/오프라인 지원",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
    ],
  },
  {
    id: "un-frame",
    name: "UN-FRAME",
    price: 280,
    badge: "Unframe Special",
    subtitle: "디렉팅이 집중된 메인 프로그램",
    description:
      "홍보부터 프로젝트 기획까지 언프레임의 모든 역량이 집중됩니다.",
    details: [
      "언프레임의 메인 디렉팅이 집중되는 구성",
      "홍보부터 프로젝트 기획까지 밀도 있게 대응",
      "디렉터 상주 및 전시 운영 지원",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
    ],
  },
  {
    id: "beyond-view",
    name: "BEYOND-VIEW",
    price: 350,
    badge: "Extended",
    subtitle: "외부 접점의 확장",
    description:
      "팟캐스트, 매거진 등 매체를 통해 작업의 세계를 넓게 전파합니다.",
    details: [
      "매거진, 팟캐스트 등 외부 매체 확장에 적합",
      "전시 이후 기록성과 파급력까지 고려한 구성",
      "디렉터 상주 및 전시 운영 지원",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
    ],
  },
];

export const PROGRAM_MAP = PROGRAMS.reduce((acc, program) => {
  acc[program.id] = program;
  return acc;
}, {});