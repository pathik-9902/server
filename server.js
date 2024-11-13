const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const port = 4000;

app.use(express.json());
app.use(cors());

let lastTiltDetected = false;
let lastAccidentDetected = false;
let lastTemperatureTriggered = false;
let lastFlameDetected = false;
let lastRFIDDetected = null; // Variable to track the last RFID tag ID

// In-memory store for the latest sensor data
let sensorData = {
    gpsData: null,
    temperatureData: null,
    flameData: null,
    adxlData: null,
    rfidData: null,
};

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    ws.on('close', () => console.log('Client disconnected'));
});

// Helper function to broadcast updates to WebSocket clients
function sendUpdateToClients() {
    const message = JSON.stringify(sensorData);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Route to handle GPS data
app.post('/gps-data', (req, res) => {
    const { latitude, longitude, altitude, speed } = req.body;

    if (latitude !== undefined && longitude !== undefined && altitude !== undefined && speed !== undefined) {
        sensorData.gpsData = { latitude, longitude, altitude, speed };
        console.log(`GPS Data - Lat: ${latitude}, Lon: ${longitude}, Alt: ${altitude}, Speed: ${speed}`);
        sendUpdateToClients();
        res.status(200).send('GPS Data received');
    } else {
        res.status(400).send('Invalid GPS data');
    }
});

// Endpoint to receive temperature data
app.post('/temperature-alert', (req, res) => {
    const { temperature } = req.body;

    if (temperature !== undefined) {
        if (temperature !== 'normal' && !lastTemperatureTriggered) {
            sensorData.temperatureData = { temperature };
            lastTemperatureTriggered = true;
            console.log(`Temperature Alert: ${temperature}°C`);
        } else if (temperature === 'normal' && lastTemperatureTriggered) {
            sensorData.temperatureData = { temperature: 'normal' };
            lastTemperatureTriggered = false;
            console.log('Temperature normalized');
        }
        sendUpdateToClients();
        res.status(200).send('Temperature data received');
    } else {
        res.status(400).send('Invalid temperature data');
    }
});

// Endpoint to receive flame detection status
app.post('/flame-alert', (req, res) => {
    const { flameDetected } = req.body;

    if (typeof flameDetected === 'boolean') {
        if (flameDetected && !lastFlameDetected) {
            sensorData.flameData = { flameDetected };
            lastFlameDetected = true;
            console.log('Flame detected');
        } else if (!flameDetected && lastFlameDetected) {
            sensorData.flameData = { flameDetected: false };
            lastFlameDetected = false;
            console.log('Flame no longer detected');
        }
        sendUpdateToClients();
        res.status(200).send('Flame detection data received');
    } else {
        res.status(400).send('Invalid flame detection data');
    }
});

// Endpoint to receive ADXL sensor data (tilt and accident detection)
app.post('/adxl-alert', (req, res) => {
    const { tiltDetected, accidentDetected } = req.body;
    let status = 'none';

    if (tiltDetected !== undefined || accidentDetected !== undefined) {
        if (tiltDetected && !lastTiltDetected) {
            status = 'tilt';
        } else if (accidentDetected && !lastAccidentDetected) {
            status = 'impact';
        } else if (tiltDetected && accidentDetected && (!lastTiltDetected || !lastAccidentDetected)) {
            status = 'both';
        } else if (!tiltDetected && lastTiltDetected) {
            status = 'tilt-normal';
        } else if (!accidentDetected && lastAccidentDetected) {
            status = 'impact-normal';
        }

        lastTiltDetected = tiltDetected;
        lastAccidentDetected = accidentDetected;

        if (status !== 'none') {
            sensorData.adxlData = { status };
            console.log(`Collision status updated: ${status}`);
            sendUpdateToClients();
            res.json({ status });
        } else {
            res.status(200).send('No significant change');
        }
    } else {
        res.status(400).send('Invalid sensor data');
    }
});

// Endpoint to handle RFID data
app.post('/rfid-alert', (req, res) => {
    const { rfidTagId } = req.body;

    if (rfidTagId !== undefined) {
        if (rfidTagId !== lastRFIDDetected) {
            sensorData.rfidData = { rfidTagId };
            lastRFIDDetected = rfidTagId;
            console.log(`RFID Tag Detected: ${rfidTagId}`);
            sendUpdateToClients();
            res.status(200).send('RFID data received');
        } else {
            res.status(200).send('RFID tag already detected');
        }
    } else {
        res.status(400).send('Invalid RFID data');
    }
});

// Endpoint to get all sensor data (for debugging or direct access)
app.get('/sensor-data', (req, res) => {
    res.json(sensorData);
});

// Upgrade the HTTP server to support WebSocket
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Internal error:', err.stack);
    res.status(500).send('Something broke!');
});
