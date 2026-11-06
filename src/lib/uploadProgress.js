const FAILURE_MESSAGE = "파일을 올리지 못했습니다. 인터넷 연결을 확인하고 다시 올려 주세요.";

// fetch cannot report upload progress, so signed uploads go through XMLHttpRequest.
export const putWithProgress = ({ file, url, onProgress, signal, createRequest = () => new XMLHttpRequest() }) =>
  new Promise((resolve, reject) => {
    const request = createRequest();
    const abort = () => request.abort();

    const finish = (settle, value) => {
      signal?.removeEventListener("abort", abort);
      settle(value);
    };

    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        finish(resolve);
      } else {
        finish(reject, new Error(FAILURE_MESSAGE));
      }
    };
    request.onerror = () => finish(reject, new Error(FAILURE_MESSAGE));
    request.onabort = () => finish(reject, new DOMException("업로드를 취소했습니다.", "AbortError"));

    signal?.addEventListener("abort", abort);
    request.send(file);
  });
