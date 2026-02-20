import React, { useState, useEffect } from 'react';
import { 
  User, 
  Briefcase, 
  ArrowRight, 
  CheckCircle2, 
  Send,
  Sparkles,
  MapPin,
  Calendar,
  Globe,
  Info,
  Truck,
  FileText,
  ShieldCheck,
  Megaphone,
  Cpu,
  Coffee
} from 'lucide-react';

const App = () => {
  const [userType, setUserType] = useState(null); // 'artist' or 'partner'
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    link: '',
    message: '',
    period: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setUserType(null);
    setShowForm(false);
    setFormData({ name: '', email: '', phone: '', link: '', message: '', period: '' });
  };

  // 포인트 컬러 설정
  const pointColor = "#004aad";

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a] font-sans selection:bg-[#004aad] selection:text-white overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-white/70 backdrop-blur-lg border-b border-gray-100">
        <div className="text-2xl font-black tracking-tighter">UNFRAME</div>
        <div className="hidden md:flex space-x-12 text-[11px] font-bold tracking-[0.2em] text-gray-400">
          <button className="hover:text-black transition-colors">SPACE</button>
          <button className="hover:text-black transition-colors">ARCHIVE</button>
          <button className="text-black border-b-2 border-black pb-1">JOIN</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-48 pb-32 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#004aad]/5 rounded-full blur-3xl -z-10 animate-pulse" />
        
        <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <span className="text-[#004aad] uppercase tracking-[0.5em] text-xs font-bold mb-8 block">Collaboration & Rental</span>
          <h1 className="text-6xl md:text-9xl font-black uppercase leading-[0.9] mb-12 tracking-tighter">
            Start Your<br />Resonance
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-500 font-light leading-relaxed break-keep px-4">
            작가의 철학과 공간의 조화, 새로운 감각이 연결되는 순간.<br className="hidden md:block" />
            언프레임은 경계를 허무는 모든 창의적인 파트너를 기다립니다.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        
        {!showForm && !isSubmitted && (
          <>
            {/* Support Section */}
            <section className="mb-40">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-[#004aad] mb-4">What We Offer</h2>
                  <h3 className="text-4xl md:text-5xl font-black tracking-tight">🤝 UNFRAME 지원사항</h3>
                </div>
                <p className="text-gray-400 text-sm font-light">작가가 오직 작품에만 집중할 수 있는 환경을 제공합니다.</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SupportCard 
                  icon={<Megaphone size={32} />} 
                  title="홍보 및 큐레이션"
                  desc="SNS 채널 포스팅, 현수막/엽서 제작 지원 및 깊이 있는 작가 노트를 작성해 드립니다."
                />
                <SupportCard 
                  icon={<Cpu size={32} />} 
                  title="장비 및 설치"
                  desc="레일 스포트라이트, 고해상도 빔프로젝터, 스피커 등 전시를 위한 필수 장비를 제공합니다."
                />
                <SupportCard 
                  icon={<User size={32} />} 
                  title="전문 인력 상주"
                  desc="전문 디렉터가 상주하며 관람객 안내, 작품 보호, 구매 문의 응대를 책임집니다."
                />
                <SupportCard 
                  icon={<Coffee size={32} />} 
                  title="행사 및 편의"
                  desc="오프닝 리셉션 다과 세팅 지원 및 작가/내빈을 위한 무료 주차 서비스를 제공합니다."
                />
              </div>
            </section>

            {/* Preparation Section (Dark) */}
            <section className="full-bleed bg-[#1a1a1a] text-white py-32 px-12 rounded-[40px] mb-40">
              <div className="text-center mb-20">
                <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-[#004aad] mb-4">Preparation</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight">🧳 작가님 준비사항</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-16 max-w-5xl mx-auto">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Truck className="text-[#004aad]" />
                    <h4 className="text-xl font-bold">운송 및 철수</h4>
                  </div>
                  <p className="text-gray-400 font-light leading-relaxed break-keep">
                    작품의 운송, 포장, 설치 및 철수는 작가님 주관으로 진행됩니다. 전시 후 공간의 <span className="text-white">원상복구</span>를 부탁드립니다.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <FileText className="text-[#004aad]" />
                    <h4 className="text-xl font-bold">전시 정보 전달</h4>
                  </div>
                  <p className="text-gray-400 font-light leading-relaxed break-keep">
                    홍보를 위한 고화질 작품 사진, 최종 리스트, 작가 노트를 미리 전달해 주셔야 효과적인 마케팅이 가능합니다.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="text-[#004aad]" />
                    <h4 className="text-xl font-bold">작품 관리</h4>
                  </div>
                  <p className="text-gray-400 font-light leading-relaxed break-keep">
                    전시 중 파손/도난에 대비한 보험 가입은 선택 사항입니다. 갤러리는 고의나 중과실이 없는 한 책임을 지지 않습니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Pricing Section */}
            <section className="mb-40 grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-[#004aad] mb-8">Value of Partnership</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-8 break-keep">
                  예술적 실천을 위한<br />정직한 약속
                </h3>
                <p className="text-gray-500 font-light leading-relaxed mb-8 break-keep text-lg">
                  언프레임은 공간이 작가의 언어를 온전히 담아낼 때 그 가치가 완성된다고 믿습니다. 
                  안정적인 전시 환경과 창작의 지속 가능성을 지향합니다.
                </p>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Info size={16} className="text-[#004aad]" />
                  <span>제시된 비용은 공간 유지와 운영을 위한 최소한의 약속입니다.</span>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-12 shadow-2xl shadow-gray-200/50 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                  <Sparkles size={120} color={pointColor} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 block">Rental Investment</span>
                <div className="flex items-baseline gap-4 mb-8">
                  <span className="text-5xl md:text-6xl font-black">2,800,000</span>
                  <span className="text-xl text-gray-400 font-light">KRW / WEEK</span>
                </div>
                <div className="space-y-4 border-t border-gray-50 pt-8 mb-10 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>예약금 (Deposit)</span>
                    <span className="font-bold text-black">총액의 30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>잔금 정산 (Final)</span>
                    <span className="font-bold text-black">시작 10일 전 완납</span>
                  </div>
                  <p className="text-[11px] text-gray-300 uppercase tracking-tighter">* VAT 별도</p>
                </div>

                <button 
                  onClick={() => setShowForm(true)}
                  className="w-full bg-[#004aad] text-white py-6 rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#004aad]/20 group"
                >
                  <Sparkles size={20} className="animate-pulse" />
                  UNFRAME 과 함께하기
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </section>
          </>
        )}

        {/* The Form Flow */}
        {showForm && !isSubmitted && (
          <div className="max-w-3xl mx-auto py-20 animate-in slide-in-from-bottom-12 duration-700">
            <button 
              onClick={() => setShowForm(false)}
              className="mb-12 text-gray-400 hover:text-black flex items-center text-sm transition-colors font-bold uppercase tracking-widest"
            >
              ← Back to Details
            </button>

            <div className="mb-16">
              <h2 className="text-5xl font-black tracking-tighter mb-6">Join as a Partner</h2>
              <p className="text-gray-500 font-light text-lg">당신의 비전을 현실로 만들기 위한 첫 번째 단계입니다.</p>
              
              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => setUserType('artist')}
                  className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-bold ${userType === 'artist' ? 'border-[#004aad] bg-[#004aad]/5 text-[#004aad]' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <User size={18} /> Artist
                </button>
                <button 
                  onClick={() => setUserType('partner')}
                  className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-bold ${userType === 'partner' ? 'border-[#004aad] bg-[#004aad]/5 text-[#004aad]' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <Briefcase size={18} /> Partner
                </button>
              </div>
            </div>

            {userType && (
              <form onSubmit={handleSubmit} className="space-y-12 animate-in fade-in duration-500">
                <div className="grid md:grid-cols-2 gap-10">
                  <InputBlock label="성함 / 단체명" name="name" value={formData.name} onChange={handleInputChange} placeholder="홍길동" required />
                  <InputBlock label="연락처" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="010-0000-0000" required />
                </div>
                <InputBlock label="이메일" name="email" value={formData.email} onChange={handleInputChange} placeholder="hello@unframe.com" type="email" required />
                
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#004aad]">포트폴리오 및 참조 링크</label>
                  <div className="relative">
                    <Globe size={18} className="absolute left-0 top-4 text-gray-300" />
                    <input 
                      name="link" value={formData.link} onChange={handleInputChange}
                      placeholder="https://instagram.com/your_art"
                      className="w-full bg-transparent border-b border-gray-200 py-4 pl-8 focus:outline-none focus:border-[#004aad] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#004aad]">희망 전시 시기</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-0 top-4 text-gray-300" />
                    <input 
                      name="period" value={formData.period} onChange={handleInputChange}
                      placeholder="2024년 10월 중순 희망"
                      className="w-full bg-transparent border-b border-gray-200 py-4 pl-8 focus:outline-none focus:border-[#004aad] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#004aad]">프로젝트 제안 내용</label>
                  <textarea 
                    name="message" value={formData.message} onChange={handleInputChange} required
                    rows={5}
                    placeholder="언프레임에서 펼치고 싶은 당신의 세계를 들려주세요."
                    className="w-full bg-white border border-gray-100 p-6 rounded-2xl focus:outline-none focus:border-[#004aad] transition-colors resize-none shadow-sm"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-black text-white py-6 rounded-2xl font-bold tracking-[0.3em] uppercase flex items-center justify-center gap-3 hover:bg-[#004aad] transition-colors group"
                >
                  Submit Proposal <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Success View */}
        {isSubmitted && (
          <div className="max-w-xl mx-auto py-40 text-center animate-in zoom-in-95 duration-700">
            <div className="flex justify-center mb-10">
              <div className="w-24 h-24 bg-[#004aad]/10 text-[#004aad] rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={48} />
              </div>
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-6 uppercase">Sent Successfully</h2>
            <p className="text-gray-500 font-light leading-relaxed mb-12">
              소중한 제안이 언프레임 팀에 전달되었습니다.<br />
              검토 후 3~5일 이내에 연락드리겠습니다.
            </p>
            <button 
              onClick={resetForm}
              className="px-12 py-5 border border-gray-200 rounded-full font-bold hover:bg-black hover:text-white transition-all uppercase tracking-widest text-xs"
            >
              Back to Home
            </button>
          </div>
        )}

      </main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-100 py-20 px-8 bg-white/50 text-center">
        <div className="text-xs font-black tracking-[0.5em] text-gray-300 uppercase mb-8">Beyond the Frame, Into the Art</div>
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-[11px] font-bold text-gray-400 tracking-widest">
          <span>© 2024 UNFRAME SEOUL</span>
          <span className="hidden md:block w-1 h-1 bg-gray-200 rounded-full"></span>
          <span>CONTACT@UNFRAME.COM</span>
          <span className="hidden md:block w-1 h-1 bg-gray-200 rounded-full"></span>
          <button className="underline underline-offset-4 decoration-gray-200 hover:text-black transition-colors">PRIVACY POLICY</button>
        </div>
      </footer>
    </div>
  );
};

// --- Subcomponents ---

const SupportCard = ({ icon, title, desc }) => (
  <div className="bg-white p-10 border border-gray-50 shadow-sm rounded-3xl hover:border-[#004aad] hover:-translate-y-2 transition-all duration-300 group">
    <div className="mb-8 text-gray-300 group-hover:text-[#004aad] transition-colors transform group-hover:scale-110 duration-500">
      {icon}
    </div>
    <h4 className="text-xl font-bold mb-4 tracking-tight">{title}</h4>
    <p className="text-sm text-gray-400 font-light leading-relaxed break-keep">
      {desc}
    </p>
  </div>
);

const InputBlock = ({ label, placeholder, type = "text", ...props }) => (
  <div className="space-y-3">
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#004aad]">{label}</label>
    <input 
      type={type}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-gray-200 py-4 focus:outline-none focus:border-[#004aad] transition-colors placeholder:text-gray-200 font-medium"
      {...props}
    />
  </div>
);

export default App;