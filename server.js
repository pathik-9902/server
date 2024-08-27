const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const app = express();
const port = 4000;

app.use(express.json());
app.use(cors()); 

let lastTiltDetected = false;
let lastAccidentDetected = false;

// In-memory store for the latest sensor data
let sensorData = {
    gpsData: null,
    temperatureData: null,
    flameData: null,
    adxlData: null
};

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
    });
});

// Route to handle GPS data
app.post('/gps-data', (req, res) => {
    const { latitude, longitude, altitude, speed } = req.body;

    if (latitude !== undefined && longitude !== undefined && altitude !== undefined && speed !== undefined) {
        sensorData.gpsData = { latitude, longitude, altitude, speed };
        console.log(`Lat: ${latitude}, Lon: ${longitude}, Alt: ${altitude}, Speed: ${speed}`);
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
        sensorData.temperatureData = { temperature };
        console.log(`Temperature received: ${temperature}°C`);
        sendUpdateToClients();
        res.status(200).send('Temperature data received');
    } else {
        res.status(400).send('Invalid temperature data');
    }
});

// Endpoint to receive flame detection status
app.post('/flame-alert', (req, res) => {
    const { flameDetected } = req.body;
    if (flameDetected !== undefined) {
        sensorData.flameData = { flameDetected };
        console.log(`Flame detected: ${flameDetected}`);
        sendUpdateToClients();
        res.status(200).send('Flame detection data received');
    } else {
        res.status(400).send('Invalid flame detection data');
    }
});

// Endpoint to receive sensor data
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
        }

        lastTiltDetected = tiltDetected;
        lastAccidentDetected = accidentDetected;

        if (status !== 'none') {
            sensorData.adxlData = { status };
            console.log(`Collision: ${status}`);
            sendUpdateToClients();
            res.json({ status });
        } else {
            res.status(200).send('No significant change');
        }
    } else {
        res.status(400).send('Invalid sensor data');
    }
});

// New endpoints to get each type of sensor data individually

// Get GPS Data
app.get('/gps-data', (req, res) => {
    if (sensorData.gpsData) {
        res.json(sensorData.gpsData);
    } else {
        res.status(404).send('No GPS data available');
    }
});

// Get Temperature Data
app.get('/temperature-data', (req, res) => {
    if (sensorData.temperatureData) {
        res.json(sensorData.temperatureData);
    } else {
        res.status(404).send('No temperature data available');
    }
});

// Get Flame Data
app.get('/flame-data', (req, res) => {
    if (sensorData.flameData) {
        res.json(sensorData.flameData);
    } else {
        res.status(404).send('No flame data available');
    }
});

// Get ADXL Data
app.get('/adxl-data', (req, res) => {
    if (sensorData.adxlData) {
        res.json(sensorData.adxlData);
    } else {
        res.status(404).send('No ADXL data available');
    }
});

// Send updates to all WebSocket clients
function sendUpdateToClients() {
    const message = JSON.stringify(sensorData);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    sensorData = {
        gpsData: null,
        temperatureData: null,
        flameData: null,
        adxlData: null
    };
}

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
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
