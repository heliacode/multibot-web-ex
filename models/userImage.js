import { query } from '../config/database.js';

/**
 * Create a new user image
 */
export async function createUserImage(imageData) {
  const {
    userId,
    twitchUserId,
    filePath,
    fileName,
    fileSize,
    mimeType,
    width,
    height
  } = imageData;

  const result = await query(
    `INSERT INTO user_images 
     (user_id, twitch_user_id, file_path, file_name, file_size, mime_type, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, twitchUserId, filePath, fileName, fileSize, mimeType, width, height]
  );

  return result.rows[0];
}

/**
 * Get all images for a user
 */
export async function getUserImagesByUserId(userId) {
  const result = await query(
    `SELECT * FROM user_images 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Get all images for a user by Twitch user ID
 */
export async function getUserImagesByTwitchId(twitchUserId) {
  const result = await query(
    `SELECT * FROM user_images 
     WHERE twitch_user_id = $1 
     ORDER BY created_at DESC`,
    [twitchUserId]
  );

  return result.rows;
}

/**
 * Get a single image by ID
 */
export async function getUserImageById(imageId, userId) {
  const result = await query(
    `SELECT * FROM user_images 
     WHERE id = $1 AND user_id = $2`,
    [imageId, userId]
  );

  return result.rows[0];
}

/**
 * Delete a user image
 */
export async function deleteUserImage(imageId, userId) {
  const result = await query(
    `DELETE FROM user_images 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [imageId, userId]
  );

  return result.rows[0];
}

