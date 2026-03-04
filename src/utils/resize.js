/**
 * ResizeObserver-based overlay sync.
 * Keeps the filter overlay exactly covering the player wrapper.
 */

/**
 * Start observing the wrapper and sync overlay dimensions.
 * @param {string} wrapperSelector CSS selector for the wrapper element
 * @param {string} overlaySelector CSS selector for the overlay element
 * @returns {() => void} Cleanup function to disconnect the observer
 */
export function initOverlaySync(wrapperSelector, overlaySelector) {
  const wrapper = document.querySelector(wrapperSelector);
  const overlay = document.querySelector(overlaySelector);

  if (!wrapper || !overlay) {
    return () => {};
  }

  function sync() {
    overlay.style.width = wrapper.offsetWidth + 'px';
    overlay.style.height = wrapper.offsetHeight + 'px';
  }

  const observer = new ResizeObserver(sync);
  observer.observe(wrapper);

  // Initial sync
  sync();

  return () => observer.disconnect();
}
