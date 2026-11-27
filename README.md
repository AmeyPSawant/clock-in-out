# Clock in / clock out

Website - [Click Here](https://ameypsawant.github.io/clock-in-out/)

A two-button time clock that logs to a Google Sheet (`Timesheet` tab). Built for shifts that cross midnight, such as 11 PM to 7 AM.

## Setup

1. Open the Google Sheet, then Extensions > Apps Script. Paste in `Code.gs`, set `PIN`, and save.
2. Pick `setup` in the function dropdown and click Run. Approve access. This creates the `Timesheet` tab.
3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy, then copy the web app URL.
4. Paste that URL into `API` at the top of the script in `index.html`.
5. Push this repo to GitHub, then Settings > Pages > Deploy from a branch > `main` / root.

After you change `Code.gs` later: Deploy > Manage deployments > edit > Version: New version.

## Timesheet layout

| Shift date | Clock in | Clock out | Hours | Note |
|---|---|---|---|---|

- One row per shift. Shift date is the day the shift started.
- Clock in and Clock out hold full date and time, so a shift that ends the next morning still calculates correctly.
- A blank Clock out means the shift is open. To fix a missed punch, type the full date and time into Clock out.
- Forgot to clock out? After `AUTO_OUT_HOURS` (default 13) a timer closes the shift at exactly that length, highlights the row yellow, and writes "Automatic Clock Out - adjust times" in Note. Edit Clock out to the real time and clear the highlight.
- Clock in is greyed out while a shift is open, and Clock out is greyed out otherwise. This follows the sheet, so it holds after a reload or on another device.
