import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const EXPIRES_IN = '30d';

export function signToken(payload: { clientId: string; email: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): { clientId: string; email: string } {
  return jwt.verify(token, SECRET) as { clientId: string; email: string };
}
