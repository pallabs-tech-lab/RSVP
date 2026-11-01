# Pallab & Papiya — Save the Date

A responsive Bengali wedding invitation with a vermilion-and-gold card design, Bengali lettering, wedding imagery, a live countdown, and an RSVP form backed by a local JSON file.

## Run locally

From this folder, run:

```sh
node server.mjs
```

Then open `http://localhost:3000/`. In VS Code, select **Launch Save the Date in Chrome** in Run and Debug, or press **F5**; it starts the server and opens Chrome automatically. No package installation is required.

RSVPs are written to `data/rsvps.json` on the server. Submitting again with the same email updates that guest's response. The file is deliberately excluded from Git and is not available through the website. Back it up securely if the responses need to be kept.

The server listens on localhost by default. To expose it from a deployed Node host, configure `HOST=0.0.0.0` and let the host provide `PORT`. Set `DATA_DIR` to the host's persistent writable directory so RSVPs survive restarts. Static-only hosting cannot save RSVPs, and ephemeral server disks may lose the file when restarted.

## Deploy on Render

The repository-root `render.yaml` configures a free Render web service for this invitation. Connect the GitHub repository to Render and create a Blueprint from the repository; Render will build and start the service and provide a public URL.

Free Render services spin down when idle and have an ephemeral filesystem. RSVP JSON files can be lost when the service spins down, restarts, or redeploys. Use paid persistent storage or a durable database if RSVP responses must be retained.

The repository's GitHub Actions keep-awake workflow requests the site every five minutes until December 1, 2026. Scheduled checks can be delayed, so this may reduce cold starts but does not guarantee uninterrupted availability.

## Customize

- Change the couple, date, place, and invitation copy in `index.html`.
- Update the countdown target in `script.js`. The wedding is December 9, 2026 at 18:00 India Standard Time; Haldi begins at 9:30 AM.
- Adjust the colors, typography, and responsive layout in `styles.css`.
- Customize the decorative toran in `toran.svg`.
- Customize the alpana artwork in `alpana.svg`.
- Replace `location-qr.svg` and update its matching venue link in `index.html` to change the scannable map code.
- Replace `bengali-couple-cutout.png` to change the hero couple photo; replace `bengali-wedding-celebration.png` to change the transparent story image. Its original JPEG is also kept in the project.
