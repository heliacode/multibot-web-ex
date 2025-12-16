import pool from '../config/database.js';

/**
 * Create a new GIF command
 */
export async function createGifCommand(gifCommandData) {
  const {
    userId,
    twitchUserId,
    command,
    gifUrl,
    gifId = null,
    gifTitle = null,
    duration = 5000,
    position = 'center',
    size = 'medium'
  } = gifCommandData;

  const query = `
    INSERT INTO gif_commands (
      user_id, twitch_user_id, command, gif_url, gif_id, gif_title, duration, position, size
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    userId,
    twitchUserId,
    command.toLowerCase(),
    gifUrl,
    gifId,
    gifTitle,
    duration,
    position,
    size
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error(`Command "${command}" already exists`);
    }
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get all GIF commands for a user
 */
export async function getGifCommandsByUserId(userId) {
  const query = `
    SELECT * FROM gif_commands
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get all active GIF commands for a Twitch user
 */
export async function getActiveGifCommandsByTwitchUserId(twitchUserId) {
  const query = `
    SELECT * FROM gif_commands
    WHERE twitch_user_id = $1 AND is_active = true
    ORDER BY command ASC
  `;

  try {
    const result = await pool.query(query, [twitchUserId]);
    return result.rows;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get GIF command by ID
 */
export async function getGifCommandById(id, userId) {
  const query = `
    SELECT * FROM gif_commands
    WHERE id = $1 AND user_id = $2
  `;

  try {
    const result = await pool.query(query, [id, userId]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Update a GIF command
 */
export async function updateGifCommand(id, userId, updateData) {
  const allowedFields = ['command', 'gif_url', 'gif_id', 'gif_title', 'duration', 'is_active', 'position', 'size'];
  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramCount}`);
      if (key === 'command') {
        values.push(updateData[key].toLowerCase());
      } else {
        values.push(updateData[key]);
      }
      paramCount++;
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id, userId);
  const query = `
    UPDATE gif_commands
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
    RETURNING *
  `;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error(`Command "${updateData.command}" already exists`);
    }
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Delete a GIF command
 */
export async function deleteGifCommand(id, userId) {
  const query = `
    DELETE FROM gif_commands
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;

  try {
    const result = await pool.query(query, [id, userId]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

