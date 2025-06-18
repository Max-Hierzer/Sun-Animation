// power-animation.js

let powerCanvas;
let ctx2;
let powerData = [];
let animationFrameId2;
let currentIndex = 0;
let maxPower = 1.0; // Will be set in generatePowerData()

const marginLeft = 50, marginRight = 50, marginTop = 50, marginBottom = 50;

function getMinutesSinceMidnight(date) {
    if (typeof date.toJSDate === "function") {
        date = date.toJSDate();
    }
    return date.getHours() * 60 + date.getMinutes();
}

// Setze Canvas und starte Animation
function initializePowerGraph() {
    powerCanvas = document.getElementById('powerCanvas');
    if (!powerCanvas) return;
    ctx2 = powerCanvas.getContext('2d');
    generatePowerData();
    animatePower();
}

function updatePowerAnimationCoordinates() {
    updatePowerAnimation();
}

function updatePowerAnimation() {
    resetPowerAnimation();
    generatePowerData();
    animatePower();
}

// === UPDATED: cos(theta) and module orientation included ===
function generatePowerData() {
    const points = 1440;
    powerData = [];

    // Use startTime as base, and always use Luxon for time zone correctness
    let baseTime = startTime;
    sunAltitudes = [];
    for (let i = 0; i < points; i++) {
        const time = baseTime.plus({ minutes: i });
        const sun = getSunData(time, latitude, longitude, timeZone);
        sunAltitudes.push(Math.max(0, sun.altitude));

        const gammaSun = sun.altitude * Math.PI / 180;
        const alphaSun = sun.azimuth * Math.PI / 180;

        const cosTheta =
            Math.sin(gammaSun) * Math.cos(moduleTilt) +
            Math.cos(gammaSun) * Math.sin(moduleTilt) * Math.cos(alphaSun - moduleAzimuth);

        const cosFactor = Math.max(0, cosTheta);
        const elevationFactor = Math.max(0, Math.sin(gammaSun));

        const power = elevationFactor * cosFactor * moduleArea;
        powerData.push(power);
    }

    maxPower = Math.ceil(Math.max(...powerData));
}

function drawPowerAxes() {
    const w = powerCanvas.width;
    const h = powerCanvas.height;
    const graphWidth = w - marginLeft - marginRight;
    const graphHeight = h - marginTop - marginBottom;

    const startMinutes = getMinutesSinceMidnight(startTime);
    const endMinutes = getMinutesSinceMidnight(endTime);
    const timeRangeMinutes = endMinutes - startMinutes;


    ctx2.strokeStyle = "#000";
    ctx2.lineWidth = 1;
    ctx2.font = "14px Inter";
    ctx2.textAlign = "center";
    ctx2.fillStyle = "#000";

    // X-Axis (bottom)
    ctx2.beginPath();
    ctx2.moveTo(marginLeft, h - marginBottom);
    ctx2.lineTo(w - marginRight, h - marginBottom);
    ctx2.stroke();
    ctx2.fillText("Uhrzeit", marginLeft + graphWidth / 2 - 30, h - 10);

    // Draw simple tick marks for EVERY hour
    for (let t = startMinutes; t <= endMinutes; t += 60) {
        let x = marginLeft + ((t - startMinutes) / timeRangeMinutes) * graphWidth;
        ctx2.beginPath();
        ctx2.moveTo(x, h - marginBottom);
        ctx2.lineTo(x, h - marginBottom + 5);
        ctx2.stroke();
    }

    let firstLabelMinute = Math.ceil(startMinutes / 120) * 120;
    if (firstLabelMinute < startMinutes) {
        firstLabelMinute += 120;
    }

    for (let t = firstLabelMinute; t <= endMinutes; t += 120) {
        let x = marginLeft + ((t - startMinutes) / timeRangeMinutes) * graphWidth;
        if (x >= marginLeft && x <= w - marginRight) {
            const hour = Math.floor(t / 60);
            const minute = t % 60;
            const timeLabel = (hour < 10 ? "0" + hour : hour) + ":" + (minute < 10 ? "0" + minute : minute);
            ctx2.fillText(timeLabel, x, h - marginBottom + 20);
        }
    }

    // Draw last time label at the right edge (24:00)
    ctx2.fillText("24:00", w - marginRight, h - marginBottom + 20);

    // Draw top x-axis (for cardinal directions)
    ctx2.beginPath();
    ctx2.moveTo(marginLeft, marginTop);
    ctx2.lineTo(w - marginRight, marginTop);
    ctx2.stroke();

    // Cardinal direction ticks and labels (every hour)
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

    for (let t = startMinutes; t <= endMinutes; t += 60) {
        let x = marginLeft + ((t - startMinutes) / timeRangeMinutes) * graphWidth;
        // Calculate sun azimuth for this hour
        const time = startTime.startOf('day').plus({ minutes: t });
        const sun = getSunData(time, latitude, longitude, timeZone);
        // Convert azimuth (SunCalc: 0°=South) to 0°=North
        const standardAzimuth = (sun.azimuth + 180) % 360;

        const dirIndex = Math.floor((standardAzimuth + 22.5) / 45) % 8;
        const direction = directions[dirIndex];
        ctx2.beginPath();
        ctx2.moveTo(x, marginTop - 5);
        ctx2.lineTo(x, marginTop);
        ctx2.stroke();
        ctx2.fillText(direction, x, marginTop - 10);
    }

    // Draw last cardinal direction at the right edge
    const lastTime = startTime.startOf('day').plus({ minutes: endMinutes });
    const lastSun = getSunData(lastTime, latitude, longitude, timeZone);
    const lastStandardAzimuth = (lastSun.azimuth + 180) % 360;
    const lastDirIndex = Math.floor((lastStandardAzimuth + 22.5) / 45) % 8;
    const lastDirection = directions[lastDirIndex];
    ctx2.fillText(lastDirection, w - marginRight, marginTop - 10);

    // Y-Axis (left)
    ctx2.beginPath();
    ctx2.moveTo(marginLeft, h - marginBottom);
    ctx2.lineTo(marginLeft, marginTop);
    ctx2.stroke();
    ctx2.save();
    ctx2.translate(15, h / 2 + 40);
    ctx2.rotate(-Math.PI / 2);
    ctx2.fillText("kW", 0, 0);
    ctx2.restore();

    // Y-axis ticks and labels (0.0 to maxPower in 5 steps)
    for (let i = 0; i <= 10; i++) {
        const yVal = (maxPower / 10) * i;
        const y = h - marginBottom - (yVal / maxPower) * graphHeight;
        ctx2.beginPath();
        ctx2.moveTo(marginLeft - 5, y);
        ctx2.lineTo(marginLeft, y);
        ctx2.stroke();
        ctx2.fillText(yVal.toFixed(1), marginLeft - 15, y + 5);
    }

    // Draw right y-axis for altitude (0° to 90°)
    ctx2.beginPath();
    ctx2.moveTo(w - marginRight, h - marginBottom);
    ctx2.lineTo(w - marginRight, marginTop);
    ctx2.stroke();

    // Altitude axis label (rotated, right side)
    ctx2.save();
    ctx2.translate(w - 8, h / 2 + 40);
    ctx2.rotate(-Math.PI / 2);
    ctx2.fillText("Höhenwinkel (°)", 0, 0);
    ctx2.restore();

    // Altitude ticks and labels (every 10°)
    for (let alt = 0; alt <= 90; alt += 10) {
        let y = h - marginBottom - (alt / 90) * graphHeight;
        ctx2.beginPath();
        ctx2.moveTo(w - marginRight, y);
        ctx2.lineTo(w - marginRight + 5, y);
        ctx2.stroke();
        ctx2.fillText(`${alt}°`, w - marginRight + 15, y + 5);
    }
}


function animatePower() {
    const w = powerCanvas.width;
    const h = powerCanvas.height;
    const graphWidth = w - marginLeft - marginRight;
    const graphHeight = h - marginTop - marginBottom;

    // Clear canvas
    ctx2.clearRect(0, 0, w, h);

    // Draw axes
    drawPowerAxes();

    // Draw animated power curve
    ctx2.strokeStyle = '#4caf50';
    ctx2.lineWidth = 2;
    ctx2.beginPath();

    const stepX = graphWidth / powerData.length;
    let started = false;
    for (let i = 0; i <= currentIndex; i++) {
        if (powerData[i] > 0) {
            const x = marginLeft + i * stepX;
            const y = h - marginBottom - (powerData[i] / maxPower) * graphHeight;
            if (!started) {
                ctx2.moveTo(x, y);
                started = true;
            } else {
                ctx2.lineTo(x, y);
            }
        } else {
            started = false; // break the line if below zero
        }
    }

    // Draw current power value label if above zero
    if (powerData[currentIndex] > 0) {
        const xPower = marginLeft + currentIndex * stepX;
        const yPower = h - marginBottom - (powerData[currentIndex] / maxPower) * graphHeight;
        ctx2.save();
        ctx2.fillStyle = "blue";
        ctx2.font = "12px Arial";
        ctx2.textAlign = "center";
        ctx2.fillText(`Power: ${powerData[currentIndex].toFixed(2)} kW`, xPower, yPower - 10);
        ctx2.restore();
    }

    ctx2.stroke();

    animateSun2D();

    currentIndex++;
    if (currentIndex < powerData.length) {
        animationFrameId2 = requestAnimationFrame(animatePower);
    } else {
        // Restart the animation for looping
        currentIndex = 0;
        animationFrameId2 = requestAnimationFrame(animatePower);
    }
}


function resetPowerAnimation() {
    cancelAnimationFrame(animationFrameId2);
    currentIndex = 0;
    ctx2.clearRect(0, 0, powerCanvas.width, powerCanvas.height);
}

function animateSun2D() {
    const w = powerCanvas.width;
    const h = powerCanvas.height;
    const graphWidth = w - marginLeft - marginRight;
    const graphHeight = h - marginTop - marginBottom;
    const maxAltitude = 90;

    // --- Draw the altitude curve in orange ---
    ctx2.strokeStyle = "orange";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    let started = false;
    for (let i = 0; i <= currentIndex; i++) {
        const altitude = sunAltitudes[i];
        if (altitude > 0) {
            const x = marginLeft + (i / sunAltitudes.length) * graphWidth;
            const y = h - marginBottom - (altitude / maxAltitude) * graphHeight;
            if (!started) {
                ctx2.moveTo(x, y);
                started = true;
            } else {
                ctx2.lineTo(x, y);
            }
        } else {
            started = false; // break the line if below horizon
        }
    }
    ctx2.stroke();

    // --- Draw the current sun marker, helper line, and labels only if above horizon ---
    const sunNow = getSunData(startTime.startOf('day').plus({ minutes: currentIndex }), latitude, longitude, timeZone);
    const xNow = marginLeft + (currentIndex / sunAltitudes.length) * graphWidth;
    const yNow = h - marginBottom - (sunNow.altitude / maxAltitude) * graphHeight;

    if (sunNow.altitude > 0) {
        // Sun marker
        ctx2.fillStyle = "yellow";
        ctx2.beginPath();
        ctx2.arc(xNow, yNow, 5, 0, 2 * Math.PI);
        ctx2.fill();

        // Altitude and azimuth labels
        ctx2.fillStyle = "blue";
        ctx2.font = "12px Arial";
        ctx2.fillText(`Altitude: ${sunNow.altitude.toFixed(1)}°`, xNow, yNow - 10);
    }
    // Vertical helper line
    ctx2.strokeStyle = "grey";
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(xNow, marginTop);
    ctx2.lineTo(xNow, h - marginBottom);
    ctx2.stroke();

    ctx2.fillStyle = "blue";
    ctx2.font = "12px Arial";
    ctx2.textAlign = "center";
    ctx2.fillText(`Azimuth: ${sunNow.azimuth.toFixed(1)}°`, xNow, marginTop + 15)
}
