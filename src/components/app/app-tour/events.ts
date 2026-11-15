/**
 * A short walkthrough of the app's main controls: the screen dims, one control
 * is lit at a time, and a card says what it does. A new install gets it once,
 * right after choosing a picture; Settings can replay it.
 *
 * "Pending" is what links the two: finishing onboarding marks the tour as
 * pending, and the app frame starts it on the dashboard. An existing install
 * never had that mark, so an update doesn't spring it on anyone.
 */
export const PENDING_KEY = "baaki.tourPending";
export const START_EVENT = "baaki:start-tour";

/** Onboarding is finished: show the tour when the dashboard opens. */
export function queueAppTour() {
  try {
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* no storage: no tour, rather than one every launch */
  }
}

/** Replay from Settings. */
export function startAppTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

/** Tells the bottom bar to open or close its More menu: {detail: {open}}. */
export const TOUR_MENU_EVENT = "baaki:tour-menu";
