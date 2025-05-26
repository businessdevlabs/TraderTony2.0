import express from 'express';
import cors from 'cors';
import * as routes from './routes';

const app = express();
const port = 3001;

app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' })); // Increase JSON body size limit to 50mb

// API endpoints
app.get('/ohlc/:timeframe', routes.getOHLCData);
app.get('/key-levels', routes.getKeyLevels);
app.post('/key-levels', routes.saveKeyLevels);

// New endpoints for OHLC 1m data
app.get('/ohlc_1m', routes.getOHLC1mData);
app.post('/ohlc_1m', routes.saveOHLC1mData);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
