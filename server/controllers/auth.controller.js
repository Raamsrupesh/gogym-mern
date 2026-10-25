import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { redis } from '../config/redis.js';

function createAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TTL || '15m' }
  );
}

function createRefreshToken(user, tokenId) {
  return jwt.sign({ sub: user._id.toString(), jti: tokenId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: `${process.env.REFRESH_TTL_DAYS || 7}d`,
  });
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 86400 * 1000,
    path: '/api/auth',
  });
}

async function registerMember(req, res, next) {
  try {
    const { name, email, password, phone, consentMarketing } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const user = new User({ name, email, phone, consentMarketing: !!consentMarketing });
    await user.setPassword(password);
    await user.save();
    res.json({ user: user.toSafe() });
  } catch (error) {
    next(error);
  }
}

async function logInMember(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await user.verifyPassword(password);
    if (!passwordMatches) return res.status(401).json({ error: 'Invalid credentials' });

    const tokenId = crypto.randomUUID();
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user, tokenId);
    await redis.set(
      `rt:${tokenId}`,
      user._id.toString(),
      'EX',
      (Number(process.env.REFRESH_TTL_DAYS) || 7) * 86400
    );
    setRefreshCookie(res, refreshToken);
    res.json({ access: accessToken, user: user.toSafe() });
  } catch (error) {
    next(error);
  }
}

async function refreshMemberSession(req, res, next) {
  try {
    const refreshToken = req.cookies?.refresh;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    let tokenPayload;
    try {
      tokenPayload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh' });
    }

    const storedUserId = await redis.get(`rt:${tokenPayload.jti}`);
    if (!storedUserId || storedUserId !== tokenPayload.sub) {
      return res.status(401).json({ error: 'Revoked' });
    }

    const user = await User.findById(tokenPayload.sub);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'No user' });

    await redis.del(`rt:${tokenPayload.jti}`);
    const tokenId = crypto.randomUUID();
    const accessToken = createAccessToken(user);
    const nextRefreshToken = createRefreshToken(user, tokenId);
    await redis.set(
      `rt:${tokenId}`,
      user._id.toString(),
      'EX',
      (Number(process.env.REFRESH_TTL_DAYS) || 7) * 86400
    );
    setRefreshCookie(res, nextRefreshToken);
    res.json({ access: accessToken, user: user.toSafe() });
  } catch (error) {
    next(error);
  }
}

async function logOutMember(req, res, next) {
  try {
    const refreshToken = req.cookies?.refresh;
    if (refreshToken) {
      try {
        const tokenPayload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await redis.del(`rt:${tokenPayload.jti}`);
      } catch (error) {
        if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
          throw error;
        }
      }
    }

    res.clearCookie('refresh', { path: '/api/auth' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user: user.toSafe() });
  } catch (error) {
    next(error);
  }
}

async function updateMemberReminderConsent(req, res, next) {
  try {
    if (typeof req.body.consentMarketing !== 'boolean') {
      return res.status(400).json({ error: 'A boolean WhatsApp reminder preference is required' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.user.sub, role: 'member' },
      { $set: { consentMarketing: req.body.consentMarketing } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Member not found' });
    res.json({ user: user.toSafe() });
  } catch (error) {
    next(error);
  }
}

export { registerMember, logInMember, refreshMemberSession, logOutMember, getCurrentUser, updateMemberReminderConsent };
