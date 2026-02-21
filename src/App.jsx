import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc,
  updateDoc,
  increment,
  query,
  orderBy,
  limit,
  deleteDoc,
  getDoc,
  where,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { Send, Settings, Smartphone, Monitor, Heart, Sparkles, BrainCircuit, Download, CheckCircle2, UserCircle, MessageSquare, X, Trash2, Sliders, AlertCircle, BarChart3, FileJson, History, Info, Gift, Calendar, Check, Ban, ArrowRight, UserCheck, Briefcase, LogOut, User, RefreshCw } from 'lucide-react';

/**
 * [환경 변수 로딩 최적화]
 * Vite는 빌드 시점에 import.meta.env.VITE_... 형태의 문자열을 정적으로 찾아 실제 값으로 치환합니다.
 * 이 과정에서 발생하는 컴파일 경고를 방지하기 위해 Canvas 환경과 로컬 환경을 엄격히 분리하여 참조합니다.
 */
const isCanvas = typeof __firebase_config !== 'undefined';

// 로컬 Vite 환경에서만 import.meta.env를 참조하도록 구성
const getLocalFirebaseConfig = () => {
  if (isCanvas) return {};
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
};

const firebaseConfig = isCanvas ? JSON.parse(__firebase_config) : getLocalFirebaseConfig();
const geminiApiKey = isCanvas ? "" : import.meta.env.VITE_GEMINI_API_KEY;

let app, auth, db;
// API Key가 정상적으로 주입되었는지 체크 (치환 실패 시 빈 값 방지)
const isValidKey = isCanvas || (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 20);

if (isValidKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase 초기화 에러:", e);
  }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'unframe-interactive-wall';

const BASE_THEMES = {
  POSITIVE: { r: 0, g: 74, b: 173, label: 'Joy', color: '#004aad' },
  CALM: { r: 45, g: 212, b: 191, label: 'Calm', color: '#2dd4bf' },
  ENERGETIC: { r: 245, g: 158, b: 11, label: 'Power', color: '#f59e0b' },
  DEEP: { r: 139, g: 92, b: 246, label: 'Deep', color: '#8b5cf6' }
};

const loadExternalLibs = async () => {
  const loadScript = (id, src) => new Promise((resolve) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement('script');
    s.id = id; s.src = src; s.onload = resolve;
    document.head.appendChild(s);
  });
  await Promise.all([
    loadScript('confetti-lib', "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"),
    loadScript('html-to-image-lib', "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js")
  ]);
};

export default function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get('view') || 'input');
  const [showSuccess, setShowSuccess] = useState(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);
    loadExternalLibs();
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!db) return;
    const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appSettings');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data());
    });
    const msgCollection = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubscribeMsgs = onSnapshot(msgCollection, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => { unsubscribeSettings(); unsubscribeMsgs(); };
  }, []);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) { console.error("Login Failed:", error); }
  };

  const handleLogout = () => auth && signOut(auth);

  const updateMessageStatus = async (msgId, status) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', msgId), { status });
    } catch (e) { console.error(e); }
  };

  const deleteMessage = async (msgId) => {
    if (!db || !window.confirm("이 메시지를 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', msgId));
    } catch (e) { console.error(e); }
  };

  const clearAllMessages = async () => {
    if (!db || !window.confirm("모든 메시지를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  if (!isValidKey && !isCanvas) {
    return (
      <div className="min-h-screen bg-[#f3efea] flex flex-col items-center justify-center p-8 text-center font-sans text-[#004aad]">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-neutral-100 max-w-lg animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="text-amber-500 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black mb-4 italic tracking-tight uppercase leading-none">Environment Check</h1>
          <p className="text-neutral-500 mb-8 leading-relaxed font-medium">
            환경 변수를 인식하지 못하고 있습니다. <br/>
            반드시 <span className="text-[#004aad] font-bold">터미널 종료 후 npm run dev</span>를 다시 실행해 주세요.
          </p>
          
          <div className="text-left space-y-3 bg-neutral-50 p-6 rounded-2xl border border-neutral-100 mb-8 font-mono text-[10px]">
            <div className="flex justify-between border-b border-neutral-200 pb-2 uppercase font-bold text-neutral-400"><span>Key List</span><span>Status</span></div>
            <div className="flex justify-between"><span>Firebase API Key</span><span className={firebaseConfig.apiKey ? "text-emerald-500 font-black" : "text-red-400 font-black"}>{firebaseConfig.apiKey ? "● DETECTED" : "○ MISSING"}</span></div>
            <div className="flex justify-between"><span>Gemini API Key</span><span className={geminiApiKey ? "text-emerald-500 font-black" : "text-red-400 font-black"}>{geminiApiKey ? "● DETECTED" : "○ MISSING"}</span></div>
          </div>

          <button onClick={() => window.location.reload()} className="w-full bg-[#004aad] text-white py-5 rounded-full font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-blue-100 transition-all uppercase tracking-widest italic">
            <RefreshCw size={20} /> Reload App
          </button>
        </div>
      </div>
    );
  }

  if (!settings) return <div className="min-h-screen bg-[#f3efea] flex flex-col items-center justify-center gap-4 text-[#004aad]"><div className="w-12 h-12 border-[3px] border-[#004aad] border-t-transparent rounded-full animate-spin"></div><p className="font-black text-[10px] tracking-widest uppercase italic">Establishing Presence...</p></div>;

  return (
    <div className="min-h-screen bg-[#f3efea] text-[#111] overflow-hidden font-sans selection:bg-[#004aad] selection:text-white">
      {view === 'input' && (
        <VisitorFlow 
          settings={settings} 
          messages={messages} 
          user={user} 
          onLogin={handleGoogleLogin}
          onLogout={handleLogout}
          onSuccess={(data) => setShowSuccess(data)}
        />
      )}
      {view === 'display' && <DisplayWall settings={settings.display} messages={messages} />}
      {view === 'admin' && (
        <AdminPanel 
          settings={settings} 
          messages={messages}
          onUpdate={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'appSettings'), s)} 
          onUpdateStatus={updateMessageStatus}
          onDelete={deleteMessage}
          onClearAll={clearAllMessages}
          onBack={() => setView('display')} 
        />
      )}

      {showSuccess && <SuccessTicket data={showSuccess} displaySettings={settings.display} onClose={() => setShowSuccess(null)} />}
      
      <style>{`
        @keyframes float-down {
          0% { transform: translateY(-120%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
        @keyframes highlight-pulse {
          0%, 100% { background-color: rgba(0, 74, 173, 0.1); }
          50% { background-color: rgba(0, 74, 173, 0.2); }
        }
        .animate-float { animation: float-down linear infinite; }
        .ticket-mask { 
          mask-image: radial-gradient(circle at 0% 65%, transparent 15px, black 16px), 
                      radial-gradient(circle at 100% 65%, transparent 15px, black 16px); 
          -webkit-mask-image: radial-gradient(circle at 0% 65%, transparent 15px, black 16px), 
                              radial-gradient(circle at 100% 65%, transparent 15px, black 16px);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// --- Component: 관객 참여 플로우 ---
function VisitorFlow({ settings, messages, user, onLogin, onLogout, onSuccess }) {
  const [step, setStep] = useState('landing'); 
  const [role, setRole] = useState(null);
  const [text, setText] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const myMessages = useMemo(() => {
    if (!user) return [];
    return messages.filter(m => m.userId === user.uid).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }, [messages, user]);

  const handleJoinClick = () => {
    if (!user) { onLogin(); } 
    else { setStep('role'); scrollToTop(); }
  };

  useEffect(() => {
    if (user && step === 'landing') { setStep('role'); scrollToTop(); }
  }, [user]);

  const handleRoleSelect = (r) => {
    setRole(r);
    setStep('form');
    scrollToTop();
  };

  const getApprovedRanges = useMemo(() => {
    return messages
      .filter(m => m.status === 'approved')
      .map(m => {
        const start = new Date(m.reservationDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end, role: m.role };
      });
  }, [messages]);

  const isDateOccupied = (dateStr) => {
    const d = new Date(dateStr);
    return getApprovedRanges.find(range => d >= range.start && d <= range.end);
  };

  const isInSelectedRange = (dateStr) => {
    if (!selectedDate) return false;
    const start = new Date(selectedDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  const calendarDates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(d.toISOString().split('T')[0]);
    }
    return arr;
  }, []);

  const callGeminiAI = async (inputText) => {
    const modelId = "gemini-1.5-flash";
    const systemPrompt = `Analyze mood for art exhibition. JSON format: {"POSITIVE": score, "CALM": score, "ENERGETIC": score, "DEEP": score}. Total 100.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nText: "${inputText}"` }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (response.ok) {
        const res = await response.json();
        const clean = res.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(clean);
      }
      throw new Error();
    } catch (e) {
      return { POSITIVE: 30, CALM: 30, ENERGETIC: 20, DEEP: 20 };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedDate || isAnalyzing || !user) return;
    setIsAnalyzing(true);
    const scores = await callGeminiAI(text);
    const msgData = {
      text,
      reservationDate: selectedDate,
      role,
      timestamp: serverTimestamp(),
      scores,
      likes: 0,
      userId: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      status: 'pending'
    };
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), msgData);
      onSuccess({ ...msgData, id: docRef.id });
      setStep('landing');
      setText('');
      setSelectedDate(null);
      scrollToTop();
    } finally { setIsAnalyzing(false); }
  };

  if (step === 'landing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center animate-in fade-in duration-1000">
        <div className="w-16 h-px bg-[#004aad] mb-10"></div>
        <h1 className="text-5xl font-black tracking-tighter text-[#004aad] mb-6 italic leading-none uppercase">Unframe<br/>Collective</h1>
        <p className="text-neutral-500 max-w-xs mb-12 font-medium leading-relaxed italic">프레임 너머의 시선을 연결합니다.</p>
        <button onClick={handleJoinClick} className="group flex items-center gap-4 bg-[#004aad] text-white px-10 py-6 rounded-full font-bold text-xl shadow-2xl shadow-blue-200 active:scale-95 transition-all">
          {user ? "신청 시작하기" : "구글로 시작하기"} <ArrowRight className="group-hover:translate-x-2 transition-transform" />
        </button>
        {user && <button onClick={() => { setStep('mypage'); scrollToTop(); }} className="mt-8 text-neutral-400 font-bold text-sm underline underline-offset-8 uppercase tracking-widest">My Traces</button>}
      </div>
    );
  }

  if (step === 'role') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3 mb-8 bg-white p-3 rounded-full border border-neutral-100 shadow-sm font-black text-[#004aad] text-xs">
          {user.photoURL && <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full border border-[#004aad]/20" />}
          <span>{user.displayName}님, 반갑습니다.</span>
        </div>
        <h2 className="text-3xl font-black text-[#004aad] mb-12 tracking-tight leading-tight uppercase italic">Select Role</h2>
        <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
          <button onClick={() => handleRoleSelect('artist')} className="flex items-center justify-between p-8 bg-white border-2 border-neutral-100 rounded-[2.5rem] hover:border-[#004aad] transition-all group text-left shadow-sm">
            <div><p className="text-[#004aad] font-black text-xl mb-1 uppercase tracking-tighter italic"><UserCheck size={20}/> Artist</p><p className="text-xs text-neutral-400 font-medium">나의 작품을 월에 투영합니다.</p></div>
            <div className="w-10 h-10 rounded-full bg-[#004aad]/5 group-hover:bg-[#004aad] transition-colors flex items-center justify-center text-[#004aad] group-hover:text-white"><ArrowRight size={18} /></div>
          </button>
          <button onClick={() => handleRoleSelect('planner')} className="flex items-center justify-between p-8 bg-white border-2 border-neutral-100 rounded-[2.5rem] hover:border-[#E24B23] transition-all group text-left shadow-sm">
            <div><p className="text-[#E24B23] font-black text-xl mb-1 uppercase tracking-tighter italic"><Briefcase size={20}/> Planner</p><p className="text-xs text-neutral-400 font-medium">전시의 기획 의도를 공유합니다.</p></div>
            <div className="w-10 h-10 rounded-full bg-[#E24B23]/5 group-hover:bg-[#E24B23] transition-colors flex items-center justify-center text-[#E24B23] group-hover:text-white"><ArrowRight size={18} /></div>
          </button>
        </div>
        <div className="flex gap-8 mt-12 text-neutral-400 font-bold text-[10px] uppercase tracking-widest">
          <button onClick={() => { setStep('mypage'); scrollToTop(); }}>My Page</button>
          <button onClick={onLogout} className="text-neutral-300 flex items-center gap-1"><LogOut size={12}/> Logout</button>
        </div>
      </div>
    );
  }

  if (step === 'mypage') {
    return (
      <div className="flex flex-col min-h-screen p-8 max-w-md mx-auto py-16 animate-in fade-in duration-500 text-[#004aad]">
        <header className="mb-10 flex justify-between items-center">
          <h2 className="text-3xl font-black tracking-tight italic uppercase">My Traces</h2>
          <button onClick={() => { setStep('landing'); scrollToTop(); }} className="p-3 bg-white rounded-full border border-neutral-100 shadow-sm text-neutral-400 hover:text-red-400"><X size={20}/></button>
        </header>
        <div className="space-y-6 overflow-y-auto max-h-[65vh] scrollbar-hide p-2 font-bold">
          {myMessages.length > 0 ? myMessages.map(m => (
            <div key={m.id} className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-white ${m.role === 'artist' ? 'bg-[#004aad]' : 'bg-[#E24B23]'}`}>{m.role}</div>
                <span className={`text-[10px] font-black uppercase italic ${m.status === 'approved' ? 'text-emerald-500' : m.status === 'canceled' ? 'text-red-400' : 'text-[#004aad]'}`}>
                  {m.status === 'approved' ? 'Confirmed' : m.status === 'canceled' ? 'Canceled' : 'Reviewing'}
                </span>
              </div>
              <p className="text-neutral-700 text-sm italic font-medium leading-relaxed">"{m.text}"</p>
              <div className="pt-5 border-t border-neutral-50 flex justify-between items-end">
                <div><p className="text-[8px] text-neutral-300 uppercase tracking-widest mb-1 font-black">Reserved Schedule</p><p className="text-xs font-black text-[#004aad] font-mono">{m.reservationDate} ~ 7 Days</p></div>
                {m.status === 'approved' && <div className="p-2.5 bg-[#004aad] rounded-full text-white shadow-lg shadow-blue-100"><CheckCircle2 size={18}/></div>}
              </div>
            </div>
          )) : <div className="py-20 text-center text-neutral-300 font-black"><p className="text-sm">신청 내역이 없습니다.</p></div>}
        </div>
        <button onClick={() => { setStep('role'); scrollToTop(); }} className="mt-12 w-full py-6 bg-[#004aad] text-white rounded-full font-black text-lg shadow-xl shadow-blue-200 italic uppercase tracking-tighter">Add New Trace</button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen p-8 max-w-md mx-auto py-16 animate-in fade-in duration-500`}>
      <header className="mb-10 flex justify-between items-start text-[#004aad]">
        <div>
          <div className="w-10 h-px bg-current mb-5"></div>
          <h1 className="text-2xl font-black mb-2 leading-tight tracking-tight uppercase italic">{role === 'artist' ? 'Artist Vision' : 'Planner Insight'}</h1>
          <p className="text-neutral-400 text-[10px] tracking-widest font-black uppercase font-mono">Schedule Slots</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter text-white italic ${role === 'artist' ? 'bg-[#004aad]' : 'bg-[#E24B23]'}`}>{role}</div>
      </header>

      <div className="mb-8 p-7 bg-[#004aad]/5 rounded-[2.5rem] border border-[#004aad]/10">
        <p className="text-[11px] font-black text-[#004aad] flex items-center gap-2 mb-2 uppercase tracking-wider italic">
          <Gift size={14} /> Aura Event Guide
        </p>
        <p className="text-xs text-neutral-600 leading-relaxed font-medium">
          메시지를 남기고 생성된 <span className="text-[#004aad] font-black italic">아우라 티켓</span>을 소장하세요. 추후 선정이 완료된 분들께 특별한 경험을 선물합니다.
        </p>
      </div>

      <div className="mb-10 space-y-6">
        <div className="p-7 bg-white rounded-[2.8rem] border border-neutral-100 shadow-xl shadow-neutral-200/40 text-[#004aad]">
          <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2 italic"><Calendar size={16}/> Select 7-Day Slot</h3>
          <div className="grid grid-cols-4 gap-3">
            {calendarDates.map(date => {
              const occupiedRange = isDateOccupied(date);
              const selected = selectedDate === date;
              const inRange = isInSelectedRange(date);
              let bgColor = "bg-white border-neutral-100 text-neutral-600 hover:border-neutral-300";
              let highlightStyle = {};

              if (occupiedRange) {
                const baseColor = occupiedRange.role === 'planner' ? '#E24B23' : '#004aad';
                highlightStyle = { backgroundColor: `${baseColor}10`, color: baseColor, borderColor: `${baseColor}20`, cursor: 'not-allowed', opacity: 0.6 };
              } else if (inRange) {
                const baseColor = role === 'planner' ? '#E24B23' : '#004aad';
                highlightStyle = { backgroundColor: baseColor, color: '#fff', borderColor: baseColor, transform: 'scale(1.08)' };
              }

              return (
                <button 
                  key={date}
                  disabled={!!occupiedRange}
                  onClick={() => setSelectedDate(date)}
                  style={highlightStyle}
                  className={`relative h-20 rounded-[1.5rem] flex flex-col items-center justify-center transition-all border text-[10px] font-bold ${bgColor} ${inRange && !occupiedRange ? 'z-10 shadow-xl' : ''}`}
                >
                  <span className="opacity-40 uppercase text-[8px] font-mono">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-base font-black font-mono">{new Date(date).getDate()}</span>
                  {selected && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg border border-neutral-100 animate-in zoom-in"><Check size={12} className="text-[#004aad] font-black"/></div>}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <div className="mt-8 p-5 bg-[#004aad]/5 rounded-3xl border border-dashed border-[#004aad]/20 text-center animate-in slide-in-from-bottom-2 duration-500">
              <p className="text-[11px] font-black text-[#004aad] font-mono mb-1">{selectedDate} ~ {new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 6)).toISOString().split('T')[0]}</p>
              <p className="text-[9px] text-neutral-400 font-black uppercase tracking-[0.2em] italic">Confirmed Week</p>
            </div>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-700">
        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-[2.5rem] p-8 h-56 focus:border-[#004aad] outline-none transition-all text-lg font-light shadow-sm" placeholder={settings.input.placeholder} maxLength={150} />
        <button disabled={!text.trim() || !selectedDate || isAnalyzing} className={`w-full py-6 rounded-full font-black text-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 shadow-2xl text-white italic uppercase tracking-tighter transition-all ${role === 'artist' ? 'bg-[#004aad] shadow-blue-100' : 'bg-[#E24B23] shadow-orange-100'}`}>
          <CheckCircle2 size={24} /> Register Trace
        </button>
      </form>
      <button onClick={() => { setStep('role'); scrollToTop(); }} className="mt-12 text-neutral-300 font-bold text-xs uppercase tracking-widest w-full italic hover:text-[#004aad] transition-colors">Change My Role</button>
    </div>
  );
}

// --- Component: 전시 메인 화면 (Approved Only) ---
function DisplayWall({ settings, messages }) {
  const approvedMessages = useMemo(() => messages.filter(m => m.status === 'approved'), [messages]);
  return (
    <div className="relative w-full h-screen bg-[#f3efea] flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,74,173,0.05)_0%,transparent_80%)] z-0"></div>
      <div className="relative z-30 flex flex-col items-center pointer-events-none px-12 max-w-7xl text-center">
        <div className="bg-[#f3efea]/90 backdrop-blur-xl p-20 rounded-[5rem] border border-[#004aad]/5 shadow-2xl shadow-[#004aad]/10 text-[#004aad]">
          <h2 style={{ fontSize: settings.questionSize || '72px' }} className="font-light mb-12 tracking-tighter leading-tight uppercase italic drop-shadow-sm">{settings.question}</h2>
          <div className="flex items-center justify-center gap-10 opacity-30 font-black">
            <div className="h-px w-32 bg-current"></div>
            <p className="text-3xl tracking-[0.5em] uppercase font-light italic">{settings.subtitle}</p>
            <div className="h-px w-32 bg-current"></div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {approvedMessages.map((msg, i) => <MessageCard key={msg.id + i} msg={msg} index={i} />)}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f3efea] to-transparent z-40 pointer-events-none"></div>
    </div>
  );
}

function MessageCard({ msg, index }) {
  const [pos, setPos] = useState({ x: Math.random() * 80 + 10, rot: Math.random() * 10 - 5 });
  const handleIteration = () => setPos({ x: Math.random() * 80 + 10, rot: Math.random() * 10 - 5 });
  const mixedColor = useMemo(() => {
    const s = msg.scores || { POSITIVE: 25, CALM: 25, ENERGETIC: 25, DEEP: 25 };
    const r = (s.POSITIVE * BASE_THEMES.POSITIVE.r + s.CALM * BASE_THEMES.CALM.r + s.ENERGETIC * BASE_THEMES.ENERGETIC.r + s.DEEP * BASE_THEMES.DEEP.r) / 100;
    const g = (s.POSITIVE * BASE_THEMES.POSITIVE.g + s.CALM * BASE_THEMES.CALM.g + s.ENERGETIC * BASE_THEMES.ENERGETIC.g + s.DEEP * BASE_THEMES.DEEP.g) / 100;
    const b = (s.POSITIVE * BASE_THEMES.POSITIVE.b + s.CALM * BASE_THEMES.CALM.b + s.ENERGETIC * BASE_THEMES.ENERGETIC.b + s.DEEP * BASE_THEMES.DEEP.b) / 100;
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }, [msg.scores]);

  return (
    <div onAnimationIteration={handleIteration} className="absolute p-12 rounded-[3rem] border border-[#004aad]/5 backdrop-blur-3xl animate-float transition-all duration-700 z-0" style={{ left: `${pos.x}%`, animationDuration: `${30 + (index % 8) * 5}s`, animationDelay: `${(index % 15) * 2}s`, backgroundColor: 'rgba(255, 255, 255, 0.65)', boxShadow: `0 0 50px ${mixedColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}`, transform: `rotate(${pos.rot}deg)`, maxWidth: '420px' }}>
      <div className={`mb-4 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter text-white inline-block shadow-sm ${msg.role === 'artist' ? 'bg-[#004aad]' : 'bg-[#E24B23]'}`}>{msg.role}</div>
      <p className="text-2xl font-light leading-relaxed text-[#004aad] mb-8 font-bold tracking-tight">"{msg.text}"</p>
      <div className="flex items-center justify-between opacity-30">
        <div className="flex flex-wrap gap-2">{msg.scores && Object.entries(msg.scores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k, _]) => (<div key={k} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: `rgb(${BASE_THEMES[k].r}, ${BASE_THEMES[k].g}, ${BASE_THEMES[k].b})` }}></div><span className="text-[9px] font-mono tracking-widest uppercase font-black">{BASE_THEMES[k].label}</span></div>))}</div>
      </div>
    </div>
  );
}

// --- Component: 축포 및 티켓 저장 ---
function SuccessTicket({ data, displaySettings, onClose }) {
  const ticketRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { if (window.confetti) window.confetti({ particleCount: 200, spread: 90, origin: { y: 0.7 }, colors: ['#004aad', '#f3efea', '#E24B23', '#8b5cf6'], ticks: 300 }); }, []);
  const saveTicket = async () => {
    const node = ticketRef.current;
    if (!node || !window.htmlToImage) return;
    setIsSaving(true);
    try {
      const dataUrl = await window.htmlToImage.toPng(node, { pixelRatio: 4, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Unframe-Ticket-${data.id.slice(0, 5).toUpperCase()}.png`;
      link.href = dataUrl; link.click();
    } catch (e) { console.error(e); }
    setIsSaving(false);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#f3efea]/95 backdrop-blur-2xl animate-in fade-in duration-500 font-sans text-center overflow-y-auto">
      <div className="max-w-xs w-full flex flex-col items-center py-10">
        <div className="mb-10 animate-in slide-in-from-top-4 duration-700 text-[#004aad]"><CheckCircle2 className="w-14 h-14 mx-auto mb-5 animate-bounce" /><h2 className="text-2xl font-black tracking-tight uppercase italic leading-none">Registered</h2><p className="text-neutral-500 text-xs mt-2 font-black uppercase tracking-widest">7 Days Visualized Presence</p></div>
        <div ref={ticketRef} className="relative w-full bg-white rounded-[2.8rem] overflow-hidden shadow-2xl border border-neutral-100 ticket-mask p-10 flex flex-col gap-10 text-[#004aad] min-h-105">
          <div className="flex justify-between items-start text-left"><div><p className="text-[10px] text-neutral-400 font-mono uppercase tracking-[0.3em] font-black leading-none italic">Passport</p><h3 className="text-3xl font-black tracking-tighter text-[#004aad] mt-2 italic leading-none uppercase">{displaySettings.subtitle?.split(':')[0] || "UNFRAME"}</h3></div><div className={`w-16 h-16 rounded-full blur-3xl opacity-70 ${data.role === 'artist' ? 'bg-[#004aad]' : 'bg-[#E24B23]'}`}></div></div>
          <div className="h-px w-full border-dashed border-t border-neutral-100"></div>
          <div className="space-y-5 text-left font-black"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${data.role === 'artist' ? 'bg-[#004aad]' : 'bg-[#E24B23]'}`}></div><p className="text-[11px] text-neutral-400 uppercase tracking-widest leading-none italic">Identity Trace</p></div><p className="text-lg font-light leading-relaxed italic text-neutral-800 line-clamp-6">"{data.text}"</p></div>
          <div className="mt-auto pt-10 flex justify-between items-end border-t border-neutral-50 text-left font-black"><div><p className="text-[9px] text-neutral-300 uppercase text-[#004aad] mb-1">Verification</p><p className="text-[11px] text-neutral-400 font-mono">#{data.id.slice(0,10).toUpperCase()}</p></div><div className="text-right leading-tight"><p className="text-[9px] text-neutral-300 uppercase mb-1 font-black">Period</p><p className="text-[11px] text-[#004aad] font-mono">{data.reservationDate.slice(5)} ~</p></div></div>
        </div>
        <div className="mt-12 flex gap-4 w-full"><button onClick={saveTicket} disabled={isSaving} className="flex-1 bg-[#004aad] text-white py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all italic uppercase tracking-tighter"><Download size={22} /> {isSaving ? "Wait..." : "Save"}</button><button onClick={onClose} className="w-16 h-16 bg-white border border-neutral-100 text-neutral-300 rounded-[2rem] flex items-center justify-center active:scale-95 transition-all"><X size={28} /></button></div>
      </div>
    </div>
  );
}

// --- Component: 관리자 페이지 ---
function AdminPanel({ settings, messages, onUpdate, onUpdateStatus, onDelete, onBack }) {
  const [local, setLocal] = useState(settings);
  const [tab, setTab] = useState('settings');
  const handleChange = (section, field, value) => setLocal(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  return (
    <div className="p-16 max-w-7xl mx-auto space-y-12 font-sans h-screen overflow-y-auto pb-40 text-neutral-800 animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-10 font-black uppercase italic"><h1 className="text-4xl tracking-tight text-[#004aad] leading-none">Management</h1><div className="flex gap-4"><div className="flex bg-white rounded-full p-1 border border-neutral-200 shadow-sm"><button onClick={() => setTab('settings')} className={`px-8 py-3 rounded-full text-xs font-black transition-all ${tab === 'settings' ? 'bg-[#004aad] text-white shadow-lg' : 'text-neutral-400'}`}>Settings</button><button onClick={() => setTab('messages')} className={`px-8 py-3 rounded-full text-xs font-black transition-all ${tab === 'messages' ? 'bg-[#004aad] text-white shadow-lg' : 'text-neutral-400'}`}>Judgement</button></div><button onClick={onBack} className="px-8 py-3 border border-neutral-200 bg-white rounded-full text-xs font-black text-neutral-400 hover:text-[#004aad] transition-all">Exit</button></div></div>
      {tab === 'settings' ? (
        <div className="grid md:grid-cols-2 gap-12 font-black"><div className="bg-white/60 p-12 rounded-[4rem] border border-neutral-100 shadow-xl space-y-12"><h2 className="text-[#004aad] text-xs font-black uppercase tracking-widest border-b border-neutral-100 pb-5 flex items-center gap-3"><Monitor size={18}/> Wall Display</h2><AdminField label="Main Question" value={local.display.question} onChange={v => handleChange('display', 'question', v)} /><div className="space-y-5 font-black"><label className="text-[10px] text-neutral-400 uppercase tracking-widest flex justify-between font-black italic">Font Size <span>{local.display.questionSize}</span></label><input type="range" min="30" max="150" value={parseInt(local.display.questionSize) || 72} onChange={e => handleChange('display', 'questionSize', `${e.target.value}px`)} className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-[#004aad]" /></div><AdminField label="Subtitle" value={local.display.subtitle} onChange={v => handleChange('display', 'subtitle', v)} /><button onClick={async () => { await onUpdate(local); alert('Updated!'); }} className="w-full bg-[#004aad] text-white py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-blue-100 uppercase tracking-widest italic">Apply Configuration</button></div><div className="bg-white/60 p-12 rounded-[4rem] border border-neutral-100 shadow-xl space-y-10 flex flex-col font-black"><h2 className="text-emerald-600 text-xs font-black uppercase tracking-widest border-b border-neutral-100 pb-5 flex items-center gap-3"><Smartphone size={18}/> Visitor App</h2><AdminField label="App Title" value={local.input.question} onChange={v => handleChange('input', 'question', v)} /><AdminField label="Description" value={local.input.subtitle} onChange={v => handleChange('input', 'subtitle', v)} /><AdminField label="Placeholder" value={local.input.placeholder} onChange={v => handleChange('input', 'placeholder', v)} /></div></div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500 font-black"><h2 className="text-2xl font-black text-[#004aad] flex items-center gap-4 italic uppercase"><MessageSquare size={28} /> Review & Judgement ({messages.length})</h2>
          <div className="bg-white/80 rounded-[3.5rem] border border-neutral-100 shadow-xl overflow-hidden backdrop-blur-md"><table className="w-full text-left text-sm border-collapse"><thead className="bg-neutral-50 text-neutral-400 text-[11px] uppercase font-black border-b border-neutral-100"><tr><th className="p-8">Reserved Week</th><th className="p-8">User Identity</th><th className="p-8">Trace Content</th><th className="p-8">Role</th><th className="p-8 text-center">Status</th><th className="p-8 text-center">Action</th></tr></thead>
              <tbody className="divide-y divide-neutral-50 font-black">{messages.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map(msg => (<tr key={msg.id} className={`transition-colors text-neutral-600 font-black ${msg.status === 'approved' ? 'bg-[#004aad]/[0.02]' : 'opacity-60'}`}><td className="p-8 font-mono text-[11px] text-[#004aad] font-black">{msg.reservationDate}</td><td className="p-8 flex items-center gap-3 font-black text-[11px] truncate max-w-[150px]"><img src={msg.userPhoto} className="w-7 h-7 rounded-full shadow-sm" alt="u" /> {msg.userName}</td><td className="p-8 leading-relaxed max-w-sm truncate text-neutral-700 italic font-medium font-sans">"{msg.text}"</td><td className="p-8 uppercase text-[10px] tracking-widest italic">{msg.role}</td><td className="p-8 text-center uppercase font-black tracking-tighter"><span className={`text-[10px] px-3 py-1 rounded-full text-white shadow-sm ${msg.status === 'approved' ? 'bg-emerald-400' : msg.status === 'canceled' ? 'bg-red-400' : 'bg-[#004aad]'}`}>{msg.status || 'pending'}</span></td><td className="p-8"><div className="flex justify-center gap-4">{msg.status !== 'approved' && <button onClick={() => onUpdateStatus(msg.id, 'approved')} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm"><Check size={20} /></button>}{msg.status !== 'canceled' && <button onClick={() => onUpdateStatus(msg.id, 'canceled')} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all shadow-sm"><Ban size={20} /></button>}<button onClick={() => onDelete(msg.id)} className="p-3 text-neutral-300 hover:text-red-600 rounded-xl transition-all"><Trash2 size={20} /></button></div></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminField({ label, value, onChange }) {
  return (
    <div className="space-y-3 font-black text-[#004aad]"><label className="text-[11px] text-neutral-400 uppercase tracking-[0.2em] ml-1 font-black italic">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full bg-neutral-50 border border-neutral-100 p-6 rounded-3xl outline-none focus:border-[#004aad] transition-all font-black text-[#004aad] font-sans shadow-inner" /></div>
  );
}