import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicitly load .env from server directory first, regardless of where the command was run
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback to process.cwd() .env
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  ADMIN_PIN_HASH: process.env.ADMIN_PIN_HASH || '',
  JWT_SECRET: process.env.JWT_SECRET || 'cookie_bakery_secret_key_change_me',
};
