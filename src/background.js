/**
 * Twivido — background service worker (MV3).
 *
 * X streams tweet videos as HLS with *separate* audio and video tracks, so a
 * single track downloaded on its own is either silent or picture-less. Instead
 * we resolve the tweet's progressive MP4 (audio + video muxed) from X's public
 * syndication endpoint by tweet ID, then hand the URL to the download manager.
 */

const SYNDICATION_ENDPOINT = "https://cdn.syndication.twimg.com/tweet-result";

/**
 * Compute the token cdn.syndication.twimg.com expects for a tweet ID.
 * (Same algorithm used by X's own react-tweet library.)
 * @param {string} id
 * @returns {string}
 */
function syndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

/** Make a value safe to use as a download filename. */
function sanitize(name) {
  return String(name || "x_video")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

/**
 * Resolve downloadable MP4 URLs for a tweet.
 * @param {string} tweetId
 * @returns {Promise<{author: string, videos: string[]}>}
 */
async function getTweetVideos(tweetId) {
  if (!/^\d+$/.test(String(tweetId))) throw new Error("Invalid tweet id");

  const url =
    `${SYNDICATION_ENDPOINT}?id=${tweetId}` +
    `&token=${syndicationToken(tweetId)}&lang=en`;

  let res;
  try {
    res = await fetch(url, { credentials: "omit" });
  } catch (_) {
    throw new Error("Network error while contacting X");
  }
  if (res.status === 404) throw new Error("Tweet not found or not public");
  if (!res.ok) throw new Error(`X returned HTTP ${res.status}`);

  let data;
  try {
    data = await res.json();
  } catch (_) {
    throw new Error("Unexpected response from X");
  }

  const author = data?.user?.screen_name || "x";
  const videos = [];
  for (const media of data?.mediaDetails || []) {
    const mp4s = (media?.video_info?.variants || []).filter(
      (v) => v.content_type === "video/mp4"
    );
    if (!mp4s.length) continue;
    mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    videos.push(mp4s[0].url); // best bitrate
  }
  if (!videos.length) throw new Error("This tweet has no downloadable video");
  return { author, videos };
}

/**
 * Download one video of a tweet.
 * @param {string} tweetId
 * @param {number} [videoIndex=0]
 */
async function downloadTweetVideo(tweetId, videoIndex = 0) {
  const { author, videos } = await getTweetVideos(tweetId);
  const idx = Math.min(Math.max(0, videoIndex | 0), videos.length - 1);
  const suffix = videos.length > 1 ? `_${idx + 1}` : "";
  const filename = `${sanitize(author)}_${tweetId}${suffix}.mp4`;

  await chrome.downloads.download({
    url: videos[idx],
    filename,
    conflictAction: "uniquify",
  });
  return { filename, count: videos.length };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "downloadTweet") {
    downloadTweetVideo(msg.tweetId, msg.videoIndex)
      .then((r) => sendResponse({ ok: true, ...r }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true; // async response
  }
  if (msg?.type === "probeTweet") {
    getTweetVideos(msg.tweetId)
      .then((r) => sendResponse({ ok: true, count: r.videos.length }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true;
  }
  return false;
});
