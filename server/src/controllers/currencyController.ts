import { Request, Response } from 'express';
import { CURRENCIES } from '../domain/currencies.js';

export function getCurrencies(_req: Request, res: Response): void {
  const list = Object.values(CURRENCIES);
  res.json({ currencies: list });
}
