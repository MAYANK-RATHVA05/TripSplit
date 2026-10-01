import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, preferredCurrency } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      preferredCurrency: (preferredCurrency || 'USD').toUpperCase()
    });

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency
      },
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency
      },
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve profile.', details: err.message });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { name, preferredCurrency } = req.body;
    const updates: Partial<{ name: string; preferredCurrency: string }> = {};

    if (name) updates.name = name.trim();
    if (preferredCurrency) updates.preferredCurrency = preferredCurrency.toUpperCase();

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true }).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        preferredCurrency: user.preferredCurrency
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
}
