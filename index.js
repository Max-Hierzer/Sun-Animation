// index.js
const { DateTime } = luxon;
let latitude = 48.2082;
let longitude = 16.3738;
let timeZone = 'Europe/Vienna'; // Default time zone
let startTime = DateTime.now().setZone(timeZone).startOf('day');
let endTime = DateTime.now().setZone(timeZone).endOf('day');
let currentTime = DateTime.fromJSDate(new Date(startTime)).setZone(timeZone);


let moduleTilt = Math.PI / 4;   // Default 45°
let moduleAzimuth = 0;          // Default south
let moduleArea = 10;            // Default 10 m²

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

document.addEventListener("DOMContentLoaded", function () {
    const datePicker = document.getElementById("datePicker");
    const toggleMapSizeBtn = document.getElementById("toggleMapSizeBtn");
    const mapContainer = document.querySelector(".map-container");
    const mapOuter = document.querySelector('.map-outer-wrapper');
    const topSection = document.querySelector(".top-section");
    const tilt = document.getElementById('tilt');
    const azimuth = document.getElementById('azimuth');
    const area = document.getElementById('area');
    const datePickerContainer = document.querySelector('.date-picker-container');
    const inputGroup = document.querySelector('.input-group');
    const powerCanvas = document.getElementById('powerCanvas');

    // Initialize date picker
    const today = new Date().toISOString().split("T")[0];
    datePicker.value = today;

    datePicker.addEventListener("change", function (e) {
        const selectedDate = e.target.value;
        if (selectedDate) {
            // Use Luxon for both start and end time
            startTime = DateTime.fromISO(selectedDate, { zone: timeZone }).startOf('day');
            endTime = startTime.endOf('day');
            currentTime = startTime;
            if (typeof updateSunAnimation === "function") updateSunAnimation();
            updatePowerAnimation();
        }
    });

    // Function to calculate and set the dynamic height for the top-section
    function updateTopSectionHeight() {
        if (topSection.classList.contains('map-expanded-layout')) {
            const mapHeight = window.innerHeight * 0.9;
            const inputsRowHeight = Math.max(datePickerContainer.offsetHeight, inputGroup.offsetHeight);
            const computedStyle = window.getComputedStyle(topSection);
            const gap = parseFloat(computedStyle.getPropertyValue('gap')) || 25;
            const totalHeight = mapHeight + inputsRowHeight + gap;

            topSection.style.setProperty('--expanded-top-section-height', `${totalHeight}px`);
        } else {
            topSection.style.setProperty('--expanded-top-section-height', `500px`);
        }
    }


    // Toggle map size
    toggleMapSizeBtn.addEventListener("click", function () {
        const isExpanding = !topSection.classList.contains("map-expanded-layout");

        mapContainer.classList.toggle("map-expanded");
        this.classList.toggle("map-toggle-btn-expanded");

        if (isExpanding) {
            // EXPAND: Remove inline height so CSS class can animate
            mapOuter.style.height = '';
            topSection.classList.add("map-expanded-layout");
            topSection.style.setProperty('--top-section-columns', '1fr 1fr');
            requestAnimationFrame(() => {
                updateTopSectionHeight();
            });
        } else {
            // SHRINK: Animate height first, then remove class for width
            // 1. Set inline height to current computed height
            const currentHeight = mapOuter.offsetHeight + "px";
            mapOuter.style.height = currentHeight;

            // Force reflow
            void mapOuter.offsetHeight;

            // Set height to collapsed value to trigger transition
            mapOuter.style.height = '250px';

            mapOuter.addEventListener('transitionend', function handler(e) {
                if (e.propertyName === 'height') {
                    topSection.classList.remove("map-expanded-layout");
                    topSection.style.setProperty('--top-section-columns', '1fr 1fr 1fr');
                    // Set inline height to collapsed value to prevent "too small" glitch
                    mapOuter.style.height = '250px';

                    // Force reflow, then clear inline height after a short delay
                    setTimeout(() => {
                        mapOuter.style.height = '';
                        updateTopSectionHeight();
                    }, 20);

                    mapOuter.removeEventListener('transitionend', handler);
                }
            });
        }

        setTimeout(() => {
            if (typeof map !== 'undefined' && map.updateSize) {
                map.updateSize();
            }
        }, 350);
    });


    // Module tilt and azimuth update => update power animation
    tilt.addEventListener('input', (e) => {
        moduleTilt = degToRad(parseFloat(e.target.value) || 0);
        updatePowerAnimation();
        updateSunAnimation();
    });

    azimuth.addEventListener('input', (e) => {
        moduleAzimuth = degToRad(parseFloat(e.target.value) || 0);
        updatePowerAnimation();
        updateSunAnimation();
    });

    area.addEventListener('input', (e) => {
        moduleArea = parseFloat(e.target.value) || 0;
        updatePowerAnimation();
        updateSunAnimation();
    });

    // ===== Responsive Canvas Resizing for Sun and Power Graphs =====
    function resizeCanvasToDisplaySize(canvas, aspectRatio = 2.5) {
        // Get the actual width of the canvas as displayed (after CSS/layout)
        const displayWidth = canvas.parentElement.clientWidth;
        const displayHeight = displayWidth / aspectRatio;
        const ratio = window.devicePixelRatio || 1;
        const width = displayWidth * ratio;
        const height = displayHeight * ratio;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            return true;
        }
        return false;
    }

    // Initial resize and power graph initialization
    resizeCanvasToDisplaySize(powerCanvas, 2.5);
    if (typeof initializePowerGraph === 'function') {
        initializePowerGraph();
    }

    // Responsive resize handling
    window.addEventListener('resize', () => {
        resizeCanvasToDisplaySize(powerCanvas, 2.5);
        updateSunAnimation();
        updatePowerAnimation();
        updateTopSectionHeight();
    });

    // Call updateTopSectionHeight on initial load to set the correct initial state
    updateTopSectionHeight();
});

function updateCoordinates(newLat, newLng) {
    latitude = newLat;
    longitude = newLng;
    if (typeof updateSunAnimation === "function") updateSunAnimation();
    updatePowerAnimation();
}

function getSunData(time, latitude, longitude, timeZone) {
    let jsDate = time;
    if (typeof time.toJSDate === "function") {
        jsDate = time.toJSDate();
    }
    const dt = DateTime.fromJSDate(jsDate).setZone(timeZone);
    const localDate = dt.toJSDate();
    const pos = SunCalc.getPosition(localDate, latitude, longitude);
    const altitude = pos.altitude * 180 / Math.PI;
    const azimuth = pos.azimuth * 180 / Math.PI;
    return {
        time: localDate,
        altitude: altitude,
        azimuth: azimuth,
        minutes: localDate.getHours() * 60 + localDate.getMinutes()
    };
}

async function getTimeZoneForCoords(lat, lng) {
    const url = `https://timeapi.io/api/time/current/coordinate?latitude=${lat}&longitude=${lng}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.timeZone;
}

const mapOuter = document.querySelector('.map-outer-wrapper');

function expandMap() {
    // 1. Expand width instantly (if needed)
    // 2. Animate height
    topSection.classList.add('map-expanded-layout');
}

function shrinkMap() {
    // 1. Animate height first
    mapOuter.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'height') {
            // 2. After height animation, shrink width (if needed)
            topSection.classList.remove('map-expanded-layout');
            mapOuter.removeEventListener('transitionend', handler);
        }
    });
    // Start shrinking height (width will be changed after transitionend)
    mapOuter.style.height = '100%';
}
