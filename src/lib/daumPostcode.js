const DAUM_POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let postcodeScriptPromise = null;

export const loadDaumPostcodeScript = () => {
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
    const createScript = () => {
      const script = document.createElement("script");
      script.src = DAUM_POSTCODE_SCRIPT_URL;
      script.async = true;
      script.setAttribute("data-daum-postcode", "true");
      script.dataset.daumPostcodeStatus = "loading";
      script.onload = () => {
        if (window.daum?.Postcode) {
          script.dataset.daumPostcodeStatus = "loaded";
          resolve(window.daum);
          return;
        }
        script.dataset.daumPostcodeStatus = "error";
        postcodeScriptPromise = null;
        reject(new Error("Daum postcode script loaded but API is unavailable."));
      };
      script.onerror = () => {
        script.dataset.daumPostcodeStatus = "error";
        postcodeScriptPromise = null;
        script.remove();
        reject(new Error("Daum postcode script failed to load."));
      };
      document.head.appendChild(script);
    };

    const existingScript = document.querySelector(
      'script[data-daum-postcode="true"]'
    );

    if (existingScript) {
      if (existingScript.dataset.daumPostcodeStatus === "error") {
        existingScript.remove();
        createScript();
        return;
      }

      if (existingScript.dataset.daumPostcodeStatus === "loaded") {
        if (window.daum?.Postcode) {
          resolve(window.daum);
          return;
        }
        existingScript.remove();
        createScript();
        return;
      }

      existingScript.addEventListener("load", () => {
        if (window.daum?.Postcode) {
          existingScript.dataset.daumPostcodeStatus = "loaded";
          resolve(window.daum);
          return;
        }
        existingScript.dataset.daumPostcodeStatus = "error";
        postcodeScriptPromise = null;
        reject(new Error("Daum postcode script loaded but API is unavailable."));
      });
      existingScript.addEventListener("error", () => {
        existingScript.dataset.daumPostcodeStatus = "error";
        postcodeScriptPromise = null;
        existingScript.remove();
        reject(new Error("Daum postcode script failed to load."));
      });
      return;
    }

    createScript();
  });

  return postcodeScriptPromise;
};
