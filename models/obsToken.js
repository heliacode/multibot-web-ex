import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Generate a secure random token for OBS browser source
 * Returns a base64-encoded random string (44 characters)
 */
function generateToken() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Get or create an OBS token for a user
 * If user already has a token, return it. Otherwise, create a new one.
 */
export async function getOrCreateObsToken(userId, twitchUserId) {
  try {
    // Check if user already has a token
    const existingQuery = 'SELECT * FROM obs_tokens WHERE user_id = $1';
    const existingResult = await pool.query(existingQuery, [userId]);
    
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0];
    }
    
    // Create new token
    const token = generateToken();
    const insertQuery = `
      INSERT INTO obs_tokens (user_id, twitch_user_id, token)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const insertResult = await pool.query(insertQuery, [userId, twitchUserId, token]);
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error getting/creating OBS token:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get OBS token by token string (for validation)
 */
export async function getObsTokenByToken(token) {
  try {
    const query = 'SELECT * FROM obs_tokens WHERE token = $1';
    const result = await pool.query(query, [token]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting OBS token:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get OBS token by user ID
 */
export async function getObsTokenByUserId(userId) {
  try {
    const query = 'SELECT * FROM obs_tokens WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting OBS token by user ID:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Regenerate OBS token for a user
 * Deletes old token and creates a new one
 */
export async function regenerateObsToken(userId, twitchUserId) {
  try {
    // Delete existing token
    const deleteQuery = 'DELETE FROM obs_tokens WHERE user_id = $1';
    await pool.query(deleteQuery, [userId]);
    
    // Create new token
    const token = generateToken();
    const insertQuery = `
      INSERT INTO obs_tokens (user_id, twitch_user_id, token)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [userId, twitchUserId, token]);
    return result.rows[0];
  } catch (error) {
    console.error('Error regenerating OBS token:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Update last_used_at timestamp when token is used
 */
export async function updateTokenUsage(token) {
  try {
    const query = `
      UPDATE obs_tokens
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE token = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [token]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating token usage:', error);
    // Don't throw error - usage tracking is not critical
    return null;
  }
}

/**
 * Delete OBS token for a user
 */
export async function deleteObsToken(userId) {
  try {
    const query = 'DELETE FROM obs_tokens WHERE user_id = $1 RETURNING *';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting OBS token:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

