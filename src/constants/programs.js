export const PROGRAMS = [
  {
    id: "for-context",
    name: "FOR-CONTEXT",
    price: 130,
    badge: "Graduate / Emerging",
    description:
      "석박사 청구전 및 신진 작가에게 적합한 프로그램입니다. 디렉터 상주, 공간 운영, 기본 홍보, Curatorial Note, Exhibition OST가 포함됩니다.",
    details: [
      "디렉터 상주 및 전시 운영",
      "기본 온라인 홍보",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
      "오프닝/추가 콘텐츠는 선택형",
    ],
  },
  {
    id: "on-stage",
    name: "ON-STAGE",
    price: 190,
    badge: "Standard",
    description:
      "기본적인 전시 운영과 브랜드 톤을 갖춘 프로그램입니다. 작가가 전시에 집중할 수 있도록 현장 운영과 응대 중심으로 지원합니다.",
    details: [
      "디렉터 상주 및 전시 운영",
      "기본 온라인/오프라인 지원",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
      "추가 아티클/콘텐츠는 옵션",
    ],
  },
  {
    id: "un-frame",
    name: "UN-FRAME",
    price: 280,
    badge: "Signature",
    description:
      "UNFRAME의 기본 방향성과 가장 잘 맞는 시그니처 프로그램입니다. 전시의 밀도와 경험을 함께 설계하는 중심 프로그램입니다.",
    details: [
      "디렉터 상주 및 전시 운영",
      "기본 홍보물/현장 운영 지원",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
      "오프닝 및 추가 콘텐츠 연계 유리",
    ],
  },
  {
    id: "beyond-view",
    name: "BEYOND-VIEW",
    price: 350,
    badge: "Extended",
    description:
      "전시를 공간 안에서 끝내지 않고, 더 넓은 기록과 확장까지 고려하는 프로그램입니다. 보다 밀도 높은 협업에 적합합니다.",
    details: [
      "디렉터 상주 및 전시 운영",
      "확장형 홍보/기록 방향 대응",
      "Curatorial Note 포함",
      "Exhibition OST 포함",
      "추가 프로젝트 연동에 최적화",
    ],
  },
];

export const PROGRAM_MAP = PROGRAMS.reduce((acc, program) => {
  acc[program.id] = program;
  return acc;
}, {});