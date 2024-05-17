import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { client } from './redisClient';
import { publishMessage } from './publisher';

const app = express();
const port = 8000;
const server = app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

const wss = new WebSocketServer({ server });
const subscriber = client.duplicate();

wss.on('connection', (ws: WebSocket) => {
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    const subscribeAndSend = async () => {
        try {
            if (!subscriber.isOpen) {
                await subscriber.connect();
            }
            await subscriber.subscribe('submissions', (message) => {
                console.log("Received message: ", message);
                ws.send(message);
            });
        } catch (error) {
            console.error("Error while subscribing to Redis channel: ", error);
        }
    };

    subscribeAndSend();

    ws.on('message', (data) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
            }
        });
    });

    ws.on('close', async () => {
        try {
            await subscriber.unsubscribe('submissions');
            await subscriber.disconnect();
        } catch (error) {
            console.error("Error while unsubscribing from Redis channel: ", error);
        }
    });
});

app.post('/submit', express.json(), async (req, res) => {
    const { lang, code } = req.body;
    if (!lang || !code) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const data = {
        id: Math.random().toString(36).substring(7),
        lang,
        code,
    };
    // const testData = {
    //     id: Math.random().toString(36).substring(7),
    //     lang: 'typescript',
    //     code: 'console.log("Hello, World!");',
    // };

    publishMessage('submissions', JSON.stringify(data));
    return res.json({ message: 'Code submitted' });
})
