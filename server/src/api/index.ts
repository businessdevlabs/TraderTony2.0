import express from 'express';
import cors from 'cors';
import { getOHLCData, getKeyLevels, saveKeyLevels } from './routes';

const app = express();
const port = 3001;

app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json()); // Middleware to parse JSON bodies

// API endpoints
app.get('/ohlc/:timeframe', getOHLCData);
app.get('/key-levels', getKeyLevels);
app.post('/key-levels', saveKeyLevels);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
