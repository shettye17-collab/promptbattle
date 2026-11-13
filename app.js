
// RURAL JARVIS - Front-end prototype
// All bus positions and arrival times are simulated.
const $ = (id) => document.getElementById(id);

const demo = {
  user: { lat: 12.9141, lng: 74.8560 },
  stop: {
    lat: 12.9160,
    lng: 74.8580,
    name: "Main Village Stop"
  },

  buses: [
    {
      id: "RJ-04",
      name: "Village – College",
      route: "Main Village → Town → College",
      status: "moving",
      eta: 8,
      distance: 2.4,
      lat: 12.9250,
      lng: 74.8660,
      capacity: "Unknown",
      note: "Moving normally · simulated GPS"
    },
    {
      id: "RJ-07",
      name: "Market – College",
      route: "Market Road → College",
      status: "moving",
      eta: 16,
      distance: 4.8,
      lat: 12.9400,
      lng: 74.8750,
      capacity: "Seats not verified",
      note: "Alternative service · simulated GPS"
    },
    {
      id: "RJ-11",
      name: "Temple – College",
      route: "Temple Junction → College",
      status: "delayed",
      eta: 22,
      distance: 6.1,
      lat: 12.9500,
      lng: 74.8900,
      capacity: "Seats not verified",
      note: "Reported delay · simulated data"
    }
  ]
};

let selectedBus = demo.buses[0];
let reminderEnabled = true;

let map;
let userMarker;
let busMarkers = [];
let userCoords = null;
let toastTimer;


// DISPLAY MESSAGE

function toast(message) {
  const el = $("toast");

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}


// BUS STATUS

function statusText(status) {
  const labels = {
    moving: "● MOVING",
    delayed: "● DELAYED",
    stopped: "● STOPPED",
    cancelled: "● CANCELLED",
    unknown: "● UNKNOWN"
  };

  return labels[status] || "● UNKNOWN";
}

function statusClass(status) {
  if (status === "moving") return "moving";
  if (status === "delayed") return "delayed";
  return "stopped";
}


// TIME CALCULATION

function clockPlus(minutes) {
  const date = new Date(Date.now() + minutes * 60000);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}


// HOME DASHBOARD


// HOME DASHBOARD

function renderHome() {
  $("routeId").textContent = "ROUTE " + selectedBus.id;

  $("nextBusName").textContent = selectedBus.name;

  $("busStatus").textContent =
    statusText(selectedBus.status);

  $("busStatus").className =
    "status-pill " + statusClass(selectedBus.status);

  $("eta").textContent =
    String(selectedBus.eta).padStart(2, "0");

  $("distance").textContent =
    selectedBus.distance.toFixed(1) + " km";

  $("busTime").textContent =
    clockPlus(selectedBus.eta);

  $("busNote").textContent =
    selectedBus.note + " · Capacity: " + selectedBus.capacity;

  $("busProgress").style.width =
    Math.max(8, Math.min(95, 100 - selectedBus.eta * 5)) + "%";

  updateLeaveTime();

  $("mapBusTitle").textContent =
    selectedBus.id + " · " + selectedBus.name;

  $("mapBusInfo").textContent =
    selectedBus.note + " Bus position is simulated.";
}



// SMART LEAVE TIME

function updateLeaveTime() {
  const walk = +$("walkRange").value;
  const buffer = +$("bufferRange").value;
  const lead = +$("leadRange").value;

  $("walkValue").textContent = walk;
  $("bufferValue").textContent = buffer;
  $("leadValue").textContent = lead;

  const minutesLeft =
    selectedBus.eta - walk - buffer - lead;

  const departureDate =
    new Date(Date.now() + minutesLeft * 60000);

  const label = departureDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  $("leaveTime").textContent =
    minutesLeft <= 0
      ? "Leave now"
      : "Leave at " + label;

  $("leaveDetail").textContent =
    walk + " min walking time + " +
    buffer + " min safety buffer" +
    (lead ? " + " + lead + " min extra alert" : "");
}


// ROUTES

function renderRoutes() {
  $("routeList").innerHTML = demo.buses.map(bus => `
    <button class="route-card" data-bus="${bus.id}">
      <span class="route-icon">🚌</span>

      <span class="route-main">
        <strong>${bus.id} · ${bus.name}</strong>
        <p>${bus.route}</p>
        <p>${statusText(bus.status)} · ${bus.capacity}</p>
      </span>

      <span class="route-eta">
        ${bus.eta} min
        <small>estimated</small>
      </span>
    </button>
  `).join("");

  document.querySelectorAll("[data-bus]").forEach(button => {
    button.addEventListener("click", () => {
      selectedBus = demo.buses.find(
        bus => bus.id === button.dataset.bus
      );

      renderHome();
      showView("homeView");

      toast("Tracking " + selectedBus.id);
    });
  });
}


// NOTIFICATIONS

function addNotice(title, detail, symbol = "✧") {
  const list = $("notificationList");

  const div = document.createElement("article");
  div.className = "notice-card";

  div.innerHTML = `
    <span class="notice-symbol">${symbol}</span>
    <div>
      <strong></strong>
      <p></p>
    </div>
  `;

  div.querySelector("strong").textContent = title;
  div.querySelector("p").textContent = detail;

  list.prepend(div);
}


// ALTERNATIVE BUSES

function renderAlternatives() {
  const alternatives = demo.buses
    .filter(bus =>
      bus.id !== selectedBus.id &&
      bus.status !== "cancelled"
    )
    .sort((a, b) => a.eta - b.eta);

  if (!alternatives.length) {
    toast("No alternatives found.");
    return;
  }

  const best = alternatives[0];

  addNotice(
    "Alternative bus suggestion",
    best.id + " may be an option. Estimated " +
    best.eta + " minutes. This is demo data; verify with the operator.",
    "⇄"
  );

  showView("notificationsView");

  toast("Suggested " + best.id + " · " + best.eta + " min (demo)");
}


// PAGE NAVIGATION

function showView(viewId) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.view === viewId
    );
  });

  if (viewId === "mapView") {
    setTimeout(() => {
      initMap();

      if (map) map.invalidateSize();
    }, 80);
  }
}


// MAP

function initMap() {
  if (map || !window.L) return;

  map = L.map("map").setView(
    [demo.user.lat, demo.user.lng],
    13
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }
  ).addTo(map);

  userMarker = L.circleMarker(
    [demo.user.lat, demo.user.lng],
    {
      radius: 8,
      color: "#fff",
      weight: 2,
      fillColor: "#478cff",
      fillOpacity: 1
    }
  ).addTo(map).bindPopup("Demo student location");

  L.marker([
    demo.stop.lat,
    demo.stop.lng
  ]).addTo(map).bindPopup(demo.stop.name);

  updateMapBuses();
}


function updateMapBuses() {
  if (!map) return;

  busMarkers.forEach(marker => {
    map.removeLayer(marker);
  });

  busMarkers = [];

  demo.buses.forEach(bus => {
    const marker = L.circleMarker(
      [bus.lat, bus.lng],
      {
        radius: 8,
        color: "#eaffff",
        weight: 2,
        fillColor: "#36d9f5",
        fillOpacity: 1
      }
    ).addTo(map);

    marker.bindPopup(
      bus.id + " · " + bus.name +
      "<br>" + statusText(bus.status) +
      "<br>" + bus.eta + " min ETA (demo)"
    );

    busMarkers.push(marker);
  });
}


// SIMULATED BUS MOVEMENT

function moveDemoBuses() {
  demo.buses.forEach(bus => {

    // These coordinate changes are only for demonstration.

    if (bus.status === "moving") {
      bus.lat -= 0.00018;
      bus.lng -= 0.00012;

      bus.eta = Math.max(1, bus.eta - 1);

      bus.distance = Math.max(
        0.2,
        bus.distance - 0.12
      );

    } else if (bus.status === "delayed") {

      if (Math.random() > 0.65) {
        bus.eta += 1;
      }
    }
  });

  renderHome();
  updateMapBuses();
}


// STUDENT PHONE GPS

function locateUser() {
  if (!navigator.geolocation) {
    toast("GPS is not supported by this browser.");
    return;
  }

  toast("Requesting location permission…");

  navigator.geolocation.getCurrentPosition(
    position => {
      userCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      if (map) {
        map.setView([
          userCoords.lat,
          userCoords.lng
        ], 15);

        userMarker.setLatLng([
          userCoords.lat,
          userCoords.lng
        ]).bindPopup("Your current location");
      }

      toast("Your location is available.");

      addNotice(
        "Location updated",
        "Your current location was accessed after permission.",
        "⌖"
      );
    },

    error => {
      toast(
        error.code === 1
          ? "Location permission was denied."
          : "Could not get GPS location. Check device settings."
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
}


// JARVIS CHAT RESPONSES

function answerQuestion(question) {
  const text = question.toLowerCase();

  if (
    text.includes("where") ||
    text.includes("location") ||
    text.includes("track")
  ) {
    return "Your selected bus is " +
      selectedBus.id + ", " +
      selectedBus.distance.toFixed(1) +
      " km from the stop. Estimated arrival: " +
      selectedBus.eta +
      " minutes. This is simulated demo data.";
  }

  if (
    text.includes("start") ||
    text.includes("moving")
  ) {
    return selectedBus.status === "moving"
      ? selectedBus.id + " is marked as moving in the demo GPS feed."
      : selectedBus.id + " is marked " +
        selectedBus.status +
        ". Live operational status is not verified.";
  }

  if (
    text.includes("another") ||
    text.includes("alternative") ||
    text.includes("other bus")
  ) {
    const alternatives = demo.buses
      .filter(bus =>
        bus.id !== selectedBus.id &&
        bus.status !== "cancelled"
      )
      .sort((a, b) => a.eta - b.eta);

    return alternatives.length
      ? "The quickest listed demo alternative is " +
        alternatives[0].id +
        ". Please verify the service before travelling."
      : "No alternative buses are listed.";
  }

  if (
    text.includes("leave") ||
    text.includes("when should")
  ) {
    return $("leaveTime").textContent +
      ". " + $("leaveDetail").textContent;
  }

  if (
    text.includes("capacity") ||
    text.includes("seat") ||
    text.includes("full")
  ) {
    return "Passenger capacity is not connected to a verified sensor. I cannot confirm available seats.";
  }

  return "I can help with bus location, movement status, departure timing and alternative routes.";
}


function sendChat(message) {
  const question = message.trim();

  if (!question) return;

  const area = $("chatMessages");

  const userMessage = document.createElement("div");
  userMessage.className = "bubble user";
  userMessage.textContent = question;

  area.appendChild(userMessage);

  const reply = document.createElement("div");
  reply.className = "bubble jarvis";
  reply.textContent = answerQuestion(question);

  const meta = document.createElement("small");
  meta.textContent = "JARVIS · DEMO";

  reply.appendChild(meta);
  area.appendChild(reply);

  area.scrollTop = area.scrollHeight;
}


// VOICE INPUT

function voiceInput() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toast("Voice input is not supported here.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.interimResults = false;

  $("assistantStatus").textContent = "Listening…";

  recognition.onresult = event => {
    const question =
      event.results[0][0].transcript;

    showView("assistantView");
    sendChat(question);

    $("assistantStatus").textContent =
      "Ready for your next command.";
  };

  recognition.onerror = () => {
    $("assistantStatus").textContent =
      "Voice input unavailable.";

    toast("Could not hear that. Please try again.");
  };

  recognition.onend = () => {
    if ($("assistantStatus").textContent === "Listening…") {
      $("assistantStatus").textContent = "Ready when you are.";
    }
  };

  recognition.start();
}


// BROWSER NOTIFICATIONS

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    toast("Notifications are not supported.");
    return;
  }

  Notification.requestPermission().then(permission => {
    toast(
      permission === "granted"
        ? "Browser notifications enabled."
        : "Notification permission not granted."
    );
  });
}


// EVENT LISTENERS

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    showView(button.dataset.view);
  });
});


document.querySelectorAll(".quick-action").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "bus") showView("mapView");
    if (action === "alternate") renderAlternatives();
    if (action === "routes") showView("routesView");
    if (action === "assistant") showView("assistantView");
  });
});


$("trackBusBtn").addEventListener("click", () => {
  showView("mapView");
});

$("locationBtn").addEventListener("click", locateUser);

$("micBtn").addEventListener("click", voiceInput);


$("reminderBtn").addEventListener("click", () => {
  reminderEnabled = !reminderEnabled;

  $("reminderBtn").classList.toggle(
    "on",
    reminderEnabled
  );

  toast(
    reminderEnabled
      ? "Reminder enabled"
      : "Reminder paused"
  );
});


["walkRange", "bufferRange", "leadRange"].forEach(id => {
  $(id).addEventListener("input", updateLeaveTime);
});


$("chatForm").addEventListener("submit", event => {
  event.preventDefault();

  sendChat($("chatInput").value);

  $("chatInput").value = "";
});


document.querySelectorAll("[data-question]").forEach(button => {
  button.addEventListener("click", () => {
    sendChat(button.dataset.question);
  });
});


$("enableNotifications").addEventListener(
  "click",
  requestNotificationPermission
);


// ========================================
// RURAL JARVIS - EMERGENCY CRISIS MODE
// ========================================

const crisisData = {
  normalDemand: 100,
  increasedDemand: 140,

  unavailableBuses: ["RJ-04", "RJ-07"],

  fleet: [
    { id: "RJ-04", capacity: 30, status: "broken" },
    { id: "RJ-07", capacity: 30, status: "broken" },
    { id: "RJ-11", capacity: 30, status: "available" },
    { id: "RJ-12", capacity: 30, status: "available" },
    { id: "RJ-15", capacity: 30, status: "available" },
    { id: "RJ-18", capacity: 30, status: "available" },
    { id: "RJ-21", capacity: 30, status: "available" },
    { id: "RJ-24", capacity: 30, status: "available" }
  ],

  routes: [
    {
      name: "Village A → College",
      students: 60,
      examStudents: 38,
      busesNeeded: 2,
      roadBlocked: false
    },
    {
      name: "Village B → College",
      students: 45,
      examStudents: 27,
      busesNeeded: 2,
      roadBlocked: true
    },
    {
      name: "Village C → College",
      students: 35,
      examStudents: 20,
      busesNeeded: 2,
      roadBlocked: false
    }
  ]
};


// CREATE CRISIS MODE INTERFACE

function addCrisisModeButton() {

  const style = document.createElement("style");

  style.textContent = `
    #crisisButton {
      position: fixed;
      right: 18px;
      bottom: 85px;
      z-index: 999;
      background: #d93636;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 14px 18px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 16px #0005;
    }

    #crisisPanel {
      position: fixed;
      z-index: 1000;
      inset: 5%;
      overflow-y: auto;
      background: #101d2c;
      color: white;
      border: 1px solid #36d9f5;
      border-radius: 18px;
      padding: 20px;
      display: none;
    }

    #crisisPanel h2 {
      color: #36d9f5;
    }

    .crisis-card {
      background: #1b2b3d;
      padding: 14px;
      margin: 12px 0;
      border-radius: 12px;
    }

    .crisis-card p {
      color: #c5d4e2;
      line-height: 1.6;
    }

    .crisis-action {
      background: #168b71;
      color: white;
      border: none;
      border-radius: 9px;
      padding: 12px;
      cursor: pointer;
      margin: 6px 0;
    }

    .crisis-close {
      background: #d93636;
      color: white;
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      cursor: pointer;
    }
  `;

  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "crisisButton";
  button.textContent = "🚨 CRISIS MODE";

  button.addEventListener("click", () => {
    $("crisisPanel").style.display = "block";
  });

  document.body.appendChild(button);

  const panel = document.createElement("section");
  panel.id = "crisisPanel";

  panel.innerHTML = `
    <h2>🚨 Emergency Transport Centre</h2>

    <p>
      Examination day emergency simulation
    </p>

    <div id="crisisResults">
      <div class="crisis-card">
        <strong>Emergency detected</strong>
        <p>
          Two buses unavailable. Student demand increased
          by 40%. One road blocked by flooding.
        </p>
      </div>
    </div>

    <button class="crisis-action" id="runCrisis">
      Run Intelligent Bus Allocation
    </button>

    <button class="crisis-close" id="closeCrisis">
      Close
    </button>
  `;

  document.body.appendChild(panel);

  $("closeCrisis").addEventListener("click", () => {
    panel.style.display = "none";
  });

  $("runCrisis").addEventListener("click", runCrisisSimulation);
}


// INTELLIGENT BUS ALLOCATION

function runCrisisSimulation() {

  const availableBuses = crisisData.fleet.filter(
    bus => bus.status === "available"
  );

  const routes = crisisData.routes;

  let busIndex = 0;
  let totalServed = 0;
  let totalExamServed = 0;
  let totalCapacity = 0;

  let report = "";

  routes.forEach(route => {

    let remainingStudents = route.students;
    let remainingExamStudents = route.examStudents;

    const assignedBuses = [];

    for (
      let i = 0;
      i < route.busesNeeded && remainingStudents > 0;
      i++
    ) {

      const bus = availableBuses[busIndex];

      if (!bus) break;

      busIndex++;

      const studentsAssigned = Math.min(
        bus.capacity,
        remainingStudents
      );

      // Give examination students priority.

      const examAssigned = Math.min(
        remainingExamStudents,
        studentsAssigned
      );

      const regularAssigned =
        studentsAssigned - examAssigned;

      remainingStudents -= studentsAssigned;
      remainingExamStudents -= examAssigned;

      totalServed += studentsAssigned;
      totalExamServed += examAssigned;
      totalCapacity += bus.capacity;

      assignedBuses.push(
        bus.id +
        " (" + studentsAssigned + " students)"
      );

      report += `
        <div class="crisis-card">
          <strong>${route.name}</strong>

          <p>
            Assigned bus: ${bus.id}<br>
            Students allocated: ${studentsAssigned}<br>
            Exam priority students: ${examAssigned}<br>
            Regular students: ${regularAssigned}<br>
            Remaining capacity: ${bus.capacity - studentsAssigned}
          </p>
        </div>
      `;
    }

    if (route.roadBlocked) {
      report += `
        <div class="crisis-card">
          <strong>⚠ Flooded road detected</strong>
          <p>
            ${route.name}: Original road marked blocked.
            Use the designated alternative road in this
            simulation. Actual road safety must be verified
            by local authorities before dispatch.
          </p>
        </div>
      `;
    }

    if (remainingStudents > 0) {
      report += `
        <div class="crisis-card">
          <strong>Unallocated students</strong>
          <p>
            ${route.name}: ${remainingStudents}
            students still need transport.
          </p>
        </div>
      `;
    }
  });

  const totalStudents = crisisData.increasedDemand;
  const unserved = totalStudents - totalServed;

  report = `
    <div class="crisis-card">
      <h3>Emergency Summary</h3>

      <p>
        Normal demand: ${crisisData.normalDemand}<br>
        Increased demand: ${totalStudents}<br>
        Demand increase: 40%<br>
        Unavailable buses: 2<br>
        Available buses: ${availableBuses.length}<br>
        Total available capacity: ${availableBuses.reduce(
          (sum, bus) => sum + bus.capacity, 0
        )}
      </p>
    </div>

    <div class="crisis-card">
      <h3>Allocation Results</h3>

      <p>
        Students transported: ${totalServed}<br>
        Exam students prioritised: ${totalExamServed}<br>
        Students unallocated: ${unserved}<br>
        Remaining assigned bus capacity:
        ${totalCapacity - totalServed}
      </p>
    </div>

    ${report}

    <div class="crisis-card">
      <h3>System Decision</h3>
      <p>
        ${unserved === 0
          ? "All 140 students have been allocated seats in this simulation."
          : unserved + " students still require alternative transport."}
      </p>
      <p>
        This allocation is simulated and does not dispatch
        real buses or verify actual passenger availability.
      </p>
    </div>
  `;

  $("crisisResults").innerHTML = report;

  toast("Emergency bus allocation completed.");
}



// INITIALIZATION

$("notificationList").innerHTML = `
  <article class="notice-card">
    <span class="notice-symbol">✧</span>
    <div>
      <strong>Welcome to Rural JARVIS</strong>
      <p>This prototype uses simulated bus and GPS information.</p>
    </div>
  </article>
`;

renderHome();
renderRoutes();
addCrisisModeButton();


setInterval(moveDemoBuses, 15000);


// SERVICE WORKER

if (
  "serviceWorker" in navigator &&
  location.protocol.startsWith("http")
) {
  navigator.serviceWorker
    .register("./sw.js")
    .catch(error => console.log("Service worker:", error));
}
