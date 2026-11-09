document.addEventListener("DOMContentLoaded", () => {
    const parkingRoot = document.getElementById("emberParking");

    if (!parkingRoot) return;

    // ==========================================
    // CONFIGURATION
    // ==========================================

    const API_BASE = "http://127.0.0.1:8000";

    const BRANCH_ID = parkingRoot.dataset.branchId || "EMBER_NEW_DELHI";

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const arrivalButtons = document.querySelectorAll("[data-arrival]");

    const needStep = document.getElementById("parkingNeedStep");

    const needButtons = document.querySelectorAll("[data-parking-needed]");

    const parkingControls = document.getElementById("parkingControls");

    const unsupportedMessage = document.getElementById("parkingUnsupported");

    const accessibleCheckbox = document.getElementById("parkingAccessible");

    const availability = document.getElementById("parkingAvailability");

    const modeButtons = document.querySelectorAll("[data-parking-mode]");

    const mapPanel = document.getElementById("parkingMapPanel");

    const slotsGrid = document.getElementById("parkingSlotsGrid");

    const vehicleLabel = document.getElementById("parkingVehicleLabel");

    const selectionPanel = document.getElementById("parkingSelection");

    const selectionDetails = document.getElementById("parkingSelectionDetails");

    const confirmButton = document.getElementById("parkingConfirm");

    const cancelButton = document.getElementById("parkingCancel");

    const messageBox = document.getElementById("parkingMessage");

    // ==========================================
    // STATE
    // ==========================================

    let selectedVehicle = null;

    let allocationMode = null;

    let accessibleRequired = false;

    let allSlots = [];

    let selectedSlotId = null;

    let activeReservationId = null;

    let isLoading = false;

    // ==========================================
    // HELPERS
    // ==========================================

    function showMessage(message, type = "") {
        messageBox.textContent = message;

        messageBox.className = "parking-message";

        if (type) {
            messageBox.classList.add(type);
        }
    }

    function getEligibleSlots() {
        return allSlots.filter((slot) => {
            return (
                slot.vehicle_type === selectedVehicle &&
                Boolean(slot.is_accessible) === accessibleRequired
            );
        });
    }

    function getAvailableSlots() {
        return getEligibleSlots().filter((slot) => slot.status === "available");
    }

    function formatDistance(distance) {
        return `${Number(distance).toFixed(1)} m`;
    }

    function createReservationId() {
        return (
            "EMB-PARK-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 7).toUpperCase()
        );
    }

    // ==========================================
    // LOAD PARKING INVENTORY
    // ==========================================

    async function loadParkingSlots() {
        availability.textContent = "Loading parking availability...";

        try {
            const url =
                `${API_BASE}/api/parking/slots?branch_id=` +
                encodeURIComponent(BRANCH_ID);

            const response = await fetch(url);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Unable to load parking inventory.",
                );
            }

            if (!Array.isArray(data)) {
                throw new Error("Unexpected parking inventory response.");
            }

            allSlots = data;

            renderParkingLayout();
        } catch (error) {
            console.error("Parking loading error:", error);

            availability.textContent =
                "Unable to connect to EMBER parking. Make sure the Python backend is running.";

            showMessage(error.message, "error");

            allSlots = [];

            confirmButton.disabled = true;
        }
    }

    // ==========================================
    // VEHICLE SELECTION
    // ==========================================

    arrivalButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectedVehicle = button.dataset.arrival;

            allocationMode = null;

            selectedSlotId = null;

            allSlots = [];

            activeReservationId = null;

            parkingControls.hidden = true;

            unsupportedMessage.hidden = true;

            selectionPanel.hidden = true;

            mapPanel.hidden = true;

            needStep.hidden = false;

            accessibleCheckbox.checked = false;

            modeButtons.forEach((mode) => {
                mode.classList.remove("active");
            });

            arrivalButtons.forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            showMessage("");
        });
    });

    // ==========================================
    // PARKING REQUIRED?
    // ==========================================

    needButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            const required = button.dataset.parkingNeeded === "yes";

            parkingControls.hidden = true;

            unsupportedMessage.hidden = true;

            selectionPanel.hidden = true;

            if (!required) {
                showMessage("No parking space has been reserved.");

                return;
            }

            if (selectedVehicle !== "car" && selectedVehicle !== "bike") {
                unsupportedMessage.hidden = false;

                showMessage(
                    "Parking allocation is currently available for cars and bikes only.",
                );

                return;
            }

            parkingControls.hidden = false;

            await loadParkingSlots();
        });
    });

    // ==========================================
    // ACCESSIBLE PARKING TOGGLE
    // ==========================================

    accessibleCheckbox.addEventListener("change", () => {
        accessibleRequired = accessibleCheckbox.checked;

        selectedSlotId = null;

        selectionPanel.hidden = true;

        renderParkingLayout();
    });

    // ==========================================
    // UPDATE AVAILABILITY
    // ==========================================

    function updateAvailability() {
        const vehicleSlots = allSlots.filter(
            (slot) => slot.vehicle_type === selectedVehicle,
        );

        const available = getAvailableSlots();

        const total = vehicleSlots.length;

        availability.textContent =
            `${available.length} eligible spaces available out of ${total} total ` +
            `${selectedVehicle} spaces.`;

        if (available.length === 0) {
            availability.textContent = `No eligible ${selectedVehicle} parking spaces are currently available.`;
        }
    }

    // ==========================================
    // RENDER VISUAL PARKING LAYOUT
    // ==========================================

    function renderParkingLayout() {
        if (!selectedVehicle || allSlots.length === 0) {
            return;
        }

        const vehicleSlots = allSlots
            .filter((slot) => slot.vehicle_type === selectedVehicle)
            .sort((a, b) => a.id.localeCompare(b.id));

        vehicleLabel.textContent = selectedVehicle.toUpperCase() + " PARKING";

        updateAvailability();

        slotsGrid.innerHTML = "";

        vehicleSlots.forEach((slot) => {
            const status = String(slot.status).toLowerCase();

            const isAccessible = Boolean(slot.is_accessible);

            const isEligible = isAccessible === accessibleRequired;

            const isAvailable = status === "available";

            const isSelected = selectedSlotId === slot.id;

            const canSelect = isAvailable && isEligible && !activeReservationId;

            const slotButton = document.createElement("button");

            slotButton.type = "button";

            slotButton.className = "parking-slot";

            slotButton.classList.add(`is-${status}`);

            if (isAccessible) {
                slotButton.classList.add("is-accessible");
            }

            if (!isEligible) {
                slotButton.classList.add("is-ineligible");
            }

            if (isSelected) {
                slotButton.classList.add("is-selected");
            }

            slotButton.disabled = !canSelect;

            slotButton.innerHTML = `
                <strong>${slot.id}</strong>
                <small>${formatDistance(slot.distance)}</small>
            `;

            slotButton.title =
                `${slot.id} | ${formatDistance(slot.distance)} | ` +
                `${status} | ` +
                `${isAccessible ? "Accessible" : "Standard"}`;

            slotButton.setAttribute(
                "aria-label",
                `${slot.id}, ${status}, ${formatDistance(slot.distance)}`,
            );

            slotButton.addEventListener("click", () => {
                if (!canSelect) return;

                selectedSlotId = slot.id;

                renderParkingLayout();

                showSelection(slot);

                updateConfirmButton();
            });

            slotsGrid.appendChild(slotButton);
        });

        if (allocationMode === "manual" && !activeReservationId) {
            mapPanel.hidden = false;
        }

        updateConfirmButton();
    }

    // ==========================================
    // SLOT SELECTION SUMMARY
    // ==========================================

    function showSelection(slot) {
        selectionPanel.hidden = false;

        selectionDetails.replaceChildren();

        const details = [
            ["Parking Slot", slot.id],
            ["Vehicle", selectedVehicle.toUpperCase()],
            ["Distance", formatDistance(slot.distance)],
            ["Zone", slot.zone],
            ["Floor", slot.floor],
        ];

        details.forEach(([label, value]) => {
            const item = document.createElement("div");

            item.className = "parking-detail-item";

            const small = document.createElement("small");

            small.textContent = label;

            const strong = document.createElement("strong");

            strong.textContent = value;

            item.append(small, strong);

            selectionDetails.appendChild(item);
        });
    }

    // ==========================================
    // ALLOCATION MODE
    // ==========================================

    modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            allocationMode = button.dataset.parkingMode;

            selectedSlotId = null;

            selectionPanel.hidden = true;

            modeButtons.forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            if (allocationMode === "manual") {
                mapPanel.hidden = false;

                renderParkingLayout();
            } else {
                mapPanel.hidden = true;
            }

            updateConfirmButton();
        });
    });

    // ==========================================
    // CONFIRM BUTTON STATE
    // ==========================================

    function updateConfirmButton() {
        if (activeReservationId) {
            confirmButton.disabled = true;

            confirmButton.textContent = "Parking Confirmed";

            return;
        }

        if (!allocationMode || isLoading) {
            confirmButton.disabled = true;

            return;
        }

        if (allocationMode === "manual") {
            confirmButton.disabled = !selectedSlotId;
        } else {
            confirmButton.disabled = getAvailableSlots().length === 0;
        }

        confirmButton.textContent =
            allocationMode === "manual"
                ? "Confirm Selected Space"
                : "Allocate My Parking";
    }

    // ==========================================
    // RESERVE PARKING
    // ==========================================

    confirmButton.addEventListener("click", async () => {
        if (!selectedVehicle || !allocationMode) return;

        if (allocationMode === "manual" && !selectedSlotId) {
            return;
        }

        if (activeReservationId || isLoading) return;

        isLoading = true;

        confirmButton.disabled = true;

        showMessage("Securing your parking space...");

        const reservationId = createReservationId();

        const payload = {
            reservation_id: reservationId,
            branch_id: BRANCH_ID,
            vehicle_type: selectedVehicle,
            allocation_mode: allocationMode,
            accessible_required: accessibleRequired,
        };

        if (allocationMode === "manual") {
            payload.slot_id = selectedSlotId;
        }

        try {
            const response = await fetch(`${API_BASE}/api/parking/reserve`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Parking reservation failed.");
            }

            activeReservationId = reservationId;

            selectedSlotId = data.id;

            selectionPanel.hidden = false;

            showSelection(data);

            showMessage(
                `Your parking space ${data.id} has been reserved successfully. ` +
                    `It is ${formatDistance(data.distance)} from the entrance.`,
                "success",
            );

            cancelButton.hidden = false;

            await loadParkingSlots();

            renderParkingLayout();

            showSelection(data);
        } catch (error) {
            console.error("Parking reservation error:", error);

            showMessage(error.message, "error");
        } finally {
            isLoading = false;

            updateConfirmButton();
        }
    });

    // ==========================================
    // CANCEL PARKING
    // ==========================================

    cancelButton.addEventListener("click", async () => {
        if (!activeReservationId || isLoading) return;

        isLoading = true;

        cancelButton.disabled = true;

        showMessage("Cancelling your parking reservation...");

        try {
            const url =
                `${API_BASE}/api/parking/reservations/` +
                `${encodeURIComponent(BRANCH_ID)}/` +
                `${encodeURIComponent(activeReservationId)}`;

            const response = await fetch(url, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Unable to cancel parking.");
            }

            activeReservationId = null;

            selectedSlotId = null;

            cancelButton.hidden = true;

            cancelButton.disabled = false;

            selectionPanel.hidden = true;

            await loadParkingSlots();

            showMessage(
                data.message || "Parking reservation cancelled successfully.",
                "success",
            );
        } catch (error) {
            console.error("Parking cancellation error:", error);

            showMessage(error.message, "error");

            cancelButton.disabled = false;
        } finally {
            isLoading = false;

            updateConfirmButton();
        }
    });
});
