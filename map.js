// map.js

let selectedCoordinates = { lat: 48.2082, lng: 16.3738 }; // Default: Wien (Graz is 47.0707, 15.4395)
let map; // Global map instance
let markerLayer; // Global reference to the marker vector layer
let markerFeature; // Global reference to the actual marker feature

function initializeMap() {
    // Create the base OpenStreetMap tile layer
    const osmLayer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    // Create a vector source and layer for our marker
    const markerSource = new ol.source.Vector();
    markerLayer = new ol.layer.Vector({
        source: markerSource,
        style: new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png'
            })
        })
    });

    // Initialize the map
    map = new ol.Map({
        target: 'Map',
        layers: [
            osmLayer,
            markerLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([selectedCoordinates.lng, selectedCoordinates.lat]),
            zoom: 10,
            constrainResolution: true
        })
    });

    // Place the initial marker
    addOrUpdateMarker(selectedCoordinates.lat, selectedCoordinates.lng);

    // Add event listener for map clicks
    map.on('click', function (event) {
        // Convert clicked map coordinates to Latitude/Longitude (EPSG:4326)
        const coords = ol.proj.toLonLat(event.coordinate);
        const newLat = coords[1];
        const newLng = coords[0];

        // Update the marker's position
        addOrUpdateMarker(newLat, newLng);

        // Fetch the time zone and update everything only after it's fetched
        getTimeZoneForCoords(newLat, newLng).then((tz) => {
            latitude = newLat;
            longitude = newLng;
            timeZone = tz;
            // Reset startTime and endTime for the new location/time zone
            startTime = luxon.DateTime.now().setZone(timeZone).startOf('day');
            endTime = startTime.endOf('day');
            updateSunAnimation();
        });
        updatePowerAnimationCoordinates();
    });
}

// Helper function to add or update the single marker
function addOrUpdateMarker(lat, lng) {
    const markerCoords = ol.proj.fromLonLat([lng, lat]);

    if (markerFeature) {
        markerFeature.getGeometry().setCoordinates(markerCoords);
    } else {
        markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords)
        });
        markerLayer.getSource().addFeature(markerFeature);
    }
}


initializeMap();