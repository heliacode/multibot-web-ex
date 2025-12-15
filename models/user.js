import pool from '../config/database.js';
import { encrypt, decrypt } from '../config/encryption.js';

export async function createUser(userData) {
  try {
    const {
      twitchUserId,
      twitchUsername,
      twitchDisplayName,
      twitchEmail,
      profileImageUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes
    } = userData;

    const query = `
      INSERT INTO users (
        twitch_user_id, twitch_username, twitch_display_name, twitch_email,
        profile_image_url, access_token, refresh_token, token_expires_at, scopes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (twitch_user_id) 
      DO UPDATE SET
        twitch_username = EXCLUDED.twitch_username,
        twitch_display_name = EXCLUDED.twitch_display_name,
        twitch_email = EXCLUDED.twitch_email,
        profile_image_url = EXCLUDED.profile_image_url,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        scopes = EXCLUDED.scopes,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      twitchUserId,
      twitchUsername,
      twitchDisplayName,
      twitchEmail,
      profileImageUrl,
      encrypt(accessToken),
      encrypt(refreshToken),
      tokenExpiresAt,
      JSON.stringify(scopes)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createUser:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

export async function getUserByTwitchId(twitchUserId) {
  const query = 'SELECT * FROM users WHERE twitch_user_id = $1';
  const result = await pool.query(query, [twitchUserId]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    ...user,
    access_token: decrypt(user.access_token),
    refresh_token: decrypt(user.refresh_token),
    scopes: JSON.parse(user.scopes)
  };
}

export async function getUserById(id) {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    ...user,
    access_token: decrypt(user.access_token),
    refresh_token: decrypt(user.refresh_token),
    scopes: JSON.parse(user.scopes)
  };
}

export async function updateUserTokens(twitchUserId, accessToken, refreshToken, tokenExpiresAt) {
  const query = `
    UPDATE users 
    SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = NOW()
    WHERE twitch_user_id = $4
    RETURNING *
  `;

  const values = [
    encrypt(accessToken),
    encrypt(refreshToken),
    tokenExpiresAt,
    twitchUserId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

