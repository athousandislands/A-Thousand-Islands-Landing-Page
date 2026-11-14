# A Thousand Islands — website redesign

Work in this folder on the **redesign** branch. Production has not been changed. Do not merge to main or publish to production without explicit approval.

## Where everything is

- **website-source/** — the current website's editable source code. Start with **index.html**, **styles.css**, and **website.js**. Open them in any code editor.
- **website-source/showreel-player.js** — looping covers, playback, controls and responsive video selection.
- **website-source/homepage-glass.js** — homepage colour/clock reveal.
- **website-source/services-discovery.js**, **services-discovery-model.js**, **services.css** — full-page Services material, placement and timed reveals.
- **website-source/services-discovery-tuning.js** — local DialKit controls for positions, spacing, legibility, colour, movement and transitions.
- The Discover Our Services title is static on every device; its layout lives in **services.css**.
- **website-source/text-entrances.js** — heading and copy entrances.
- **website-source/featured-work.css**, **featured-work.js** — Featured Work layout and entrance; approved baked covers live in **assets/images/featured-work/**.
- **website-source/glass-carousel.js**, **glass-carousel.css** — horizontal WebGL2 glass slider. Add or replace projects in **carousel-projects.js** (up to sixteen); image URLs and titles are separate. Open **/?tune=carousel#featured-work** for the floating DialKit controls. Phone and desktop settings save separately.
- **website-source/assets/** — active images, fonts, audio, showreel videos and licences.
- **design-references/** — current homepage/showreel layout and player references.
- **MOBILE-NATIVE-GUIDE.md** — the supplied mobile interaction/platform guidance for future site changes.
- **WEBSITE-NOTES.md** — current decisions, video behaviour and outstanding checks.
- **build-preview/** — generated website output; recreated by the build command. Edit the source instead.
- **archive-not-used-by-current-website/** — retired code, historical notes, old site, previews, alternate images and original media. You can move this whole folder elsewhere; the current website does not import it.
- **node_modules/** — automatically installed development software; no manual edits needed.
- **package.json**, **package-lock.json**, **vite.config.js**, **vercel.json** — development/build configuration; retained at the root because the tools use them.

## Run the local website

Use Node.js 24, then run `npm ci` once to install dependencies and `npm run dev` to start the preview. Open http://localhost:5174/ . For a phone on the same Wi-Fi, use the network address printed by the server.

Run `npm run build` to produce **build-preview/**. Run `npm run preview` to view that build at http://localhost:4174/ . No GitHub push or deployment is performed by these commands.

To tune Services, open http://localhost:5174/?tune=services#services-glass and expand the sliders button at the bottom right. Use **Go to glass surface** or **Replay scroll transition**. Arrival controls coordinate colour and staggered headings. Position controls cover Visual, Direction and Digital Experiences, with separate Phone groups. Controls are saved in this browser; **Copy parameters** exports a configuration to review. The tuning panel is development-only and excluded from production builds.

The existing Vercel configuration builds this source folder into build-preview. A future preview deployment must remain on the redesign branch until approved.

Project tuning panels use the documented vendored DialKit in `website-source/vendor/dialkit/`. Include a question-mark explanation for each control and a JSON download. Pulse layout and fade delay are at `/pulse/?tune=pulse`.

Use one content and layout system across phones and tablets. Adapt column count, type, and spacing to available width and height. Avoid copy or layout overrides for specific device models. Before handing back layout changes, check a short and narrow phone (320×568 and 375×667), a larger phone, an upright and landscape tablet, and desktop. Check that controls clear one another, the copy flows into the next section, and there is no horizontal overflow. Use real hardware to verify browser chrome, safe areas, and touch when available, and identify any checks done in simulated viewports.
