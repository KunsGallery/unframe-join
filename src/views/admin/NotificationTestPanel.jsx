import React, { useEffect, useState } from "react";
import { Check, CircleSlash, Loader2, Send, TriangleAlert } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { auth } from "../../lib/firebase";

const PHONE_STORAGE_KEY = "admin-test-phone";
const FIELD = "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]";

const SAMPLE = {
  applicantName: "[테스트] 홍길동",
  exhibitionTitle: "[테스트] 전시 제안",
  selectedDate: "2027-03-02",
  selectedProgram: { name: "UN-FRAME", price: 280 },
  partnerType: "artist",
  applicationId: "test",
};

const REVIEW_REQUEST = "테스트 발송입니다. 포트폴리오와 대표작 이미지를 보완해 주세요.";
const REVIEW_MAIL_EXTRAS = {
  approved: {},
  rejected: { rejectionReason: "테스트 발송입니다.", reviewSummary: "테스트 발송입니다.", improvementSuggestions: "테스트 발송입니다." },
  additional_requested: { requestMessage: REVIEW_REQUEST },
};

const GROUPS = [
  {
    id: "open-call",
    label: "오픈콜",
    scenarios: [
      {
        id: "open-call-received",
        title: "지원서가 접수되었을 때",
        pick: "openCall",
        flow: ["지원자에게 접수 메일", "운영자에게 새 지원 메일", "지원자에게 접수 알림톡"],
      },
    ],
  },
  {
    id: "rental",
    label: "대관 문의",
    scenarios: [{ id: "rental-received", title: "대관 문의가 접수되었을 때", flow: ["운영자에게 문의 내용 메일", "문의자에게 접수 알림톡"] }],
  },
  {
    id: "collaboration",
    label: "협업 제안",
    scenarios: [{ id: "collaboration-received", title: "협업 제안이 접수되었을 때", flow: ["운영자에게 제안 내용 메일", "문의자에게 접수 알림톡"] }],
  },
  {
    id: "salon",
    label: "SALON",
    scenarios: [
      { id: "salon-approval", title: "참가를 확정했을 때", pick: "salon", flow: ["참가자에게 확정 알림톡"], hint: "알림톡의 입장 패스 링크는 테스트용이라 열리지 않습니다." },
      { id: "salon-welcome", title: "현장에서 입장했을 때", pick: "salon", flow: ["참가자에게 환영 알림톡"] },
    ],
  },
  {
    id: "review",
    label: "심사 결과",
    scenarios: [
      { id: "approved", title: "승인했을 때", review: true, flow: ["신청자에게 승인 메일", "신청자에게 승인 알림톡"] },
      { id: "rejected", title: "미선정했을 때", review: true, flow: ["신청자에게 미선정 메일", "신청자에게 미선정 알림톡"] },
      { id: "additional_requested", title: "추가 자료를 요청할 때", review: true, flow: ["신청자에게 요청 메일", "신청자에게 요청 알림톡"] },
    ],
  },
];

const readStoredPhone = () => {
  try {
    return window.localStorage.getItem(PHONE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

const storePhone = (phone) => {
  try {
    window.localStorage.setItem(PHONE_STORAGE_KEY, phone);
  } catch {
    // Only remembering the number for next time is lost.
  }
};

const postFunction = async (name, body) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`/.netlify/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `발송에 실패했습니다. (${response.status})`);
  return data;
};

// Review results already run on these admin endpoints, so the test takes the same path.
const sendReviewScenario = async (type, email, phone) => {
  const send = async (channel, to, missing, run) => {
    const base = { channel, audience: "신청자", to };
    if (!to) return { ...base, status: "skipped", note: missing };
    try {
      await run();
      return { ...base, status: "sent" };
    } catch (error) {
      return { ...base, status: "failed", error: error.message };
    }
  };
  return Promise.all([
    send("메일", email, "받을 메일 주소를 입력하지 않았습니다.", () =>
      postFunction("send-application-status-email", { type, ...SAMPLE, applicantEmail: email, ...REVIEW_MAIL_EXTRAS[type] })
    ),
    send("알림톡", phone, "받을 휴대폰 번호를 입력하지 않았습니다.", () =>
      postFunction("send-kakao-alimtalk", { type, ...SAMPLE, to: phone, requestMessage: type === "additional_requested" ? REVIEW_REQUEST : "" })
    ),
  ]);
};

const STATUS = {
  sent: { label: "보냄", icon: Check, tone: "text-emerald-700" },
  skipped: { label: "보내지 않음", icon: CircleSlash, tone: "text-zinc-600" },
  failed: { label: "실패", icon: TriangleAlert, tone: "text-red-700" },
};

const SendResult = ({ item }) => {
  const status = STATUS[item.status];
  const Icon = status.icon;
  const variables = Object.entries(item.variables || {});

  return (
    <li className="border-t border-zinc-200 py-3 first:border-t-0">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Icon size={16} className={`shrink-0 ${status.tone}`} aria-hidden="true" />
        <span className={`font-semibold ${status.tone}`}>{status.label}</span>
        <span className="font-medium text-zinc-950">{item.audience} {item.channel}</span>
        {item.to ? <span className="text-zinc-600">→ {item.to}</span> : null}
      </p>
      {item.realRecipient && item.status === "sent" ? <p className="mt-1 text-sm text-zinc-600">실제로는 {item.realRecipient}로 갑니다. 테스트라 입력한 주소로 보냈습니다.</p> : null}
      {item.note ? <p className="mt-1 text-sm text-zinc-700">{item.note}</p> : null}
      {item.error ? <p className="mt-1 text-sm font-medium text-red-700 break-all">{item.error}</p> : null}
      {item.subject ? <p className="mt-1 text-sm text-zinc-700">제목: {item.subject}</p> : null}
      {item.templateId ? <p className="mt-1 break-all text-sm text-zinc-700">템플릿: <span className="font-mono text-xs">{item.templateId}</span></p> : null}
      {variables.length > 0 ? (
        <dl className="mt-2 grid gap-x-3 gap-y-1 rounded-lg bg-zinc-50 p-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          {variables.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-xs leading-5 text-zinc-600">{key}</dt>
              <dd className="mb-1 break-all text-zinc-950 sm:mb-0">{String(value) || <span className="text-zinc-500">비어 있음</span>}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
};

const ScenarioCard = ({ scenario, options, busy, result, onSend }) => {
  const [pickedId, setPickedId] = useState("");
  const list = scenario.pick ? options[scenario.pick] : [];
  const selectedId = pickedId || list[0]?.id || "";
  const pickLabel = scenario.pick === "openCall" ? "공고" : "SALON";
  const needsPick = Boolean(scenario.pick) && !selectedId;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h4 className="text-base font-bold text-zinc-950">{scenario.title}</h4>
      <ul className="mt-2 grid gap-1 text-sm text-zinc-700">
        {scenario.flow.map((line) => <li key={line}>{line}</li>)}
      </ul>
      {scenario.hint ? <p className="mt-2 text-sm text-zinc-600">{scenario.hint}</p> : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        {scenario.pick ? (
          <label className="min-w-0 flex-1 basis-56 text-sm font-semibold text-zinc-900">
            {pickLabel}
            <select className={`${FIELD} mt-1 font-normal`} value={selectedId} onChange={(event) => setPickedId(event.target.value)}>
              {list.length === 0 ? <option value="">등록된 {pickLabel}이 없습니다</option> : null}
              {list.map((item) => <option key={item.id} value={item.id}>{item.title || "제목 없음"}</option>)}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          disabled={busy || needsPick}
          onClick={() => onSend(scenario, selectedId)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {busy ? "보내는 중…" : "테스트 발송"}
        </button>
      </div>

      {result?.error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{result.error}</p> : null}
      {result?.sends ? (
        <ul role="status" className="mt-3 border-t border-zinc-200">
          {result.sends.map((item) => <SendResult key={`${item.audience}-${item.channel}`} item={item} />)}
        </ul>
      ) : null}
    </section>
  );
};

const NotificationTestPanel = ({ db, appId, user }) => {
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(readStoredPhone);
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [options, setOptions] = useState({ openCall: [], salon: [] });
  const [busyId, setBusyId] = useState("");
  const [results, setResults] = useState({});

  useEffect(() => {
    const watch = (name, key) =>
      onSnapshot(
        collection(db, "artifacts", appId, "public", "data", name),
        (snapshot) => setOptions((current) => ({ ...current, [key]: snapshot.docs.map((item) => ({ id: item.id, title: item.data().title })) })),
        (error) => console.error(error)
      );
    const stopOpenCalls = watch("openCalls", "openCall");
    const stopSalons = watch("salonEvents", "salon");
    return () => {
      stopOpenCalls();
      stopSalons();
    };
  }, [appId, db]);

  const handleSend = async (scenario, selectedId) => {
    const trimmedEmail = email.trim();
    const digits = phone.replace(/\D/g, "");
    storePhone(phone.trim());
    setBusyId(scenario.id);
    setResults((current) => ({ ...current, [scenario.id]: null }));
    try {
      if (!trimmedEmail && !digits) throw new Error("위에 받을 메일 주소나 휴대폰 번호를 입력해 주세요.");
      const sends = scenario.review
        ? await sendReviewScenario(scenario.id, trimmedEmail, digits)
        : (await postFunction("send-test-notification", {
            scenario: scenario.id,
            email: trimmedEmail,
            phone: digits,
            openCallId: scenario.pick === "openCall" ? selectedId : undefined,
            salonId: scenario.pick === "salon" ? selectedId : undefined,
          })).sends;
      setResults((current) => ({ ...current, [scenario.id]: { sends } }));
    } catch (error) {
      setResults((current) => ({ ...current, [scenario.id]: { error: error.message } }));
    } finally {
      setBusyId("");
    }
  };

  const group = GROUPS.find((item) => item.id === groupId);

  return (
    <div className="break-keep">
      <p className="text-sm leading-relaxed text-zinc-700">
        실제 발송과 같은 코드로 나가므로 메일과 알림톡이 실제로 도착하고, 알림톡은 건당 요금이 듭니다. 지원서나 문의는 저장되지 않습니다.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-zinc-900">
          받을 메일 주소
          <input type="email" className={`${FIELD} mt-1 font-normal`} value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-zinc-900">
          받을 휴대폰 번호
          <input type="tel" className={`${FIELD} mt-1 font-normal`} placeholder="010-0000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
      </div>

      <div role="tablist" aria-label="테스트 상황" className="mt-5 flex gap-1 overflow-x-auto border-b border-zinc-200">
        {GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === groupId}
            onClick={() => setGroupId(item.id)}
            className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-semibold ${item.id === groupId ? "border-zinc-950 text-zinc-950" : "border-transparent text-zinc-600 hover:text-zinc-950"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {group.scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            options={options}
            busy={busyId === scenario.id}
            result={results[scenario.id]}
            onSend={handleSend}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationTestPanel;
