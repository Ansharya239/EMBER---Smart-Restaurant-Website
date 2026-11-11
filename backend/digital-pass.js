(() => {
    "use strict";

    // =========================================================
    // EMBER DIGITAL PASS
    // Shared by AI chat reservations and reservation form.
    // Requires QRCode.js to load before this file.
    // =========================================================

    const API_BASE = (window.EMBER_API_BASE || "http://127.0.0.1:8000").replace(
        /\/+$/,
        "",
    );

    const STORAGE_KEY = "ember:last-confirmed-pass";
    const QR_SIZE = 176;
    const BRANCH_ID = "EMBER_NEW_DELHI";

    // =========================================================
    // DOM HELPERS
    // =========================================================

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    // =========================================================
    // DATE FORMATTING
    // =========================================================

    function formatDate(dateValue) {
        if (!dateValue) return "—";

        const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (match) {
            const [, year, month, day] = match;

            const date = new Date(Number(year), Number(month) - 1, Number(day));

            if (
                date.getFullYear() !== Number(year) ||
                date.getMonth() !== Number(month) - 1 ||
                date.getDate() !== Number(day)
            ) {
                return String(dateValue);
            }

            return new Intl.DateTimeFormat("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }).format(date);
        }

        return String(dateValue);
    }

    function formatDistance(distance) {
        const numericDistance = Number(distance);

        if (!Number.isFinite(numericDistance)) {
            return "—";
        }

        return `${numericDistance} m`;
    }

    // =========================================================
    // NORMALIZE ACTUAL BOOKING API RESPONSE
    // =========================================================

    function normalizeBooking(booking) {
        if (!booking || typeof booking !== "object") {
            throw new Error("Booking details are missing.");
        }

        const reservation = booking.reservation;

        const parking = booking.parking || null;

        if (
            !booking.booking_id ||
            !reservation ||
            typeof reservation !== "object"
        ) {
            throw new Error(
                "The booking server did not return a valid booking record.",
            );
        }

        if (booking.status && booking.status !== "confirmed") {
            throw new Error(
                "This booking is not confirmed. A digital pass cannot be generated.",
            );
        }

        return {
            bookingId: String(booking.booking_id),

            status: String(booking.status || "confirmed"),

            guest: String(reservation.name || "Guest"),

            party: Number(reservation.guests || 0),

            date: String(reservation.date || ""),

            time: String(reservation.time || "—"),

            room: String(reservation.room || "—"),

            branch: String(reservation.branch_id || BRANCH_ID),

            parking: parking
                ? {
                      requested: true,

                      vehicle: String(parking.vehicle_type || "—"),

                      slot: String(parking.slot_id || "—"),

                      distance: parking.distance ?? null,

                      floor: String(parking.floor || "—"),

                      zone: String(parking.zone || "—"),

                      accessible: Boolean(parking.accessible),

                      status: String(parking.status || "confirmed"),
                  }
                : {
                      requested: false,
                  },
        };
    }

    // =========================================================
    // QR CODE PAYLOAD
    // Email and special requests are excluded.
    // =========================================================

    function buildQrPayload(details) {
        return {
            type: "EMBER_RESERVATION_PASS",

            version: 1,

            booking_id: details.bookingId,

            status: details.status,

            guest: details.guest,

            party: details.party,

            date: details.date,

            time: details.time,

            dining_room: details.room,

            branch: details.branch,

            parking: details.parking.requested
                ? {
                      status: details.parking.status,

                      vehicle: details.parking.vehicle,

                      slot: details.parking.slot,

                      floor: details.parking.floor,

                      zone: details.parking.zone,

                      distance_m: details.parking.distance,

                      accessible: details.parking.accessible,
                  }
                : null,
        };
    }

    // =========================================================
    // AI TICKET DATE VALIDATION
    // =========================================================

    function validateIsoDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new Error("The reservation date must use YYYY-MM-DD format.");
        }

        const [year, month, day] = value.split("-").map(Number);

        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            throw new Error(
                "The reservation date is not a valid calendar date.",
            );
        }

        return value;
    }

    // =========================================================
    // AI TICKET VALIDATION AND BACKEND SUBMISSION
    //
    // Expected format:
    //
    // [TICKET: Name | YYYY-MM-DD | Time | Room |
    //  Email | Guests | Vehicle | Accessible]
    //
    // Exactly 8 fields.
    // =========================================================

    async function confirmAiTicket(ticketText) {
        const fields = String(ticketText)
            .split("|")

            .map((field) => field.trim());

        if (fields.length !== 8) {
            throw new Error(
                "The concierge ticket must contain eight fields. No booking was submitted.",
            );
        }

        const [
            name,

            rawDate,

            time,

            room,

            email,

            guestText,

            rawVehicle,

            rawAccessible,
        ] = fields;

        const date = validateIsoDate(rawDate);

        const guests = Number(guestText);

        const vehicle = rawVehicle.toLowerCase();

        const accessibleText = rawAccessible.toLowerCase();

        const allowedRooms = [
            "Main Dining Room",

            "Chef's Counter",

            "The Oak Room",
        ];

        // VALIDATION

        if (!name || name.length < 2) {
            throw new Error(
                "A valid guest name is required. No booking was submitted.",
            );
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            throw new Error(
                "The email address is invalid. No booking was submitted.",
            );
        }

        if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
            throw new Error("Party size must be between 1 and 20 guests.");
        }

        if (!allowedRooms.includes(room)) {
            throw new Error("The selected dining room is invalid.");
        }

        if (!time) {
            throw new Error("A reservation time is required.");
        }

        if (!["car", "bike", "none"].includes(vehicle)) {
            throw new Error("Vehicle must be car, bike or none.");
        }

        if (!["true", "false"].includes(accessibleText)) {
            throw new Error("Accessible parking must be true or false.");
        }

        const parkingRequired = vehicle === "car" || vehicle === "bike";

        const accessibleRequired = parkingRequired && accessibleText === "true";

        if (!parkingRequired && accessibleText !== "false") {
            throw new Error(
                "Accessibility must be false when parking is not requested.",
            );
        }

        // =====================================================
        // BOOKING API PAYLOAD
        // =====================================================

        const payload = {
            name,

            email,

            guests,

            date,

            time,

            room,

            branch_id: BRANCH_ID,

            special_requests: "",

            vehicle_type: parkingRequired ? vehicle : "other",

            parking_required: parkingRequired,

            accessible_required: accessibleRequired,

            allocation_mode: parkingRequired ? "random" : null,

            slot_id: null,
        };

        // =====================================================
        // SUBMIT TO FASTAPI
        // =====================================================

        let response;

        try {
            response = await fetch(
                `${API_BASE}/api/bookings/confirm`,

                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",

                        Accept: "application/json",
                    },

                    body: JSON.stringify(payload),
                },
            );
        } catch (error) {
            console.error("EMBER booking API connection failed:", error);

            throw new Error(
                `Cannot connect to the EMBER booking server at ${API_BASE}. Start FastAPI and try again.`,
            );
        }

        // =====================================================
        // READ BACKEND RESPONSE
        // =====================================================

        const responseText = await response.text();

        let result;

        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error(
                `The booking server returned an invalid response (HTTP ${response.status}). No pass was generated.`,
            );
        }

        // BACKEND ERROR

        if (!response.ok) {
            const serverMessage =
                typeof result.detail === "string"
                    ? result.detail
                    : `Booking failed with HTTP ${response.status}.`;

            throw new Error(
                `${serverMessage} No reservation pass was generated.`,
            );
        }

        // =====================================================
        // VERIFY CONFIRMATION
        // =====================================================

        if (!result.booking_id || !result.reservation) {
            throw new Error(
                "The server did not return a confirmed booking record.",
            );
        }

        if (result.status !== "confirmed") {
            throw new Error("The server did not confirm this reservation.");
        }

        // Verify actual parking allocation.

        if (parkingRequired && (!result.parking || !result.parking.slot_id)) {
            throw new Error(
                "The booking response did not include an allocated parking slot. Contact EMBER before assuming parking is confirmed.",
            );
        }

        return result;
    }

    // =========================================================
    // ADD DETAIL TO DIGITAL PASS
    // =========================================================

    function addDetail(grid, label, value, wide = false) {
        const item = createElement("div", "ember-pass-detail");

        if (wide) {
            item.classList.add("ember-pass-detail-wide");
        }

        item.append(
            createElement("span", "ember-pass-label", label),

            createElement("strong", "ember-pass-value", value || "—"),
        );

        grid.appendChild(item);
    }
    // ==========================================
    // GET QR CODE AS IMAGE
    // ==========================================

    function getQrDataUrl(card) {
        const qrBox = card.querySelector(".ember-pass-qr");

        if (!qrBox) return null;

        // Prefer canvas because QRCode.js
        // renders the actual QR into canvas.

        const canvas = qrBox.querySelector("canvas");

        if (canvas) {
            try {
                return canvas.toDataURL("image/png");
            } catch (error) {
                console.error("Could not export QR code:", error);
            }
        }

        // Fallback to QR image.

        const image = qrBox.querySelector("img");

        if (image && image.complete && image.naturalWidth > 0) {
            return image.src;
        }

        return null;
    }

    // ==========================================
    // OPEN A CLEAN DIGITAL PASS IN NEW TAB
    // ==========================================

    function openPassInNewTab(card) {
        // This must be called from a button click
        // so browser popup protection allows it.

        const passWindow = window.open("", "_blank");

        if (!passWindow) {
            return null;
        }

        // Clone only the digital pass.

        const passClone = card.cloneNode(true);

        // Remove actions from the cloned ticket.

        passClone
            .querySelectorAll(".ember-pass-actions")
            .forEach((element) => element.remove());

        // Preserve QR image in the new document.

        const qrDataUrl = getQrDataUrl(card);

        const clonedQrBox = passClone.querySelector(".ember-pass-qr");

        if (clonedQrBox && qrDataUrl) {
            const qrImage = document.createElement("img");

            qrImage.src = qrDataUrl;

            qrImage.alt = "EMBER reservation QR code";

            qrImage.width = 176;

            qrImage.height = 176;

            clonedQrBox.replaceChildren(qrImage);
        } else if (clonedQrBox) {
            clonedQrBox.textContent =
                "QR code could not be exported. Please return to your reservation.";
        }

        // Load the existing digital pass CSS.

        const stylesheetUrl = new URL("digital-pass.css", document.baseURI)
            .href;

        // Standalone page styling.

        const standaloneStyles = `

        * {
            box-sizing: border-box;
        }

        body {

            margin: 0;

            min-height: 100vh;

            padding: 35px 18px;

            display: flex;

            justify-content: center;

            align-items: flex-start;

            background: #ece9e2;

            font-family: Arial, sans-serif;

        }

        .ember-standalone-shell {

            width: min(820px, 100%);

        }

        .ember-standalone-top {

            display: flex;

            justify-content: space-between;

            align-items: center;

            flex-wrap: wrap;

            gap: 14px;

            margin-bottom: 20px;

        }

        .ember-standalone-brand {

            color: #8b642f;

            font-family: Georgia, serif;

            font-size: 20px;

            font-weight: bold;

            letter-spacing: 5px;

        }

        .ember-standalone-actions {

            display: flex;

            gap: 10px;

            flex-wrap: wrap;

        }

        .ember-standalone-actions button {

            min-height: 44px;

            padding: 0 18px;

            border: 1px solid #a67a3d;

            border-radius: 7px;

            background: #c99a58;

            color: #21180e;

            font-weight: bold;

            cursor: pointer;

        }

        .ember-standalone-actions .secondary {

            background: transparent;

            color: #75552c;

        }

        .ember-digital-pass {

            max-width: 100%;

            margin: auto;

        }


        @media print {

            @page {

                size: A4;

                margin: 14mm;

            }

            body {

                padding: 0;

                display: block;

                background: white !important;

                -webkit-print-color-adjust: exact;

                print-color-adjust: exact;

            }

            .ember-standalone-top {

                display: none !important;

            }

            .ember-standalone-shell {

                width: 100%;

            }

            .ember-digital-pass {

                max-width: 100%;

                margin: 0;

                box-shadow: none;

                break-inside: avoid;

                -webkit-print-color-adjust: exact;

                print-color-adjust: exact;

            }

        }


        @media (max-width: 560px) {

            body {

                padding: 18px 10px;

            }

            .ember-standalone-top {

                align-items: flex-start;

                flex-direction: column;

            }

        }

    `;

        // Build standalone HTML.

        passWindow.document.open();

        passWindow.document.write(`

        <!DOCTYPE html>

        <html lang="en">

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>EMBER Digital Reservation Pass</title>

            <link
                rel="stylesheet"
                href="${stylesheetUrl}"
            >

            <style>
                ${standaloneStyles}
            </style>

        </head>

        <body>

            <main class="ember-standalone-shell">

                <div class="ember-standalone-top">

                    <div class="ember-standalone-brand">
                        E M B E R
                    </div>

                    <div class="ember-standalone-actions">

                        <button
                            type="button"
                            id="ember-print-pass"
                        >
                            Download / Save as PDF
                        </button>

                        <button
                            type="button"
                            class="secondary"
                            id="ember-close-pass"
                        >
                            Close
                        </button>

                    </div>

                </div>

                ${passClone.outerHTML}

            </main>


            <script>

                document
                    .getElementById("ember-print-pass")
                    .addEventListener("click", () => {

                        window.focus();

                        window.print();

                    });


                document
                    .getElementById("ember-close-pass")
                    .addEventListener("click", () => {

                        window.close();

                    });

            </script>

        </body>

        </html>

    `);

        passWindow.document.close();

        passWindow.focus();

        return passWindow;
    }
    // =========================================================
    // CREATE DIGITAL PASS
    // =========================================================

    function createCard(booking) {
        const details = normalizeBooking(booking);

        const card = createElement("section", "ember-digital-pass");

        card.setAttribute(
            "aria-label",

            `Confirmed EMBER booking ${details.bookingId}`,
        );

        // =====================================================
        // HEADER
        // =====================================================

        const header = createElement("div", "ember-pass-header");

        const headerCopy = createElement("div", "ember-pass-header-copy");

        headerCopy.append(
            createElement("span", "ember-pass-kicker", "EMBER DIGITAL PASS"),

            createElement("h3", "ember-pass-title", "Reservation Confirmed"),

            createElement(
                "p",
                "ember-pass-id",
                `Booking ID · ${details.bookingId}`,
            ),
        );

        header.append(
            createElement("span", "ember-pass-check", "✓"),

            headerCopy,
        );

        card.appendChild(header);

        // =====================================================
        // RESERVATION DETAILS
        // =====================================================

        const body = createElement("div", "ember-pass-body");

        const grid = createElement("div", "ember-pass-grid");

        addDetail(grid, "Guest", details.guest);

        addDetail(
            grid,
            "Party",
            `${details.party} ${details.party === 1 ? "guest" : "guests"}`,
        );

        addDetail(grid, "Date", formatDate(details.date));

        addDetail(grid, "Time", details.time);

        addDetail(grid, "Dining room", details.room, true);

        addDetail(grid, "Branch", details.branch, true);

        // =====================================================
        // PARKING DETAILS
        // =====================================================

        if (details.parking.requested) {
            addDetail(grid, "Vehicle", details.parking.vehicle);

            addDetail(grid, "Parking slot", details.parking.slot);

            addDetail(
                grid,

                "Parking location",

                [details.parking.floor, details.parking.zone]

                    .filter((value) => value && value !== "—")

                    .join(" · ") || "—",

                true,
            );

            addDetail(
                grid,

                "Distance from entrance",

                formatDistance(details.parking.distance),
            );

            addDetail(grid, "Parking status", details.parking.status);

            if (details.parking.accessible) {
                addDetail(grid, "Access", "Accessible parking");
            }
        } else {
            addDetail(grid, "Parking", "Not requested", true);
        }

        // =====================================================
        // QR CODE PANEL
        // =====================================================

        const qrPanel = createElement("div", "ember-pass-qr-panel");

        const qrBox = createElement("div", "ember-pass-qr");

        qrBox.setAttribute(
            "aria-label",

            "Scannable QR code containing reservation and parking details",
        );

        qrPanel.append(
            qrBox,

            createElement("strong", "ember-pass-qr-caption", "SCAN PASS"),

            createElement(
                "small",

                "ember-pass-qr-note",

                "Booking details encoded · Email excluded for privacy",
            ),
        );

        body.append(grid, qrPanel);

        card.appendChild(body);

        // =====================================================
        // FOOTER
        // =====================================================

        card.appendChild(
            createElement(
                "div",

                "ember-pass-footer",

                "Please present this pass when you arrive at EMBER.",
            ),
        );

        // =====================================================
        // GENERATE QR CODE
        // =====================================================

        if (typeof window.QRCode === "function") {
            try {
                new window.QRCode(
                    qrBox,

                    {
                        text: JSON.stringify(buildQrPayload(details)),

                        width: QR_SIZE,

                        height: QR_SIZE,

                        colorDark: "#171717",

                        colorLight: "#ffffff",

                        correctLevel: window.QRCode.CorrectLevel.M,
                    },
                );
            } catch (error) {
                console.error("EMBER QR generation failed:", error);

                qrBox.appendChild(
                    createElement(
                        "span",

                        "ember-pass-qr-error",

                        "QR generation failed. Reload the page.",
                    ),
                );
            }
        } else {
            qrBox.appendChild(
                createElement(
                    "span",

                    "ember-pass-qr-error",

                    "QR library unavailable. Check internet access and reload.",
                ),
            );
        }
        // ==========================================
        // PASS ACTION BUTTON
        // ==========================================

        const actions = createElement("div", "ember-pass-actions");

        const openButton = createElement(
            "button",
            "ember-pass-open-button",
            "OPEN PASS IN NEW TAB ↗",
        );

        openButton.type = "button";

        openButton.addEventListener("click", () => {
            const opened = openPassInNewTab(card);

            if (!opened) {
                openButton.textContent = "ALLOW POP-UPS AND TRY AGAIN";

                openButton.classList.add("is-blocked");
            }
        });

        actions.appendChild(openButton);

        card.appendChild(actions);
        return card;
    }

    // =========================================================
    // SAFE SESSION STORAGE
    // Email and special requests are excluded.
    // =========================================================

    function makeSafeStoredBooking(booking) {
        const details = normalizeBooking(booking);

        return {
            booking_id: details.bookingId,

            status: details.status,

            reservation: {
                name: details.guest,

                guests: details.party,

                date: details.date,

                time: details.time,

                room: details.room,

                branch_id: details.branch,
            },

            parking: details.parking.requested
                ? {
                      vehicle_type: details.parking.vehicle,

                      slot_id: details.parking.slot,

                      distance: details.parking.distance,

                      floor: details.parking.floor,

                      zone: details.parking.zone,

                      accessible: details.parking.accessible,

                      status: details.parking.status,
                  }
                : null,
        };
    }

    // =========================================================
    // SHOW PASS ON RESERVATION PAGE
    // =========================================================

    function showOnReservationPage(booking) {
        const safeBooking = makeSafeStoredBooking(booking);

        try {
            window.sessionStorage.setItem(
                STORAGE_KEY,

                JSON.stringify(safeBooking),
            );
        } catch (error) {
            console.warn(
                "EMBER could not save the pass in this browser tab:",
                error,
            );
        }

        const section = document.getElementById("finalBookingSection");

        const summary = document.getElementById("bookingSummary");

        // Homepage does not contain reservation summary.

        if (!section || !summary) return;

        section.hidden = false;

        summary.replaceChildren(createCard(safeBooking));

        section.scrollIntoView({
            behavior: "smooth",

            block: "nearest",
        });
    }

    // =========================================================
    // RESTORE LAST PASS
    // =========================================================

    function restoreLastPass() {
        const section = document.getElementById("finalBookingSection");

        const summary = document.getElementById("bookingSummary");

        if (!section || !summary) return;

        try {
            const stored = window.sessionStorage.getItem(STORAGE_KEY);

            if (!stored) return;

            const booking = JSON.parse(stored);

            if (!booking || !booking.booking_id || !booking.reservation) {
                return;
            }

            section.hidden = false;

            summary.replaceChildren(createCard(booking));
        } catch (error) {
            console.warn(
                "EMBER could not restore the latest digital pass:",
                error,
            );
        }
    }

    // =========================================================
    // PUBLIC GLOBAL INTERFACE
    // Used by jslogic.js and unified-booking.js.
    // =========================================================

    window.EmberDigitalPass = {
        confirmAiTicket,

        createCard,

        showOnReservationPage,

        createQrPayload(booking) {
            return buildQrPayload(normalizeBooking(booking));
        },

        restoreLastPass,
    };

    // =========================================================
    // INITIALIZE PASS RESTORATION
    // =========================================================

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",

            restoreLastPass,

            { once: true },
        );
    } else {
        restoreLastPass();
    }
})();
