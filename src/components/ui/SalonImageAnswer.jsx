import React from "react";

export default function SalonImageAnswer({ answer }) {
  const url = typeof answer?.value === "string" ? answer.value : "";
  if (!/^https:\/\//i.test(url)) return "-";
  return <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block" title="첨부 이미지 원본 보기"><img src={url} alt={answer.label || "첨부 이미지"} loading="lazy" className="max-h-72 w-full rounded-lg object-contain" /><span className="mt-2 block text-sm text-[#004aad] underline">원본 이미지 보기</span></a>;
}
