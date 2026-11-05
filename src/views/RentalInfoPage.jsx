import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { appId, db } from "../lib/firebase";
import { PROGRAMS } from "../constants/programs";
import { SALON_EVENT_COLLECTION, formatSalonDateTime, toDate } from "../constants/salon";
import { ChapterPage, FaqTiles, MarkFooter, Stages } from "./chapters/Chapters";
import { VENUE_ADDRESS } from "./chapters/data";

const PROGRAM_FIELDS = ["on-blue", "on-ink", "on-lime", "on-coral"];
const PROGRAM_BUTTONS = ["ch-btn--paper", "ch-btn--lime", "", ""];

const STAGES = [
  { title: "문의", body: "목적과 희망 일정, 예상 인원, 설치 계획을 보내 주세요. 정해지지 않은 항목은 미정으로 남겨도 됩니다." },
  { title: "일정·적합성 검토", body: "계획이 공간과 맞는지, 희망 기간에 운영할 수 있는지 함께 살펴봅니다." },
  { title: "견적·조건 안내", body: "이용 범위와 필요한 지원을 정리해 비용과 조건을 안내드립니다." },
  { title: "계약·입금", body: "조건을 확정한 뒤 계약과 입금으로 일정을 잡습니다. 문의 접수만으로는 예약되지 않습니다." },
  { title: "반입·운영·철수", body: "작품과 장비를 반입해 운영하고, 종료 후 철수와 공간 원상복구로 마무리합니다." },
];

const FAQ_ITEMS = [
  { question: "일정이나 예산이 아직 미정이어도 문의할 수 있나요?", answer: "네. 정해진 내용만 입력해 주세요. 희망 날짜는 비워 두고, 이용 시간이나 예산은 미정으로 남길 수 있습니다." },
  { question: "대관 비용과 이용 가능 일정은 어디서 확인하나요?", answer: "전시 프로그램은 이 페이지의 금액을 기준으로 삼습니다. 공간만 이용하는 경우의 비용과 이용 가능 일정은 행사 목적과 기간, 필요한 지원을 검토한 뒤 개별 안내드립니다." },
  { question: "프로그램 금액 외에 추가 비용이 있나요?", answer: "기본 운영 범위 안에서는 별도의 추가 비용이 없습니다. 다만 개별 인쇄물 제작, 특수 장비 렌탈, 별도 외주 작업 등 선택 사항은 추가될 수 있습니다." },
  { question: "대관 문의와 협업 제안은 어떻게 다른가요?", answer: "공간 이용이 중심이라면 대관 문의를, 언프레임과 공동 기획하거나 콘텐츠를 함께 만들고 싶다면 협업 문의를 이용해 주세요." },
  { question: "개인전이 아닌 그룹전이나 팀 단위도 가능한가요?", answer: "네, 가능합니다. 팀 단위 프로젝트나 그룹 전시도 신청하실 수 있으며, 원활한 진행을 위해 대표자 한 분을 지정해 주시면 됩니다." },
  { question: "학생이나 신진 작가도 신청할 수 있나요?", answer: "물론입니다. 언프레임은 경력보다 작품의 철학, 공간과의 조화, 그리고 시도의 진정성을 더 중요하게 봅니다." },
  { question: "전시 외에 공연이나 워크숍도 가능한가요?", answer: "브랜드와 공간의 방향에 잘 맞는다면 퍼포먼스, 아티스트 토크, 원데이 클래스 등 다양한 형태도 가능합니다. 문의서에 상세 내용을 함께 적어 주세요." },
  { question: "디렉터 상주는 구체적으로 어떤 도움을 주나요?", answer: "전시장 오픈과 마감, 관람객 응대, 작품 설명, 구매 문의 대응, 현장 컨디션 관리까지 전반적인 운영을 디렉터가 함께 맡습니다." },
  { question: "작품 판매가는 작가가 직접 결정하나요?", answer: "네, 판매가는 작가가 직접 정하는 것을 원칙으로 합니다. 필요하신 경우에는 시장 시세와 공간 특성을 바탕으로 디렉터가 가격 설정 가이드를 드릴 수 있습니다." },
  { question: "일정을 확정했다가 취소하면 어떻게 되나요?", answer: "일정 확정 이후 취소 시점에 따라 조정이 필요할 수 있습니다. 세부 기준은 진행 단계에서 별도로 안내드립니다." },
];

const useVenueEvents = () => {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    let active = true;
    getDocs(collection(db, "artifacts", appId, "public", "data", SALON_EVENT_COLLECTION))
      .then((snapshot) => {
        if (!active) return;
        setEvents(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .filter((event) => {
              const startAt = toDate(event.eventStartAt);
              return event.posterImageUrl && event.status !== "draft" && startAt && startAt.getTime() < Date.now();
            })
            .sort((a, b) => toDate(b.eventStartAt) - toDate(a.eventStartAt))
        );
      })
      .catch((error) => console.error(error));
    return () => { active = false; };
  }, []);
  return events;
};

const VenueEvents = ({ events, onContinue }) => {
  const [selectedId, setSelectedId] = useState("");
  const selected = events.find((event) => event.id === selectedId) || events[0];
  if (!selected) return null;

  return (
    <section id="held" className="ch-field on-lime">
      <div className="ch-split">
        <img className="ch-plate-img rv" src={selected.posterImageUrl} alt={`${selected.title} 포스터`} loading="lazy" />
        <div>
          <div className="ch-tabs rv" role="tablist" aria-label="108호에서 열린 모임">
            {events.map((event) => (
              <button key={event.id} type="button" role="tab" aria-selected={event.id === selected.id} className="ch-tab" onClick={() => setSelectedId(event.id)}>
                {event.title.replace(/^UNFRAME SALON\s*/i, "")}
              </button>
            ))}
          </div>
          <h2 className="ch-title rv" style={{ "--i": 1 }}>108호에서 이미<br />이런 자리가 열렸습니다</h2>
          <p className="rv" style={{ "--i": 2, marginTop: 20 }}>
            {selected.title}, {formatSalonDateTime(selected.eventStartAt)}. UNFRAME이 직접 기획해 이 공간에서 연 모임입니다.
          </p>
          <div className="rv" style={{ "--i": 3, marginTop: 28 }}>
            <button type="button" className="ch-btn" onClick={() => onContinue()}>이 공간 문의하기 <ArrowRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function RentalInfoPage({ onBack, onContinue }) {
  const [title, setTitle] = useState("");
  const events = useVenueEvents();
  const trimmedTitle = title.trim();
  const toInquiry = (overrides = {}) => onContinue({ title: trimmedTitle, ...overrides });
  const swatches = useMemo(() => [
    { href: "#programs", label: "프로그램", tone: "on-lime" },
    { href: "#support", label: "UNFRAME이 맡는 일", tone: "on-coral" },
    { href: "#steps", label: "진행 절차", tone: "on-deep" },
    { href: "#faq", label: "자주 묻는 질문", tone: "on-ink" },
    { href: "#inquiry", label: "대관 문의", tone: "on-blue" },
  ], []);

  return (
    <ChapterPage>
      <header className="ch-hero">
        <div className="ch-panel">
          <img className="ch-panel__photo" src="/images/insadong/street.jpg" alt="UNFRAME이 있는 서울 인사동 거리" fetchPriority="high" />
          <div className="ch-panel__scrim" />
          <div>
            <button type="button" className="ch-back" onClick={onBack}><ArrowLeft size={18} /> 메인으로</button>
            <h1 className="ch-display" style={{ marginTop: 20 }}>인사동 108호를<br />당신의 전시로</h1>
            <p style={{ marginTop: 20, maxWidth: "46ch" }}>
              UNFRAME의 공간을 전시, 팝업, 촬영, 토크에 빌려 드립니다. 일정과 비용은 문의 후 함께 정합니다.
            </p>
          </div>
          <form
            className="ch-plate"
            aria-label="문패에 전시 제목 걸어 보기"
            onSubmit={(event) => { event.preventDefault(); toInquiry(); }}
          >
            <span className="ch-plate__room" aria-hidden="true">108</span>
            <div className="ch-plate__body">
              <output className="ch-plate__sign" htmlFor="rental-title">{trimmedTitle || "당신의 전시 제목"}</output>
              <div className="ch-plate__row">
                <input
                  id="rental-title"
                  className="ch-plate__input"
                  value={title}
                  maxLength={40}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="전시 제목을 입력해 문패에 걸어 보세요"
                  aria-label="전시 제목"
                />
                <button type="submit" className="ch-btn ch-btn--blue">대관 문의하기 <ArrowRight size={18} /></button>
              </div>
            </div>
          </form>
        </div>
        <nav className="ch-swatches" aria-label="이 페이지 안내">
          {swatches.map((swatch) => (
            <a key={swatch.href} href={swatch.href} className={`ch-swatch ${swatch.tone}`}>{swatch.label}</a>
          ))}
        </nav>
      </header>

      <VenueEvents events={events} onContinue={toInquiry} />

      <section id="support" className="ch-field on-paper">
        <div className="ch-mosaic">
          <div className="ch-tile ch-tile--photo t-6-5 rv">
            <img src="/images/insadong/insadong-gil.jpg" alt="공방과 화랑이 늘어선 인사동길" loading="lazy" />
          </div>
          <div className="ch-tile on-white t-6-3 rv" style={{ "--i": 1 }}>
            <h2 className="ch-title">공간만 빌려주지<br />않습니다</h2>
            <p>전시 프로그램에는 인사동 한가운데의 공간과 함께 운영, 홍보, 기록이 들어 있습니다. 어디까지 맡길지는 문의서에서 고르면 됩니다.</p>
          </div>
          <div className="ch-tile on-lime t-3-2 rv" style={{ "--i": 2 }}>
            <p className="ch-sub">Curatorial Note</p>
            <p className="ch-small">작품 세계를 전하는 글을 모든 전시 프로그램에 담습니다.</p>
          </div>
          <div className="ch-tile on-coral t-3-2 rv" style={{ "--i": 3 }}>
            <p className="ch-sub">Exhibition OST</p>
            <p className="ch-small">전시를 위한 음악도 모든 전시 프로그램에 포함됩니다.</p>
          </div>
          <div className="ch-tile on-ink t-3-3 rv">
            <p className="ch-figure">1시간</p>
            <p>작가와 귀빈을 위한 무료 주차</p>
          </div>
          <div className="ch-tile on-white t-3-3 rv" style={{ "--i": 1 }}>
            <p className="ch-sub">전시 장비</p>
            <ul className="ch-list">
              <li>레일 스포트라이트</li>
              <li>미디어 프로젝터</li>
              <li>사운드 시스템</li>
            </ul>
          </div>
          <div className="ch-tile on-blue t-6-3 rv" style={{ "--i": 2 }}>
            <p className="ch-title">디렉터가 전시장에 있습니다</p>
            <p>전시 기간 동안 관람객 응대, 작품 보호와 구매 문의를 전문 디렉터가 직접 맡습니다.</p>
          </div>
          <div className="ch-tile on-deep t-6-3 rv">
            <p className="ch-sub">알리는 일과 여는 날</p>
            <p>SNS 공식 채널 게시, 현수막과 엽서 제작을 지원하고, 오프닝 리셉션의 다과를 함께 준비합니다.</p>
          </div>
          <div className="ch-tile on-white t-6-3 rv" style={{ "--i": 1 }}>
            <p className="ch-sub">작가님이 준비하실 일</p>
            <ul className="ch-list">
              <li>작품 포장, 운송, 설치와 철수, 공간 원상복구</li>
              <li>홍보물을 위한 고화질 작품 사진, 작가 노트, 캡션 목록</li>
              <li>작품 보험은 선택이며, 갤러리는 고의나 중과실이 없는 한 파손과 도난에 책임을 지지 않습니다</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="programs">
        <div className="ch-field on-white" style={{ paddingBottom: 48 }}>
          <div className="ch-intro" style={{ marginBottom: 0 }}>
            <h2 className="ch-title rv">전시 프로그램 네 가지</h2>
            <p className="rv" style={{ "--i": 1 }}>어디까지 함께할지에 따라 네 가지로 나눴습니다. 금액은 기본 운영 범위 기준이며, 전시 기간과 세부 조건은 문의 후 안내드립니다.</p>
          </div>
        </div>
        <div className="ch-programs">
          {PROGRAMS.map((program, index) => (
            <article key={program.id} className={`ch-program ${PROGRAM_FIELDS[index]}`}>
              <div>
                <h3 className="ch-sub rv" style={{ fontSize: "clamp(26px, 2.5vw, 38px)", fontWeight: 800 }}>{program.name}</h3>
                <p className="rv" style={{ "--i": 1, marginTop: 8, fontWeight: 600 }}>{program.subtitle}</p>
                <p className="rv" style={{ "--i": 2, marginTop: 16 }}>{program.description}</p>
                <ul className="ch-list rv" style={{ "--i": 3 }}>
                  {program.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </div>
              <div className="rv" style={{ "--i": 4 }}>
                <p className="ch-program__price">{program.price}<small>만원</small></p>
                <button
                  type="button"
                  className={`ch-btn ${PROGRAM_BUTTONS[index]}`}
                  style={{ marginTop: 20, width: "100%" }}
                  onClick={() => toInquiry({ purpose: "전시", supportScope: `전시 프로그램: ${program.name}` })}
                >
                  이 프로그램으로 문의
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="ch-band on-deep">
          <div>
            <p className="ch-sub">공간만 필요하다면</p>
            <p style={{ marginTop: 8 }}>촬영, 팝업, 쇼룸, 토크와 워크숍은 공간 이용으로 문의해 주세요. 목적과 기간에 맞춰 견적을 드립니다.</p>
          </div>
          <button type="button" className="ch-btn ch-btn--lime" onClick={() => toInquiry({ supportScope: "공간 이용" })}>
            공간 이용 문의 <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <section id="steps" className="ch-field on-paper">
        <div className="ch-intro">
          <h2 className="ch-title rv">문의에서 철수까지</h2>
          <p className="rv" style={{ "--i": 1 }}>문의서를 보낸다고 일정이 잡히지는 않습니다. 함께 검토하고 조건을 정한 뒤 계약으로 확정합니다.</p>
        </div>
        <Stages stages={STAGES} />
      </section>

      <FaqTiles title="자주 묻는 질문" items={FAQ_ITEMS} />

      <section id="inquiry" className="ch-close">
        <div className="ch-close__side"><img src="/images/insadong/pavilion.jpg" alt="인사동의 전통 정자와 건물" loading="lazy" /></div>
        <div className="ch-close__main on-blue">
          <h2 className="ch-title rv">{trimmedTitle ? `${trimmedTitle}, 108호에서` : "108호에서 무엇을 여시겠어요?"}</h2>
          <p className="rv" style={{ "--i": 1 }}>{VENUE_ADDRESS}. 정해진 만큼만 적어 보내 주세요.</p>
          <div className="rv" style={{ "--i": 2 }}>
            <button type="button" className="ch-btn ch-btn--lime" onClick={() => toInquiry()}>대관 문의하기 <ArrowRight size={18} /></button>
          </div>
        </div>
        <div className="ch-close__side"><img src="/images/insadong/annyeong.jpg" alt="인사동의 복합 문화 건물" loading="lazy" /></div>
      </section>

      <MarkFooter />
    </ChapterPage>
  );
}
