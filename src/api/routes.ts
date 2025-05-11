import { Request, Response } from 'express';
const { body, param, validationResult } = require('express-validator');
const { getDB } = require('./db');
import * as sqlite3 from 'sqlite3';

// API endpoint to fetch OHLC data
exports.getOHLCData = [
  param('timeframe')
    .isIn(['5m', '10m', '1h', '1d', '1w', '1mo'])
    .withMessage('Invalid timeframe specified'),
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const requestedTimeframe = req.params.timeframe;
    const timeframeTable = `ohlc_${requestedTimeframe}`;

    const sql = `SELECT * FROM ${timeframeTable} ORDER BY timestamp DESC LIMIT 200`;
    getDB().all(sql, [], (err: sqlite3.RunResult, rows: any[]) => {
      if (err) {
        console.error('Error fetching OHLC data:', err);
        res.status(500).send('Error fetching OHLC data');
      } else {
        res.json(rows);
      }
    });
  },
];

// API endpoint to fetch key levels
exports.getKeyLevels = (req: Request, res: Response) => {
  const sql = `SELECT * FROM key_levels ORDER BY price`;
  getDB().all(sql, [], (err: sqlite3.RunResult, rows: any[]) => {
    if (err) {
      console.error('Error fetching key levels:', err);
      res.status(500).send('Error fetching key levels');
    } else {
      res.json(rows);
    }
  });
};

// API endpoint to save key levels
exports.saveKeyLevels = [
  body('levels')
    .isArray()
    .withMessage('levels must be an array')
    .custom((levels: any[]) => levels.length > 0)
    .withMessage('levels array must not be empty'),
  body('ticker')
    .notEmpty()
    .withMessage('ticker is required'),
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { levels, ticker } = req.body;
    const sql = `INSERT OR REPLACE INTO key_levels (price, ticker, strength, last_date) VALUES (?, ?, ?, ?)`;

    getDB().serialize(() => {
      getDB().run("BEGIN TRANSACTION");
      let completed = 0;
      let errors = 0;
      levels.forEach((level: any) => {
        if (!level.price || !level.strength || !level.last_date) {
          console.warn('Skipping invalid level object:', level);
          errors++;
          return;
        }
        getDB().run(sql, [level.price, ticker, level.strength, level.last_date], function(err: sqlite3.RunResult) {
          if (err) {
            console.error('Error inserting key level:', err);
            errors++;
          } else {
            completed++;
          }
        });
      });
      getDB().run("COMMIT", (err: sqlite3.RunResult) => {
        if (err) {
          getDB().run("ROLLBACK"); // Rollback on commit error
          console.error('Error committing transaction:', err);
          return res.status(500).send('Failed to save key levels due to a transaction error.');
        }
        if (errors > 0) {
          return res.status(500).send(`Completed ${completed} insertions, but ${errors} errors occurred.`);
        }
        res.status(201).send({ message: `Successfully saved ${completed} key levels.` });
      });
    });
  },
];

module.exports = {
  getOHLCData,
  getKeyLevels,
  saveKeyLevels
};
