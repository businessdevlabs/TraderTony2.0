import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getDB } from '../../api/db';
import * as sqlite3 from 'sqlite3';

export const getOHLCData = [
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

// New route handlers for ohlc_1m table
export const getOHLC1mData = async (req: Request, res: Response) => {
  const sql = `SELECT * FROM ohlc_1m ORDER BY timestamp DESC LIMIT 200`;
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      getDB().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching OHLC 1m data:', err);
    res.status(500).send('Error fetching OHLC 1m data');
  }
};

export const saveOHLC1mData = [
  body('data')
    .isArray()
    .withMessage('data must be an array')
    .custom((data: any[]) => data.length > 0)
    .withMessage('data array must not be empty'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { data } = req.body;
    const sql = `INSERT OR REPLACE INTO ohlc_1m (timestamp, open, high, low, close, volume, ticker) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    try {
      await new Promise<void>((resolve, reject) => {
        getDB().serialize(() => {
          getDB().run("BEGIN TRANSACTION");
          let completed = 0;
          let errors = 0;
          data.forEach((entry: any) => {
            if (!entry.timestamp || !entry.open || !entry.high || !entry.low || !entry.close || !entry.volume || !entry.ticker) {
              console.warn('Skipping invalid OHLC entry:', entry);
              errors++;
              return;
            }
            getDB().run(sql, [entry.timestamp, entry.open, entry.high, entry.low, entry.close, entry.volume, entry.ticker], function(err: sqlite3.RunResult) {
              if (err) {
                console.error('Error inserting OHLC entry:', err);
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
              reject(err);
            } else if (errors > 0) {
              console.log(`Completed ${completed} insertions, but ${errors} errors occurred.`);
              reject(new Error(`Completed ${completed} insertions, but ${errors} errors occurred.`));
            } else {
              console.log(`Successfully saved ${completed} OHLC entries.`);
              resolve();
            }
          });
        });
      });
      res.status(201).send({ message: `Successfully saved ${data.length} OHLC entries.` });
    } catch (err) {
      res.status(500).send('Failed to save OHLC data due to a transaction error.');
    }
  },
];

export const getKeyLevels = async (req: Request, res: Response) => {
  const timeframe = req.query.timeframe as string || '1d';
  const tableName = `key_levels_${timeframe}`;
  const sql = `SELECT * FROM ${tableName} ORDER BY price`;
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      getDB().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.status(200).json({ data: rows });
  } catch (err) {
    console.error('Error fetching key levels:', err);
    res.status(500).send('Error fetching key levels');
  }
};

export const saveKeyLevels = [
  body('levels')
    .isArray()
    .withMessage('levels must be an array')
    .custom((levels: any[]) => levels.length > 0)
    .withMessage('levels array must not be empty'),
  body('ticker')
    .notEmpty()
    .withMessage('ticker is required'),
  body('timeframe')
    .notEmpty()
    .withMessage('timeframe is required'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { levels, ticker, timeframe } = req.body;
    console.log('Received levels:', levels);
    console.log('Received ticker:', ticker);
    console.log('Received timeframe:', timeframe);

    const tableName = `key_levels_${timeframe}`;
    const sql = `INSERT OR REPLACE INTO ${tableName} (price, ticker, strength, last_date) VALUES (?, ?, ?, ?)`;

    try {
      await new Promise<void>((resolve, reject) => {
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
              reject(err);
            } else if (errors > 0) {
              console.log(`Completed ${completed} insertions, but ${errors} errors occurred.`);
              reject(new Error(`Completed ${completed} insertions, but ${errors} errors occurred.`));
            } else {
              console.log(`Successfully saved ${completed} key levels.`);
              resolve();
            }
          });
        });
      });
      res.status(201).send({ message: `Successfully saved ${levels.length} key levels.` });
    } catch (err) {
      console.error('Transaction error:', err);
      res.status(500).send('Failed to save key levels due to a transaction error.');
    }
  },
];
