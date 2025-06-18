// sun-orbit.js

// Ensure the DOM is fully loaded before trying to access canvas elements
document.addEventListener("DOMContentLoaded", function () {
    const canvas3 = document.getElementById('threeCanvas');

    if (!canvas3) {
        console.error("Canvas with ID 'threeCanvas2' not found. 3D simulation cannot be initialized.");
        return;
    }

    // Scene, Camera, and Renderer setup for the 3D environment
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        50, // Field of view
        canvas3.width / canvas3.height, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
    );
    // Set initial camera position and make it look at the origin
    camera.position.set(0, 30, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas3, antialias: true });
    renderer.setClearColor(0x000000, 1); // Background color... same as container
    // Set renderer size, matching the canvas dimensions
    renderer.setSize(canvas3.width, canvas3.height, false);

    // Update camera aspect ratio and projection matrix
    camera.aspect = canvas3.width / canvas3.height;
    camera.updateProjectionMatrix();

    // --- Orbit Controls ---
    // Allows user to rotate, pan, and zoom the camera with mouse interaction
    const controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Ground circle representing the base plane
    const groundRadius = 20;
    const groundSegments = 32;
    const groundGeometry = new THREE.CircleGeometry(groundRadius, groundSegments);
    const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0x999999,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const groundCircle = new THREE.Mesh(groundGeometry, groundMaterial);
    groundCircle.rotation.x = -Math.PI / 2; // Rotate to lie flat on the XZ plane
    scene.add(groundCircle);

    // Lighting for the scene
    scene.add(new THREE.AmbientLight(0xffffff, 0.6)); // Soft ambient light
    const sunLight = new THREE.DirectionalLight(0xffffcc, 1); // Directional light simulating the sun
    scene.add(sunLight);

    // Solar panel (flat plane)
    const panelGeometry = new THREE.PlaneGeometry(4, 4);
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0x00bfff,
        side: THREE.DoubleSide,
        opacity: 0.85,
        transparent: true
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.rotation.x = -Math.PI / 2;
    panel.position.y = 0.15;
    scene.add(panel);

    // Add panel edge for better visibility
    const panelEdgeGeometry = new THREE.EdgesGeometry(panelGeometry);
    const panelEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x003366 });
    const panelEdge = new THREE.LineSegments(panelEdgeGeometry, panelEdgeMaterial);
    panel.add(panelEdge);

    // Sun sphere (visual representation of the sun)
    const sunGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Grid parameters (cylRadius2 is derived from groundRadius2)
    const radius = groundRadius * 0.98;

    // Function to create direction labels (N, S, E, W, etc.)
    function createDirectionLabel(text, x, z) {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeText(text, size / 2, size / 2);
        ctx.fillText(text, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.2, 1.2, 1.2);
        sprite.position.set(x, 0.01, z);
        scene.add(sprite);
    }

    // Calculate distance for labels based on cylinder radius
    const labelDistance = radius * 1.05;

    // Create all directional labels
    createDirectionLabel('N', 0, -labelDistance);
    createDirectionLabel('W', -labelDistance, 0);
    createDirectionLabel('S', 0, labelDistance);
    createDirectionLabel('E', labelDistance, 0);
    createDirectionLabel('NW', -labelDistance * Math.SQRT1_2, -labelDistance * Math.SQRT1_2);
    createDirectionLabel('NE', labelDistance * Math.SQRT1_2, -labelDistance * Math.SQRT1_2);
    createDirectionLabel('SW', -labelDistance * Math.SQRT1_2, labelDistance * Math.SQRT1_2);
    createDirectionLabel('SE', labelDistance * Math.SQRT1_2, labelDistance * Math.SQRT1_2);

    // Hemisphere (sun path dome)
    const hemiGeometry = new THREE.SphereGeometry(groundRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); // Half sphere
    const hemiMaterial = new THREE.MeshBasicMaterial({
        color: 0x8888ff,
        wireframe: true,
        opacity: 0.15,
        transparent: true
    });
    const hemisphere = new THREE.Mesh(hemiGeometry, hemiMaterial);
    hemisphere.position.y = 0;
    scene.add(hemisphere);

    // Helper function to convert degrees to radians
    function degToRad(deg) { return deg * Math.PI / 180; }

    // Function to calculate the 3D position of the sun based on altitude and azimuth
    function sunPosition3D(altitude, azimuth) {
        const altRad = degToRad(altitude);
        const azRad = degToRad(azimuth);
        // Calculate radius in the XZ plane based on altitude
        const r = groundRadius * Math.cos(altRad);
        return {
            x: -r * Math.sin(azRad),
            y: groundRadius * Math.sin(altRad),
            z: r * Math.cos(azRad),
        };
    }

    // Assume you have a global variable `timeZone` (set after fetching from the API)
    const { DateTime } = luxon;

    function drawSunPath() {
        const points = [];
        // Use startTime from the global scope, or current date if not defined
        const baseDate = (typeof startTime !== "undefined") ? new Date(startTime) : new Date();
        for (let h = 0; h <= 24; h += 0.1) {
            // Create a Luxon DateTime in the correct time zone
            const dt = DateTime.fromJSDate(baseDate).setZone(timeZone).set({
                hour: Math.floor(h),
                minute: Math.round((h % 1) * 60),
                second: 0,
                millisecond: 0
            });
            const localDate = dt.toJSDate();

            // Get sun position using SunCalc
            const sunPos = SunCalc.getPosition(localDate, latitude, longitude);
            const altitude = sunPos.altitude * 180 / Math.PI;
            const azimuth = sunPos.azimuth * 180 / Math.PI;

            if (altitude > 0) {
                const pos = sunPosition3D(altitude, azimuth);
                points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
            }
        }
        // If there are enough points, draw the line
        if (points.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
            const line = new THREE.Line(geometry, material);
            line.isSunPath = true; // Tag it
            scene.add(line);
        }
    }
    drawSunPath();

    let animationFrameId = null;

    // Animation loop for updating sun position and rendering
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        // Use Luxon DateTime for currentTime
        const localDate = currentTime.toJSDate();
        const sunPos = SunCalc.getPosition(localDate, latitude, longitude);
        const altitude = sunPos.altitude * 180 / Math.PI;
        const azimuth = sunPos.azimuth * 180 / Math.PI;
        const pos = sunPosition3D(altitude, azimuth);

        // Update sun sphere position
        sun.position.set(pos.x, pos.y, pos.z);
        sunLight.position.copy(sun.position);

        controls.update();
        renderer.render(scene, camera);

        // Advance time
        currentTime = currentTime.plus({ minutes: 1 });

        // Calculate total minutes since start of day
        const minutesSinceStart = currentTime.diff(currentTime.startOf('day'), 'minutes').minutes;

        // If we've passed the end of the day, wrap to start of day (loop seamlessly)
        if (minutesSinceStart >= 24 * 60) {
            currentTime = currentTime.minus({ days: 1});
        }
    }

    animate();

    // Responsive resize
    function resizeRenderer() {
        const width = canvas3.clientWidth;
        const height = Math.round(width * 2 / 3);
        canvas3.width = width;
        canvas3.height = height;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        controls.update();
    }
    window.addEventListener('resize', resizeRenderer);
    resizeRenderer();

    // Global function to update the sun animation (called from index.js)
    window.updateSunAnimation = function () {
        // Cancel any running animation before starting a new one
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Remove old sun path
        scene.children
            .filter(obj => obj.isSunPath)
            .forEach(obj => scene.remove(obj));

        drawSunPath();

        // Reset sun animation to start of day in the selected time zone
        if (typeof startTime !== "undefined" && typeof startTime.toJSDate === "function") {
            currentTime = startTime;
            endTime = startTime.endOf('day');
        } else if (typeof startTime === "string") {
            // fallback: ISO string
            currentTime = DateTime.fromISO(startTime, { zone: timeZone }).startOf('day');
            endTime = currentTime.endOf('day');
        } else {
            // fallback: today
            currentTime = DateTime.now().setZone(timeZone).startOf('day');
            endTime = currentTime.endOf('day');
        }

        if (typeof panel !== "undefined" && typeof moduleTilt !== "undefined" && typeof moduleAzimuth !== "undefined") {
            panel.rotation.set(0, 0, 0);

            // Apply azimuth (rotate around Y axis)
            panel.rotateY(-moduleAzimuth);

            // Apply tilt (rotate around panel's local X axis)
            panel.rotateX(-Math.PI / 2 + moduleTilt);

            // Lift panel so its bottom edge touches the ground
            const panelSize = 4;
            const lift = (panelSize / 2) * Math.sin(moduleTilt) + 0.2;
            panel.position.y = lift;
        }
        controls.update();

        // Restart animation
        animate();
    };

    window.updateSunAnimation();
});
