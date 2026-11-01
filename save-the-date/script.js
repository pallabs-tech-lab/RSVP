const weddingDate = new Date("2026-12-09T18:00:00+05:30");
const countdownParts = {
  days: document.querySelector("#days"),
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
};
const timerNote = document.querySelector("#timer-note");

function updateCountdown() {
  const remaining = weddingDate.getTime() - Date.now();

  if (remaining <= 0) {
    Object.values(countdownParts).forEach((part) => {
      part.textContent = "00";
    });
    timerNote.textContent = "TODAY IS THE DAY — LET'S CELEBRATE";
    return;
  }

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining / 3_600_000) % 24);
  const minutes = Math.floor((remaining / 60_000) % 60);
  const seconds = Math.floor((remaining / 1_000) % 60);

  countdownParts.days.textContent = String(days).padStart(3, "0");
  countdownParts.hours.textContent = String(hours).padStart(2, "0");
  countdownParts.minutes.textContent = String(minutes).padStart(2, "0");
  countdownParts.seconds.textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
window.setInterval(updateCountdown, 1000);
