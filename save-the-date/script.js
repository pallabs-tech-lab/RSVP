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

const rsvpForm = document.querySelector("#rsvp-form");
const formMessage = document.querySelector("#form-message");
const submitButton = rsvpForm.querySelector('button[type="submit"]');

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const formData = new FormData(rsvpForm);
  const rsvp = {
    name: String(formData.get("name")).trim(),
    email: String(formData.get("email")).trim().toLowerCase(),
    guests: Number(formData.get("guests")),
  };

  if (!rsvp.name || !rsvp.email) {
    formMessage.textContent = "Please enter your name and email address.";
    return;
  }

  submitButton.disabled = true;
  formMessage.textContent = "Saving your RSVP…";

  try {
    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rsvp),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      formMessage.textContent = "We couldn’t read the RSVP server’s response. Please try again.";
      return;
    }

    if (
      !response.ok
      || result === null
      || typeof result !== "object"
      || result.saved !== true
    ) {
      formMessage.textContent = result !== null
        && typeof result === "object"
        && typeof result.error === "string"
        ? result.error
        : "We couldn’t save your RSVP just now. Please try again.";
      return;
    }

    formMessage.textContent = `Thank you, ${rsvp.name}! Your place is saved. We can’t wait to celebrate together—with shubho drishti and lots of mishti!`;
    rsvpForm.reset();
  } catch {
    formMessage.textContent = "We couldn’t reach the RSVP server. Please run the invitation server and try again.";
  } finally {
    submitButton.disabled = false;
  }
});
