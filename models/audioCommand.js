import pool from '../config/database.js';

/**
 * Create a new audio command
 */
export async function createAudioCommand(audioCommandData) {
  const {
    userId,
    twitchUserId,
    command,
    filePath,
    fileUrl,
    fileSize,
    volume = 0.5,
    isBitsOnly = false
  } = audioCommandData;

  const query = `
    INSERT INTO audio_commands (
      user_id, twitch_user_id, command, file_path, file_url, file_size, volume, is_bits_only
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  // Remove ! prefix if present (commands should be stored without !)
  const cleanCommand = command.toLowerCase().replace(/^!/, '');
  
  const values = [
    userId,
    twitchUserId,
    cleanCommand,
    filePath,
    fileUrl || null,
    fileSize,
    volume,
    isBitsOnly
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
 * Get all audio commands for a user
 */
export async function getAudioCommandsByUserId(userId) {
  const query = `
    SELECT * FROM audio_commands
    WHERE user_id = $1 AND (is_bits_only = false OR is_bits_only IS NULL)
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
 * Get all active audio commands for a Twitch user
 */
export async function getActiveAudioCommandsByTwitchUserId(twitchUserId) {
  const query = `
    SELECT * FROM audio_commands
    WHERE twitch_user_id = $1 AND is_active = true AND (is_bits_only = false OR is_bits_only IS NULL)
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
 * Get audio command by ID
 */
export async function getAudioCommandById(id, userId = null) {
  let query;
  let values;
  
  if (userId) {
    query = `
      SELECT * FROM audio_commands
      WHERE id = $1 AND user_id = $2
    `;
    values = [id, userId];
  } else {
    query = `
      SELECT * FROM audio_commands
      WHERE id = $1
    `;
    values = [id];
  }

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Update an audio command
 */
export async function updateAudioCommand(id, userId, updateData) {
  const allowedFields = ['command', 'file_path', 'file_url', 'file_size', 'volume', 'is_active'];
  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramCount}`);
      if (key === 'command') {
        // Remove ! prefix if present (commands should be stored without !)
        const cleanCommand = updateData[key].toLowerCase().replace(/^!/, '');
        values.push(cleanCommand);
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
    UPDATE audio_commands
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
 * Delete an audio command
 */
export async function deleteAudioCommand(id, userId) {
  const query = `
    DELETE FROM audio_commands
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

