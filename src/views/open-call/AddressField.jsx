import React, { useEffect, useState } from "react";

const DAUM_POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let postcodeScriptPromise = null;

const loadDaumPostcodeScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is not available"));
  }

  if (window.daum?.Postcode) {
    return Promise.resolve(window.daum);
  }

  if (postcodeScriptPromise) {
    return postcodeScriptPromise;
  }

  postcodeScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-daum-postcode="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.daum?.Postcode) {
          resolve(window.daum);
          return;
        }
        reject(new Error("Daum postcode script loaded but API is unavailable."));
      });
      existingScript.addEventListener("error", () => {
        reject(new Error("Daum postcode script failed to load."));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = DAUM_POSTCODE_SCRIPT_URL;
    script.async = true;
    script.setAttribute("data-daum-postcode", "true");
    script.onload = () => {
      if (window.daum?.Postcode) {
        resolve(window.daum);
        return;
      }
      reject(new Error("Daum postcode script loaded but API is unavailable."));
    };
    script.onerror = () => {
      reject(new Error("Daum postcode script failed to load."));
    };
    document.head.appendChild(script);
  });

  return postcodeScriptPromise;
};

const AddressField = ({
  label = "주소",
  required = false,
  mode = "text",
  value = "",
  detailValue = "",
  postalCode = "",
  placeholder = "주소를 입력해 주세요.",
  detailPlaceholder = "상세 주소를 입력해 주세요.",
  disabled = false,
  onChange,
}) => {
  const [scriptStatus, setScriptStatus] = useState("idle");
  const isSearchMode = mode === "search";

  useEffect(() => {
    if (!isSearchMode) {
      setScriptStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setScriptStatus("loading");

    loadDaumPostcodeScript()
      .then(() => {
        if (!cancelled) {
          setScriptStatus("ready");
        }
      })
      .catch((error) => {
        console.error("daum postcode preload failed:", error);
        if (!cancelled) {
          setScriptStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSearchMode]);

  const updateField = (patch) => {
    if (typeof onChange === "function") {
      onChange(patch);
    }
  };

  const handleSearch = async () => {
    if (disabled) return;

    setScriptStatus("loading");
    try {
      const daum = await loadDaumPostcodeScript();
      setScriptStatus("ready");
      new daum.Postcode({
        oncomplete(data) {
          updateField({
            addressMain: data.roadAddress || data.jibunAddress || "",
            postalCode: data.zonecode || "",
            addressDetail: "",
          });
        },
      }).open();
    } catch (error) {
      console.error("daum postcode load failed:", error);
      setScriptStatus("error");
    }
  };

  return (
    <div className="space-y-4 text-zinc-900 text-left">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#004aad] flex items-center gap-2 font-bold text-left">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {isSearchMode ? (
          <button
            type="button"
            onClick={handleSearch}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-full border border-[#004aad]/15 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004aad] transition-colors hover:border-[#004aad]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
          >
            주소 검색
          </button>
        ) : null}
      </div>

      {isSearchMode ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-[24px] border border-gray-100 bg-zinc-50/50 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                우편번호
              </p>
              <input
                type="text"
                value={postalCode}
                readOnly
                placeholder="검색 시 자동 입력"
                className="mt-2 w-full bg-transparent text-base font-bold text-zinc-900 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={disabled}
              className="hidden sm:inline-flex sm:items-center sm:justify-center sm:rounded-[24px] sm:border sm:border-[#004aad]/15 sm:bg-[#004aad] sm:px-5 sm:py-4 sm:text-[11px] sm:font-black sm:uppercase sm:tracking-[0.18em] sm:text-white sm:transition-opacity sm:hover:opacity-90 sm:disabled:cursor-not-allowed sm:disabled:opacity-50"
            >
              주소 검색
            </button>
          </div>

          <div className="rounded-[24px] border border-gray-100 bg-zinc-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
              기본 주소
            </p>
            <input
              type="text"
              value={value}
              onChange={(e) =>
                updateField({
                  addressMain: e.target.value,
                })
              }
              placeholder={placeholder}
              disabled={disabled}
              className="mt-2 w-full bg-transparent text-base md:text-lg font-bold text-zinc-900 outline-none"
            />
          </div>

          <div className="rounded-[24px] border border-gray-100 bg-zinc-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
              상세 주소
            </p>
            <input
              type="text"
              value={detailValue}
              onChange={(e) =>
                updateField({
                  addressDetail: e.target.value,
                })
              }
              placeholder={detailPlaceholder}
              disabled={disabled}
              className="mt-2 w-full bg-transparent text-base md:text-lg font-bold text-zinc-900 outline-none"
            />
          </div>

          {scriptStatus === "error" ? (
            <p className="text-xs font-bold leading-relaxed text-amber-700 break-keep">
              주소검색 스크립트를 불러오지 못했습니다. 아래 입력칸에 주소를 직접 입력해도 됩니다.
            </p>
          ) : (
            <p className="text-xs font-bold leading-relaxed text-zinc-400 break-keep">
              주소검색이 열리지 않으면 주소를 직접 입력해도 됩니다.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-[24px] border border-gray-100 bg-zinc-50/50 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
            주소
          </p>
          <input
            type="text"
            value={value}
            onChange={(e) =>
              updateField({
                addressMain: e.target.value,
              })
            }
            placeholder={placeholder}
            disabled={disabled}
            className="mt-2 w-full bg-transparent text-base md:text-lg font-bold text-zinc-900 outline-none"
          />
        </div>
      )}
    </div>
  );
};

export default AddressField;
