# My Node Server App

This is a simple Node.js server with Express, WebSocket, and REST API endpoints for handling GPS, temperature, flame, and sensor data.

## Getting Started

### Prerequisites

- Node.js and npm installed

### Installation

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm start` to start the server

### API Endpoints

- `POST /gps-data`: Receives GPS data
- `POST /temperature-alert`: Receives temperature data
- `POST /flame-alert`: Receives flame detection data
- `POST /adxl-alert`: Receives sensor tilt and accident detection data
- `GET /sensor-data`: Retrieves all sensor data

### WebSocket

WebSocket server is running on the same port as the HTTP server for real-time communication.
#   s e r v e r  
 