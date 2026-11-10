(() => {
    "use strict";

    // =====================================
    // EMBER MAP CONFIGURATION
    // =====================================

    const DEFAULT_CENTER = [28.6139, 77.209];

    const MAX_RADIUS_KM = 25;

    const MIN_DISTANCE_KM = 5.2;

    const RESTAURANT_COUNT = 20;

    const EARTH_RADIUS_KM = 6371.0088;

    // =====================================
    // HTML ELEMENTS
    // =====================================

    const mapElement = document.getElementById("ember-map");

    const statusElement = document.getElementById("map-status");

    const errorElement = document.getElementById("map-error");

    const searchForm = document.getElementById("place-search");

    const searchInput = document.getElementById("place-query");

    const locateButton = document.getElementById("locate-button");

    function showStatus(message) {
        statusElement.textContent = message;
    }

    function showError(message) {
        errorElement.textContent = message;
    }

    if (
        !mapElement ||
        !statusElement ||
        !errorElement ||
        !searchForm ||
        !searchInput ||
        !locateButton
    ) {
        console.error("EMBER map elements missing.");

        return;
    }

    if (typeof L === "undefined") {
        showError(
            "Map library failed to load. Check your internet connection.",
        );

        return;
    }

    // =====================================
    // INITIALIZE MAP
    // =====================================

    const map = L.map("ember-map", {
        scrollWheelZoom: true,
    }).setView(DEFAULT_CENTER, 10);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,

        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // =====================================
    // MAP STATE
    // =====================================

    let currentCenter = [...DEFAULT_CENTER];

    let currentCenterName = "New Delhi map centre";

    let userCoordinates = null;

    let userMarker = null;

    let accuracyCircle = null;

    let rangeCircle = null;

    const restaurantLayer = L.layerGroup().addTo(map);

    // =====================================
    // RESTAURANT PROFILES
    // =====================================

    // These profiles are illustrative.
    // Replace them with verified business
    // and customer-review data when available.

    const restaurantProfiles = [
        {
            name: "The Copper Table",
            rating: 4.8,
            review: "Beautiful ambience and an excellent dining experience.",
        },

        {
            name: "Juniper Kitchen",
            rating: 4.6,
            review: "Great presentation, attentive service and delicious food.",
        },

        {
            name: "The Olive Room",
            rating: 4.7,
            review: "A lovely setting for a relaxed evening.",
        },

        {
            name: "Saffron & Smoke",
            rating: 4.5,
            review: "A wonderful menu with interesting flavours.",
        },

        {
            name: "The Golden Fork",
            rating: 4.9,
            review: "An elegant atmosphere and a memorable meal.",
        },

        {
            name: "Velvet Dining",
            rating: 4.4,
            review: "A comfortable place with a welcoming atmosphere.",
        },

        {
            name: "The Garden Plate",
            rating: 4.7,
            review: "Fresh ingredients and thoughtful presentation.",
        },

        {
            name: "Ember & Oak",
            rating: 4.8,
            review: "Excellent food in a beautifully designed space.",
        },

        {
            name: "The Dining Atelier",
            rating: 4.3,
            review: "A peaceful place for a nice dinner.",
        },

        {
            name: "Cedar House",
            rating: 4.6,
            review: "Good food and a comfortable dining experience.",
        },

        {
            name: "Maison Bistro",
            rating: 4.5,
            review: "An enjoyable menu and friendly service.",
        },

        {
            name: "The Pearl Kitchen",
            rating: 4.9,
            review: "A refined dining experience with great attention to detail.",
        },

        {
            name: "Olive & Thyme",
            rating: 4.4,
            review: "A pleasant atmosphere and interesting dishes.",
        },

        {
            name: "The Heritage Table",
            rating: 4.7,
            review: "An inviting restaurant with lovely presentation.",
        },

        {
            name: "Amber Courtyard",
            rating: 4.6,
            review: "A great setting for an evening with friends.",
        },

        {
            name: "The Modern Plate",
            rating: 4.8,
            review: "Creative dishes and an impressive atmosphere.",
        },

        {
            name: "Rosewood Dining",
            rating: 4.5,
            review: "A comfortable place with a varied menu.",
        },

        {
            name: "The Blue Fig",
            rating: 4.3,
            review: "Good ambience and a relaxed dining experience.",
        },

        {
            name: "The Ivory Table",
            rating: 4.9,
            review: "Beautiful interiors and carefully prepared food.",
        },

        {
            name: "Crown & Clover",
            rating: 4.6,
            review: "A lovely experience with attentive service.",
        },
    ];

    // =====================================
    // DISTANCE CALCULATION
    // HAVERSINE FORMULA
    // =====================================

    function calculateDistance(point1, point2) {
        const toRadians = (value) => (value * Math.PI) / 180;

        const lat1 = toRadians(point1[0]);

        const lon1 = toRadians(point1[1]);

        const lat2 = toRadians(point2[0]);

        const lon2 = toRadians(point2[1]);

        const dLat = lat2 - lat1;

        const dLon = lon2 - lon1;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),

                Math.sqrt(1 - a),
            );

        return EARTH_RADIUS_KM * c;
    }

    function formatDistance(distance) {
        if (distance < 1) {
            return Math.round(distance * 1000) + " m";
        }

        return distance.toFixed(1) + " km";
    }

    // =====================================
    // RANDOM EARTH COORDINATES
    // =====================================

    function generateRandomPoint(center) {
        // Uniform distribution inside a circle.

        const distance = MAX_RADIUS_KM * Math.sqrt(Math.random());

        const bearing = Math.random() * 2 * Math.PI;

        const angularDistance = distance / EARTH_RADIUS_KM;

        const lat1 = (center[0] * Math.PI) / 180;

        const lon1 = (center[1] * Math.PI) / 180;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(angularDistance) +
                Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
        );

        const lon2 =
            lon1 +
            Math.atan2(
                Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),

                Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
            );

        return [
            (lat2 * 180) / Math.PI,

            (((lon2 * 180) / Math.PI + 540) % 360) - 180,
        ];
    }

    // =====================================
    // SHUFFLE PROFILES
    // =====================================

    function shuffle(array) {
        const result = [...array];

        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [result[i], result[j]] = [result[j], result[i]];
        }

        return result;
    }

    // =====================================
    // GENERATE RESTAURANTS
    // =====================================

    function generateRestaurants(center) {
        const restaurants = [];

        const profiles = shuffle(restaurantProfiles);

        let attempts = 0;

        const maximumAttempts = 15000;

        while (
            restaurants.length < RESTAURANT_COUNT &&
            attempts < maximumAttempts
        ) {
            attempts++;

            const coordinates = generateRandomPoint(center);

            // Check maximum radius.

            const distanceFromCenter = calculateDistance(center, coordinates);

            if (distanceFromCenter > MAX_RADIUS_KM) {
                continue;
            }

            // Check minimum distance from every other restaurant.

            const tooClose = restaurants.some((restaurant) => {
                const distance = calculateDistance(
                    coordinates,

                    restaurant.coordinates,
                );

                return distance < MIN_DISTANCE_KM;
            });

            if (tooClose) {
                continue;
            }

            restaurants.push({
                ...profiles[restaurants.length],

                coordinates,

                distance: distanceFromCenter,
            });
        }

        return restaurants;
    }

    // =====================================
    // HTML ESCAPING
    // =====================================

    function escapeHTML(value) {
        return String(value).replace(
            /[&<>"']/g,

            (character) =>
                ({
                    "&": "&amp;",

                    "<": "&lt;",

                    ">": "&gt;",

                    '"': "&quot;",

                    "'": "&#039;",
                })[character],
        );
    }

    // =====================================
    // STAR DISPLAY
    // =====================================

    function generateStars(rating) {
        const filledStars = Math.round(rating);

        const emptyStars = 5 - filledStars;

        return "★".repeat(filledStars) + "☆".repeat(emptyStars);
    }

    // =====================================
    // GOOGLE MAPS DIRECTIONS
    // =====================================

    function getGoogleMapsLink(coordinates) {
        const destination = `${coordinates[0]},${coordinates[1]}`;

        const params = new URLSearchParams({
            api: "1",

            destination,

            travelmode: "driving",
        });

        // Use actual device location when available.

        if (userCoordinates) {
            params.set(
                "origin",

                `${userCoordinates[0]},${userCoordinates[1]}`,
            );
        }

        return "https://www.google.com/maps/dir/?" + params.toString();
    }

    // =====================================
    // RANGE CIRCLE
    // =====================================

    function updateRangeCircle(center) {
        if (!rangeCircle) {
            rangeCircle = L.circle(center, {
                radius: MAX_RADIUS_KM * 1000,

                color: "#d9a85f",

                weight: 1,

                opacity: 0.65,

                dashArray: "7 7",

                fillColor: "#d9a85f",

                fillOpacity: 0.025,
            }).addTo(map);
        } else {
            rangeCircle.setLatLng(center);
        }
    }

    // =====================================
    // CREATE RESTAURANT MARKER
    // =====================================

    function createRestaurantMarker(restaurant) {
        const markerIcon = L.divIcon({
            className: "ember-restaurant-marker",

            html: `

                <span class="restaurant-pin">

                    <b>R</b>

                </span>

            `,

            iconSize: [36, 36],

            iconAnchor: [18, 18],
        });

        const marker = L.marker(
            restaurant.coordinates,

            {
                icon: markerIcon,

                keyboard: true,
            },
        ).addTo(restaurantLayer);

        const rating = restaurant.rating;

        const stars = generateStars(rating);

        const distance = formatDistance(
            calculateDistance(
                currentCenter,

                restaurant.coordinates,
            ),
        );

        const safeName = escapeHTML(restaurant.name);

        const safeReview = escapeHTML(restaurant.review);

        // HOVER CARD

        const tooltipHTML = `

            <div class="ember-hover-card">

                <div class="hover-name">

                    ${safeName}

                </div>


                <div class="hover-rating">

                    <span class="hover-stars">
                        ${stars}
                    </span>

                    <strong>
                        ${rating.toFixed(1)} / 5
                    </strong>

                </div>


                <div class="hover-review-title">

                    REVIEW PREVIEW

                </div>


                <p class="hover-review">

                    "${safeReview}"

                </p>


                <div class="hover-distance">

                    ↗ ${distance} away

                </div>


                <small class="review-disclaimer">

                    Illustrative review · Not verified customer feedback

                </small>

            </div>

        `;

        marker.bindTooltip(
            tooltipHTML,

            {
                direction: "top",

                sticky: true,

                opacity: 1,

                className: "ember-hover-tooltip",
            },
        );

        // CLICK POPUP

        const popupHTML = `

            <div class="ember-popup">

                <h3>${safeName}</h3>


                <div class="popup-rating">

                    <span>${stars}</span>

                    <strong>
                        ${rating.toFixed(1)} / 5
                    </strong>

                </div>


                <p>

                    <strong>Distance:</strong>

                    ${distance}

                </p>


                <p class="popup-review">

                    "${safeReview}"

                </p>


                <small>

                    Illustrative review preview, not verified customer feedback.

                </small>


                <a

                    class="google-directions"

                    href="${getGoogleMapsLink(restaurant.coordinates)}"

                    target="_blank"

                    rel="noopener noreferrer"

                >

                    Get Directions ↗

                </a>

            </div>

        `;

        marker.bindPopup(popupHTML);
    }

    // =====================================
    // DISPLAY RESTAURANTS
    // =====================================

    function displayRestaurants() {
        restaurantLayer.clearLayers();

        const restaurants = generateRestaurants(currentCenter);

        restaurants.forEach((restaurant) => {
            createRestaurantMarker(restaurant);
        });

        updateRangeCircle(currentCenter);

        showStatus(
            `${restaurants.length} preview listings · Within 25 km of ${currentCenterName} · At least 5.2 km apart.`,
        );

        return restaurants.length;
    }

    // =====================================
    // MOVE TO LOCATION
    // =====================================

    function moveToLocation(name, coordinates) {
        currentCenter = [...coordinates];

        currentCenterName = name;

        map.setView(
            currentCenter,

            10,
        );

        displayRestaurants();

        showError("");
    }

    // =====================================
    // INITIAL MAP
    // =====================================

    displayRestaurants();

    // =====================================
    // QUICK RECOMMENDATIONS
    // =====================================

    const quickLocations = {
        "Connaught Place": [28.6315, 77.2167],

        "India Gate": [28.6129, 77.2295],

        "Hauz Khas": [28.5494, 77.2001],

        "Cyber Hub, Gurugram": [28.495, 77.0895],
    };

    document.querySelectorAll("[data-place]").forEach((button) => {
        button.addEventListener("click", () => {
            const name = button.dataset.place;

            const coordinates = quickLocations[name];

            if (!coordinates) return;

            searchInput.value = name;

            moveToLocation(name, coordinates);
        });
    });

    // =====================================
    // SEARCH
    // =====================================

    searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const query = searchInput.value.trim();

        if (query.length < 2) {
            showError("Enter a location to search.");

            return;
        }

        if (quickLocations[query]) {
            moveToLocation(query, quickLocations[query]);

            return;
        }

        showError("");

        showStatus("Searching for " + query + "...");

        try {
            const response = await fetch(
                "https://photon.komoot.io/api/?q=" +
                    encodeURIComponent(query) +
                    "&limit=1",
            );

            if (!response.ok) {
                throw new Error("Location search service unavailable.");
            }

            const data = await response.json();

            const feature = data.features?.[0];

            if (!feature) {
                throw new Error("Location not found.");
            }

            const [longitude, latitude] = feature.geometry.coordinates;

            const properties = feature.properties || {};

            const name =
                [properties.name, properties.city, properties.country]

                    .filter(Boolean)

                    .join(", ") || query;

            moveToLocation(
                name,

                [latitude, longitude],
            );
        } catch (error) {
            showError(error.message);

            showStatus("Search could not be completed.");
        }
    });

    // =====================================
    // LOCATE ME
    // =====================================

    locateButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
            showError("Location is not supported by this browser.");

            return;
        }

        locateButton.disabled = true;

        locateButton.textContent = "Locating...";

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;

                const longitude = position.coords.longitude;

                const accuracy = position.coords.accuracy;

                userCoordinates = [latitude, longitude];

                currentCenter = [...userCoordinates];

                currentCenterName = "your location";

                // USER LOCATION MARKER

                if (!userMarker) {
                    userMarker = L.circleMarker(
                        currentCenter,

                        {
                            radius: 9,

                            color: "#ffffff",

                            weight: 3,

                            fillColor: "#2588ed",

                            fillOpacity: 1,
                        },
                    ).addTo(map);

                    userMarker.bindPopup("Your current location");
                } else {
                    userMarker.setLatLng(currentCenter);
                }

                // ACCURACY CIRCLE

                if (!accuracyCircle) {
                    accuracyCircle = L.circle(
                        currentCenter,

                        {
                            radius: accuracy,

                            color: "#2588ed",

                            weight: 1,

                            fillColor: "#2588ed",

                            fillOpacity: 0.08,
                        },
                    ).addTo(map);
                } else {
                    accuracyCircle.setLatLng(currentCenter);

                    accuracyCircle.setRadius(accuracy);
                }

                map.setView(
                    currentCenter,

                    10,
                );

                // REGENERATE ALL LOCATIONS

                displayRestaurants();

                showError("");

                locateButton.disabled = false;

                locateButton.textContent = "◎ Locate Me";
            },

            (error) => {
                const messages = {
                    1: "Location permission denied.",

                    2: "Your location is unavailable.",

                    3: "Location request timed out.",
                };

                showError(
                    messages[error.code] ||
                        "Unable to determine your location.",
                );

                locateButton.disabled = false;

                locateButton.textContent = "◎ Locate Me";
            },

            {
                enableHighAccuracy: true,

                timeout: 15000,

                maximumAge: 30000,
            },
        );
    });

    // =====================================
    // RESIZE FIX
    // =====================================

    window.addEventListener("load", () => {
        setTimeout(
            () => map.invalidateSize(),

            150,
        );
    });

    window.addEventListener("resize", () => {
        map.invalidateSize();
    });

    console.log("EMBER restaurant discovery map initialized.");
})();
