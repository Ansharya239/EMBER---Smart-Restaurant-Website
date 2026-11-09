document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reservationForm");

    if (!form) return;

    const API = "http://127.0.0.1:8000";

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
        const response = await fetch(API + path, options);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "The request could not be completed.",
            );
        }

        return data;
    }

    // ==================================
    // VEHICLE SELECTION
    // ==================================

    document.querySelectorAll("[data-vehicle]").forEach((button) => {
        button.addEventListener("click", () => {
            vehicle = button.dataset.vehicle;

            document.querySelectorAll("[data-vehicle]").forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            parkingQuestion.hidden = false;

            parkingSection.hidden = true;

            parkingRequired = false;
            allocation = null;
            selectedSlot = null;
            slots = [];

            $("arrivalMessage").textContent = "";

            selectionDisplay.hidden = true;

            if (vehicle === "other") {
                $("arrivalMessage").textContent =
                    "Our dedicated parking currently supports cars and bikes. You can continue without a parking reservation.";
            }

            updateSummary();
        });
    });

    // ==================================
    // PARKING YES / NO
    // ==================================

    document.querySelectorAll("[data-parking]").forEach((button) => {
        button.addEventListener("click", async () => {
            const choice = button.dataset.parking;

            document.querySelectorAll("[data-parking]").forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            parkingRequired = choice === "yes";

            parkingSection.hidden = true;

            selectionDisplay.hidden = true;

            allocation = null;
            selectedSlot = null;

            if (!parkingRequired) {
                $("arrivalMessage").textContent =
                    "No parking requested. Your restaurant reservation will continue without a parking allocation.";

                updateSummary();

                return;
            }

            if (vehicle === "other") {
                $("arrivalMessage").textContent =
                    "Dedicated parking is currently available only for cars and bikes. Select No to continue without parking.";

                parkingRequired = false;

                button.classList.remove("active");

                updateSummary();

                return;
            }

            parkingSection.hidden = false;

            await loadSlots();
        });
    });

    // ==================================
    // LOAD INVENTORY
    // ==================================

    async function loadSlots() {
        parkingAvailability.textContent = "Checking parking availability...";

        try {
            slots = await apiRequest(
                "/api/parking/slots?branch_id=" +
                    encodeURIComponent(branch.value),
            );

            renderMap();
        } catch (error) {
            parkingAvailability.textContent = error.message;

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
    // BRANCH CHANGE
    // ==================================

    branch.addEventListener("change", async () => {
        selectedSlot = null;
        slots = [];

        selectionDisplay.hidden = true;

        if (parkingRequired) {
            await loadSlots();
        }

        updateSummary();
    });

    // ==================================
    // SUMMARY
    // ==================================

    function updateSummary() {
        const visible = !finalSection.hidden;

        if (!visible) return;

        summary.replaceChildren();

        const values = [
            ["Guest", $("name").value],
            ["Email", $("email").value],
            ["Branch", branch.value],
            ["Date", date.value],
            ["Time", time.value],
            ["Guests", $("guests").value],
            ["Dining Room", room.value],
            ["Arrival", vehicle || "Not selected"],
        ];

        if (parkingRequired) {
            values.push(
                ["Parking", allocation || "Not selected"],
                [
                    "Slot",
                    selectedSlot ? selectedSlot.id : "Automatic allocation",
                ],
            );
        } else {
            values.push(["Parking", "Not requested"]);
        }

        const heading = document.createElement("h4");
        heading.textContent = "EMBER Booking Summary";

        summary.appendChild(heading);

        values.forEach(([label, value]) => {
            const p = document.createElement("p");

            p.textContent = `${label}: ${value || "Not selected"}`;

            summary.appendChild(p);
        });
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

        if (!vehicle) {
            feedback.textContent = "Please select how you will be arriving.";
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

            vehicle_type: vehicle,

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

            confirmedBooking = result;

            finalSection.hidden = false;

            summary.replaceChildren();

            const heading = document.createElement("h4");
            heading.textContent = "Reservation Confirmed";

            summary.appendChild(heading);

            const details = [
                ["Booking ID", result.booking_id],
                ["Guest", result.reservation.name],
                ["Date", result.reservation.date],
                ["Time", result.reservation.time],
                ["Guests", result.reservation.guests],
                ["Dining Room", result.reservation.room],
            ];

            if (result.parking) {
                details.push(
                    ["Vehicle", result.parking.vehicle_type],
                    ["Parking Slot", result.parking.slot_id],
                    ["Distance", result.parking.distance + " metres"],
                    ["Parking Status", result.parking.status],
                );
            } else {
                details.push(["Parking", "Not requested"]);
            }

            details.forEach(([label, value]) => {
                const p = document.createElement("p");
                p.textContent = `${label}: ${value}`;
                summary.appendChild(p);
            });

            feedback.textContent =
                "Your EMBER reservation has been confirmed successfully.";

            feedback.className = "booking-feedback success";

            submitButton.textContent = "RESERVATION CONFIRMED";

            parkingSection.querySelectorAll("button").forEach((button) => {
                button.disabled = true;
            });
        } catch (error) {
            feedback.textContent = error.message;

            feedback.className = "booking-feedback error";

            submitButton.disabled = false;
            submitButton.textContent = "CONFIRM RESERVATION";
        } finally {
            submitting = false;
        }
    });
});
