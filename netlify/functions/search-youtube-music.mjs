const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

const clean = (value, max = 300) => String(value ?? "").trim().slice(0, max);

export async function handler(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const query = clean(event.queryStringParameters?.q, 120);
  if (!query) return json(400, { error: "검색어를 입력해 주세요." });

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) return json(503, { error: "YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다." });

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "8",
    q: `${query} music`,
    videoCategoryId: "10",
    regionCode: "KR",
    relevanceLanguage: "ko",
    safeSearch: "moderate",
    key: apiKey,
  });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const result = await response.json();

    if (!response.ok) {
      return json(response.status, {
        error: result?.error?.message || "YouTube 검색에 실패했습니다.",
      });
    }

    return json(200, {
      items: (Array.isArray(result.items) ? result.items : []).map((item) => {
        const videoId = item?.id?.videoId || "";
        const snippet = item?.snippet || {};
        return {
          videoId,
          title: clean(snippet.title, 300),
          channelTitle: clean(snippet.channelTitle, 200),
          thumbnailUrl:
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            snippet.thumbnails?.high?.url ||
            "",
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
        };
      }).filter((item) => item.videoId),
    });
  } catch (error) {
    return json(500, { error: error?.message || "YouTube 검색 중 오류가 발생했습니다." });
  }
}
