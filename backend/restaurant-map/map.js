// EMBER - CURRENT LOCATION RESTAURANT FINDER

const map = L.map("ember-map").setView([20.5937, 78.9629], 5);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(map);

const status = document.getElementById("nearest-branch");
const error = document.getElementById("map-error");

const restaurantNames = [
  "EMBER Kitchen", "Urban Spice", "Food Junction",
  "Royal Bites", "The Hungry Fork", "Spice Garden",
  "Urban Tandoor", "Curry House", "Flame & Grill",
  "Taste Corner", "Golden Plate", "Desi Kitchen",
  "Food Street", "The Green Bowl", "Masala Point",
  "City Diner", "The Food Hub", "Grill Station",
  "Royal Rasoi", "The Tasty Table"
];

const ratings = [
  4.5, 4.2, 4.7, 4.1, 4.3,
  4.6, 4.0, 4.4, 4.8, 4.2,
  4.5, 4.1, 4.3, 4.7, 4.0,
  4.6, 4.2, 4.4, 4.8, 4.3
];

const years = [
  5, 3, 8, 2, 6, 4, 7, 3, 9, 5,
  2, 6, 4, 8, 3, 7, 5, 2, 10, 4
];

let userMarker = null;
let accuracyCircle = null;
let restaurantMarkers = [];
let firstLocation = true;

const userIcon = L.divIcon({
  className: "user-location-icon",
  html: '<div class="user-pulse"><span></span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const restaurantIcon = L.divIcon({
  className: "restaurant-icon",
  html: '<div class="restaurant-pulse"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function createRestaurants(lat, lng) {

  // Remove old demo markers
  restaurantMarkers.forEach(marker => map.removeLayer(marker));
  restaurantMarkers = [];

  // 20 demo locations around current location
  for (let i = 0; i < 20; i++) {

    const angle = (i * 137.5) * Math.PI / 180;
    const distance = 350 + (i % 5) * 300;

    const offsetLat = (distance * Math.cos(angle)) / 111320;
    const offsetLng =
      (distance * Math.sin(angle)) /
      (111320 * Math.cos(lat * Math.PI / 180));

    const restaurantLat = lat + offsetLat;
    const restaurantLng = lng + offsetLng;

    const restaurant = L.marker(
      [restaurantLat, restaurantLng],
      { icon: restaurantIcon }
    ).addTo(map);

    const info = `
      <div class="ember-info">
        <strong><span class="ember-brand">EMBER</span> ${restaurantNames[i]}</strong>
        <div>⭐ Rating: ${ratings[i]}/5</div>
        <div>Established: ${years[i]} years ago</div>
        <small>Demo restaurant data</small>
      </div>
    `;

    restaurant.bindTooltip(info, {
      direction: "top",
      className: "ember-tooltip",
      sticky: true
    });

    restaurant.bindPopup(info);

    restaurantMarkers.push(restaurant);
  }
}

function updateLocation(position) {

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  if (!userMarker) {
    userMarker = L.marker(
      [lat, lng],
      { icon: userIcon, zIndexOffset: 1000 }
    ).addTo(map);

    userMarker.bindPopup("<b>Your Current Location</b>");
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  if (!accuracyCircle) {
    accuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      color: "#36a9ff",
      fillColor: "#36a9ff",
      fillOpacity: 0.10,
      weight: 1
    }).addTo(map);
  } else {
    accuracyCircle.setLatLng([lat, lng]);
    accuracyCircle.setRadius(accuracy);
  }

  createRestaurants(lat, lng);

  if (firstLocation) {
    map.setView([lat, lng], 14);
    userMarker.openPopup();
    firstLocation = false;
  }

  status.textContent =
    "20 demo restaurants found around your location.";
  error.textContent = "";
}

function locationError(err) {

  const messages = {
    1: "Location permission denied. Please allow location access.",
    2: "Your location is currently unavailable.",
    3: "Location request timed out. Please try again."
  };

  error.textContent =
    messages[err.code] || "Unable to detect your location.";

  status.textContent = "Waiting for location permission...";
}

// Request and track current location
if ("geolocation" in navigator) {

  status.textContent = "Detecting your current location...";

  navigator.geolocation.watchPosition(
    updateLocation,
    locationError,
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000
    }
  );

} else {
  error.textContent = "Geolocation is not supported by this browser.";
}

console.log("EMBER Location Restaurant Finder initialized.");