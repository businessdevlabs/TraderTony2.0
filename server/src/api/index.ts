import express from 'express';
import { getOHLCData, getKeyLevels, saveKeyLevels } from './routes';

const app = express();
const port = 3000;
app.use(express.json()); // Middleware to parse JSON bodies

// API endpoints
app.get('/ohlc/:timeframe', getOHLCData);
app.get('/key-levels', getKeyLevels);
app.post('/key-levels', saveKeyLevels);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
