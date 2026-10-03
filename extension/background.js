// Alt+Shift+V opens the popup, which is where the mic and the manual controls live.
// openPopup() needs Chrome 127+; on older builds the toolbar icon still works.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-listening') return;
  try {
    const action = typeof browser !== 'undefined' ? browser.action : chrome.action;
    await action.openPopup();
  } catch {
    // No focused window, or a Chrome build without openPopup — nothing useful to do here.
  }
});
