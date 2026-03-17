(() => {
  const video = document.querySelector("[data-home-hero-video]");
  if (!video) return;

  const source = video.querySelector("source");
  if (!source) return;

  const playlist = [
    video.dataset.homeHeroVideoPrimary,
    video.dataset.homeHeroVideoSecondary,
  ].filter((url, index, allUrls) => url && allUrls.indexOf(url) === index);

  if (playlist.length < 2) {
    video.loop = true;
    return;
  }

  let currentIndex = 0;

  video.addEventListener("ended", () => {
    currentIndex = (currentIndex + 1) % playlist.length;
    source.src = playlist[currentIndex];
    video.load();

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  });
})();
