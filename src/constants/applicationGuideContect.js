export const getApplicationGuideContent = (application) => {
  const programName = application?.selectedProgram?.name || "선택 프로그램";
  const programPrice = application?.selectedProgram?.price
    ? `${application.selectedProgram.price}만원`
    : "";
  const partnerType = application?.partnerType || "artist";
  const projectTitle = application?.exhibitionTitle || "프로젝트";

  const commonSections = [
    {
      id: "next-steps",
      title: "다음 진행 단계",
      description:
        "승인 이후의 커뮤니케이션과 준비 과정을 한눈에 확인할 수 있도록 정리했습니다.",
      items: [
        "세부 일정 및 진행 방향은 등록된 이메일을 통해 순차적으로 안내됩니다.",
        "필요 시 추가 서류, 설치 관련 자료, 이미지 원본 등을 요청드릴 수 있습니다.",
        "오프닝, 현장 운영, 기본 안내 방식은 내부 검토 후 프로젝트 성격에 맞춰 조율됩니다.",
      ],
    },
    {
      id: "communication",
      title: "커뮤니케이션 원칙",
      description:
        "프로젝트 진행 중 전달되는 주요 안내는 이메일을 기준으로 하며, 필요한 경우 추가 연락이 진행됩니다.",
      items: [
        "중요한 안내는 이메일을 기준으로 전달됩니다.",
        "제출 자료의 변경이 필요한 경우 사전 공유 후 진행해 주세요.",
        "일정 변경이나 취소가 필요한 경우 가능한 빠르게 알려주셔야 합니다.",
      ],
    },
  ];

  const artistSections = [
    {
      id: "artist-materials",
      title: "작가 제출 자료 가이드",
      description:
        "전시 진행을 위해 아래 자료를 요청드릴 수 있습니다. 프로젝트 성격에 따라 일부 항목은 조정될 수 있습니다.",
      items: [
        "작품 리스트 최종본",
        "대표 이미지 및 설치 참고 이미지",
        "작가 노트 또는 전시 소개문 최종본",
        "캡션 표기 정보 및 영문 표기 확인",
      ],
    },
    {
      id: "artist-space",
      title: "전시 운영 안내",
      description: `${projectTitle}는 ${programName}${programPrice ? ` (${programPrice})` : ""} 기준으로 운영 검토가 완료된 상태입니다.`,
      items: [
        "설치 및 철수 관련 기본 일정은 사전 조율 후 확정됩니다.",
        "공간 운영 및 관람 동선 관련 세부 사항은 내부 기준에 따라 조정될 수 있습니다.",
        "오프닝 진행 여부 및 현장 응대 방식은 프로젝트 방향에 맞춰 개별 안내됩니다.",
      ],
    },
  ];

  const brandSections = [
    {
      id: "brand-materials",
      title: "브랜드/기획 제출 자료 가이드",
      description:
        "협업 및 공간 활용 검토를 위해 아래 자료를 기준으로 최종 정리를 요청드릴 수 있습니다.",
      items: [
        "프로젝트 소개서 또는 기획안 최종본",
        "브랜드 소개 자료 및 시각 자료",
        "공간 활용 방식, 설치 방식 관련 참고 자료",
        "운영 및 일정 관련 실무 담당 정보",
      ],
    },
    {
      id: "brand-operation",
      title: "프로젝트 운영 안내",
      description: `${projectTitle}는 ${programName}${programPrice ? ` (${programPrice})` : ""} 기준으로 운영 검토가 완료된 상태입니다.`,
      items: [
        "공간 활용 범위와 세부 연출은 사전 협의 후 확정됩니다.",
        "현장 운영, 응대 방식, 기본 안내 요소는 프로젝트 목적에 따라 조율됩니다.",
        "추가 제작물 또는 현장 설치 요소가 필요한 경우 별도 협의가 진행될 수 있습니다.",
      ],
    },
  ];

  return {
    hero: {
      eyebrow: "Approved Guide",
      title: "진행 가이드",
      subtitle:
        "승인 이후 필요한 자료와 진행 흐름을 상세 페이지에서 바로 확인하실 수 있습니다.",
    },
    sections: [
      ...(partnerType === "brand" ? brandSections : artistSections),
      ...commonSections,
    ],
  };
};