import React from "react";

export default class ErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section role="alert" className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-black">화면을 불러오지 못했습니다.</h1>
        <p className="mt-3 text-sm text-zinc-600">네트워크 상태를 확인한 뒤 새로고침해 주세요. 입력 중이던 내용은 사라질 수 있습니다.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full bg-[#004aad] px-6 py-3 text-sm font-bold text-white"
        >
          새로고침
        </button>
      </section>
    );
  }
}
