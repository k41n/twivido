const root = document.getElementById("root");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function tweetIdFromUrl(url) {
  try {
    return new URL(url).pathname.match(/\/status\/(\d+)/)?.[1] || null;
  } catch {
    return null;
  }
}

(async function init() {
  const tab = await getActiveTab();
  const onX = /:\/\/(x|twitter)\.com\//.test(tab?.url || "");
  const tweetId = tweetIdFromUrl(tab?.url || "");

  if (!onX) {
    root.innerHTML =
      "<p>Open <b>x.com</b> — a <b>⬇</b> button appears on every video, right in your feed.</p>";
    return;
  }

  if (tweetId) {
    const card = document.createElement("div");
    card.className = "card";

    const btn = document.createElement("button");
    btn.className = "dl";
    btn.textContent = "Download this tweet's video";

    const status = document.createElement("div");
    status.className = "status";
    status.textContent = `Tweet ${tweetId}`;

    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "Preparing…";
      chrome.runtime.sendMessage(
        { type: "downloadTweet", tweetId, videoIndex: 0 },
        (resp) => {
          if (resp?.ok) {
            btn.textContent = "✓ Download started";
            status.textContent = resp.filename || "";
          } else {
            btn.disabled = false;
            btn.textContent = "Download this tweet's video";
            status.textContent = "Error: " + (resp?.error || "unknown");
          }
        }
      );
    });

    card.appendChild(btn);
    card.appendChild(status);
    root.appendChild(card);
  }

  const hint = document.createElement("div");
  hint.innerHTML =
    "<p>Hover any video and click the <b>⬇</b> button in its corner.</p>" +
    "<ul>" +
    "<li>Best available quality (audio + video).</li>" +
    "<li>Saved as <i>author_id.mp4</i>.</li>" +
    "<li>Works with public tweets.</li>" +
    "</ul>";
  root.appendChild(hint);
})();
