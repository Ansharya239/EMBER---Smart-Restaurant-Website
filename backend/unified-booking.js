document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reservationForm");

    if (!form) return;

    const API = (window.EMBER_API_BASE || "http://127.0.0.1:8000").replace(
        /\/+$/,
        "",
    );

    const $ = (id) => document.getElementById(id);

    const branch = $("branch");
    const date = $("date");
    const room = $("room");
    const time = $("time");

    const parkingQuestion = $("parkingQuestion");
    const parkingSection = $("parkingSection");

    const parkingAvailability = $("parkingAvailability");
    const parkingMapSection = $("parkingMapSection");
    const parkingGrid = $("parkingGrid");

    const accessibleInput = $("accessibleRequired");

    const selectionDisplay = $("selectedParking");

    const finalSection = $("finalBookingSection");
    const summary = $("bookingSummary");

    const feedback = $("bookingFeedback");
    const submitButton = $("finalBookingButton");

    let vehicle = null;
    let parkingRequired = false;
    let accessible = false;
    let allocation = null;

    let slots = [];
    let selectedSlot = null;
    let submitting = false;

    let confirmedBooking = null;

    // ==================================
    // DATE DEFAULT
    // ==================================

    const localDate = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000,
    )
        .toISOString()
        .slice(0, 10);

    date.min = localDate;
    date.value = localDate;

    // ==================================
    // TIME OPTIONS
    // ==================================

    function updateTimes() {
        const selectedRoom = room.value;

        let times = [];

        if (selectedRoom === "Main Dining Room") {
            times = ["7:00 PM", "9:30 PM"];
        }

        if (selectedRoom === "Chef's Counter") {
            times = ["8:30 PM"];
        }

        if (selectedRoom === "The Oak Room") {
            times = ["7:00 PM", "9:30 PM"];
        }

        time.innerHTML =
            '<option value="" disabled selected>Select time</option>';

        times.forEach((value) => {
            const option = document.createElement("option");

            option.value = value;
            option.textContent = value;

            time.appendChild(option);
        });
    }

    room.addEventListener("change", updateTimes);

    // ==================================
    // GENERAL API HELPER
    // ==================================

    async function apiRequest(path, options = {}) {
        let response;

        try {
            response = await fetch(`${API}${path}`, {
                ...options,

                headers: {
                    Accept: "application/json",

                    ...(options.headers || {}),
                },
            });
        } catch (error) {
            console.error("EMBER API connection error:", error);

            throw new Error(
                `Cannot connect to EMBER backend at ${API}. Make sure FastAPI is running on port 8000.`,
            );
        }

        const responseText = await response.text();

        let data = {};

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = {
                detail: responseText || "Invalid server response.",
            };
        }

        if (!response.ok) {
            throw new Error(
                data.detail || `Request failed with status ${response.status}.`,
            );
        }

        return data;
    }
    // ==================================
    // VEHICLE SELECTION — FIXED
    // ==================================

    document.querySelectorAll("[data-vehicle]").forEach((button) => {
        button.addEventListener("click", async () => {
            // Vehicle selection is only allowed
            // after the customer requests parking.

            if (!parkingRequired) {
                return;
            }

            vehicle = button.dataset.vehicle;

            // Update active vehicle button.

            document.querySelectorAll("[data-vehicle]").forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            // IMPORTANT:
            // Keep the parking section visible.

            parkingSection.hidden = false;

            parkingQuestion.hidden = false;

            // Reset previous parking selection.

            allocation = null;

            selectedSlot = null;

            slots = [];

            accessible = false;

            accessibleInput.checked = false;

            selectionDisplay.hidden = true;

            parkingMapSection.hidden = true;

            parkingGrid.replaceChildren();

            // Reset allocation buttons.

            document.querySelectorAll("[data-allocation]").forEach((item) => {
                item.classList.remove("active");
            });

            // Ensure a branch is selected.

            if (!branch.value) {
                parkingAvailability.textContent =
                    "Please select an EMBER restaurant branch first.";

                updateSummary();

                return;
            }

            // Load parking only AFTER vehicle selection.

            parkingAvailability.textContent = `Loading ${vehicle} parking availability...`;

            await loadSlots();

            updateSummary();
        });
    });
    // ==================================
    // PARKING YES / NO — FIXED
    // ==================================

    document.querySelectorAll("[data-parking]").forEach((button) => {
        button.addEventListener("click", () => {
            const required = button.dataset.parking === "yes";

            // Update active buttons.

            document.querySelectorAll("[data-parking]").forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            parkingRequired = required;

            // Reset previous selection.

            vehicle = null;

            allocation = null;

            selectedSlot = null;

            slots = [];

            accessible = false;

            accessibleInput.checked = false;

            selectionDisplay.hidden = true;

            parkingMapSection.hidden = true;

            parkingGrid.replaceChildren();

            document.querySelectorAll("[data-vehicle]").forEach((item) => {
                item.classList.remove("active");
            });

            document.querySelectorAll("[data-allocation]").forEach((item) => {
                item.classList.remove("active");
            });

            if (!parkingRequired) {
                // Customer does not need parking.

                parkingSection.hidden = true;

                parkingAvailability.textContent =
                    "Parking not requested. Continue with your table reservation.";

                updateSummary();

                return;
            }

            // Customer needs parking.

            parkingSection.hidden = false;

            parkingAvailability.textContent =
                "Select Car or Bike to check parking availability.";

            feedback.textContent = "";

            feedback.className = "booking-feedback";

            updateSummary();
        });
    });
    // ==================================
    // LOAD PARKING INVENTORY — FIXED
    // ==================================

    async function loadSlots() {
        // Never fetch before the customer
        // chooses Yes and selects a vehicle.

        if (!parkingRequired || !vehicle) {
            return;
        }

        // Validate branch.

        if (!branch.value) {
            parkingAvailability.textContent =
                "Please select a restaurant branch.";

            return;
        }

        parkingAvailability.textContent = "Checking parking availability...";

        feedback.textContent = "";

        try {
            const data = await apiRequest(
                "/api/parking/slots?branch_id=" +
                    encodeURIComponent(branch.value),
            );

            // Validate backend response.

            if (!Array.isArray(data)) {
                throw new Error(
                    "Parking backend returned an invalid inventory.",
                );
            }

            slots = data;

            // Render available parking spaces.

            renderMap();

            if (availableSlots().length === 0) {
                parkingAvailability.textContent = `No eligible ${vehicle} parking spaces are currently available.`;
            }

            feedback.textContent = "";
        } catch (error) {
            console.error("EMBER parking inventory error:", error);

            slots = [];

            selectedSlot = null;

            parkingGrid.replaceChildren();

            parkingAvailability.textContent =
                "Parking availability could not be loaded.";

            feedback.textContent = error.message;

            feedback.className = "booking-feedback error";
        }
    }

    // ==================================
    // ACCESSIBLE PARKING
    // ==================================

    accessibleInput.addEventListener("change", () => {
        accessible = accessibleInput.checked;

        selectedSlot = null;

        selectionDisplay.hidden = true;

        renderMap();
    });

    // ==================================
    // ELIGIBILITY
    // ==================================

    function eligibleSlots() {
        return slots.filter((slot) => {
            return (
                slot.vehicle_type === vehicle &&
                slot.is_accessible === accessible
            );
        });
    }

    function availableSlots() {
        return eligibleSlots().filter((slot) => slot.status === "available");
    }

    // ==================================
    // ALLOCATION MODE
    // ==================================

    document.querySelectorAll("[data-allocation]").forEach((button) => {
        button.addEventListener("click", () => {
            allocation = button.dataset.allocation;

            selectedSlot = null;

            selectionDisplay.hidden = true;

            document.querySelectorAll("[data-allocation]").forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            parkingMapSection.hidden = allocation !== "manual";

            if (allocation === "manual") {
                renderMap();
            }

            updateSummary();
        });
    });

    // ==================================
    // RENDER PARKING MAP
    // ==================================

    function renderMap() {
        if (!slots.length || !vehicle) return;

        const vehicleSlots = slots
            .filter((slot) => slot.vehicle_type === vehicle)
            .sort((a, b) => a.id.localeCompare(b.id));

        const available = availableSlots();

        parkingAvailability.textContent = `${available.length} eligible parking spaces available.`;

        $("parkingVehicleTitle").textContent =
            vehicle.toUpperCase() + " PARKING";

        parkingGrid.replaceChildren();

        vehicleSlots.forEach((slot) => {
            const isAccessible = slot.is_accessible;
            const isEligible = isAccessible === accessible;

            const button = document.createElement("button");

            button.type = "button";

            button.className = "parking-slot " + slot.status;

            if (isAccessible) {
                button.classList.add("accessible");
            }

            const canSelect = slot.status === "available" && isEligible;

            if (!canSelect) {
                button.classList.add("unselectable");
            }

            if (selectedSlot && selectedSlot.id === slot.id) {
                button.classList.add("selected");
            }

            button.disabled = !canSelect || allocation !== "manual";

            const title = `${slot.id} | ${slot.distance} metres | ${slot.status}`;

            button.title = title;

            const label = document.createElement("strong");
            label.textContent = slot.id;

            const distance = document.createElement("small");
            distance.textContent = slot.distance + " m";

            button.append(label, distance);

            button.addEventListener("click", () => {
                if (!canSelect || allocation !== "manual") return;

                selectedSlot = slot;

                renderMap();

                showSelectedSlot(slot);

                updateSummary();
            });

            parkingGrid.appendChild(button);
        });
    }

    // ==================================
    // SELECTED SLOT
    // ==================================

    function showSelectedSlot(slot) {
        selectionDisplay.hidden = false;

        selectionDisplay.textContent =
            `Selected: ${slot.id} | ` +
            `${slot.distance} metres from entrance | ` +
            `${slot.zone} | ${slot.floor}`;
    }

    // ==================================
    // BRANCH CHANGE — FIXED
    // ==================================

    branch.addEventListener("change", async () => {
        selectedSlot = null;

        slots = [];

        selectionDisplay.hidden = true;

        if (parkingRequired && vehicle) {
            await loadSlots();
        } else if (parkingRequired) {
            parkingAvailability.textContent =
                "Select Car or Bike to check availability.";
        }

        updateSummary();
    });
// ==================================
// SUMMARY — DIGITAL PASS ONLY
// ==================================

function updateSummary() {

    // Once booking is confirmed,
    // never overwrite the digital pass.

    if (confirmedBooking) {
        return;
    }

    // No text-based booking summary.
    // The confirmation section is reserved
    // exclusively for the digital pass.

}

    // ==================================
    // FORM VALIDATION
    // ==================================

    form.addEventListener("input", updateSummary);
    form.addEventListener("change", updateSummary);

    // ==================================
    // SUBMIT COMBINED BOOKING
    // ==================================

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (submitting || confirmedBooking) return;

        if (parkingRequired && !vehicle) {
            feedback.textContent = "Please select your vehicle.";

            feedback.className = "booking-feedback error";

            return;
        }

        if (parkingRequired && !allocation) {
            feedback.textContent = "Please select a parking allocation method.";
            feedback.className = "booking-feedback error";
            return;
        }

        if (parkingRequired && allocation === "manual" && !selectedSlot) {
            feedback.textContent = "Please select an available parking space.";
            feedback.className = "booking-feedback error";
            return;
        }

        if (
            parkingRequired &&
            allocation === "random" &&
            availableSlots().length === 0
        ) {
            feedback.textContent = "No eligible parking spaces are available.";
            feedback.className = "booking-feedback error";
            return;
        }

        const payload = {
            name: $("name").value.trim(),

            email: $("email").value.trim(),

            guests: Number($("guests").value),

            date: date.value,

            time: time.value,

            room: room.value,

            branch_id: branch.value,

            special_requests: $("requests").value,

            vehicle_type: vehicle || "other",

            parking_required: parkingRequired,

            accessible_required: parkingRequired && accessible,

            allocation_mode: parkingRequired ? allocation : null,

            slot_id:
                parkingRequired && allocation === "manual"
                    ? selectedSlot.id
                    : null,
        };

        submitting = true;

        submitButton.disabled = true;
        submitButton.textContent = "CONFIRMING...";

        feedback.textContent = "Securing your reservation...";

        feedback.className = "booking-feedback";

        try {
            const result = await apiRequest("/api/bookings/confirm", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(payload),
            });

            // ============================================
// EMBER DIGITAL RESERVATION CONFIRMATION
// ============================================

// Validate backend response.

if (
    !result ||
    !result.booking_id ||
    !result.reservation
) {

    throw new Error(
        "The booking server did not return a valid confirmation."
    );

}


// Save confirmed booking.

confirmedBooking = result;


// ============================================
// SHOW DIGITAL PASS
// ============================================

finalSection.hidden = false;


// Remove any previous content.

summary.replaceChildren();


if (window.EmberDigitalPass) {

    // Generate the actual digital pass.

    window.EmberDigitalPass.showOnReservationPage(
        result
    );

} else {

    const message = document.createElement("p");

    message.textContent =
        `Booking ${result.booking_id} is confirmed, but the digital pass module did not load.`;

    summary.appendChild(message);

}


// ============================================
// SUCCESS MESSAGE
// ============================================

feedback.textContent =
    "Your EMBER reservation has been confirmed successfully.";

feedback.className =
    "booking-feedback success";


// ============================================
// LOCK SUBMISSION
// ============================================

submitButton.disabled = true;

submitButton.textContent =
    "RESERVATION CONFIRMED";


// Disable parking controls.

parkingSection.querySelectorAll("button").forEach((button) => {

    button.disabled = true;

});        } catch (error) {

            console.error("EMBER booking error:", error);

            feedback.textContent =
                error.message || "Reservation could not be completed.";

            feedback.className = "booking-feedback error";

            submitButton.disabled = false;

            submitButton.textContent = "CONFIRM RESERVATION";

        } finally {

            submitting = false;

        }

    });

});
