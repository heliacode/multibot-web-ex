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

  // Remove ! prefix if present (commands should be stored without !)
  const cleanCommand = command.toLowerCase().replace(/^!/, '');

  // Try with is_bits_only first, fallback to without it if column doesn't exist
  let query = `
    INSERT INTO audio_commands (
      user_id, twitch_user_id, command, file_path, file_url, file_size, volume, is_bits_only
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  
  let values = [
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
    console.log('[AUDIO CMD MODEL] Inserting with values:', values);
    const result = await pool.query(query, values);
    console.log('[AUDIO CMD MODEL] Insert successful:', result.rows[0]?.id);
    return result.rows[0];
  } catch (error) {
    // If column doesn't exist, retry without is_bits_only
    if (error.message && error.message.includes('column "is_bits_only" does not exist')) {
      console.log('[AUDIO CMD MODEL] is_bits_only column not found, retrying without it');
      query = `
        INSERT INTO audio_commands (
          user_id, twitch_user_id, command, file_path, file_url, file_size, volume
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      values = [
        userId,
        twitchUserId,
        cleanCommand,
        filePath,
        fileUrl || null,
        fileSize,
        volume
      ];
      
      try {
        const result = await pool.query(query, values);
        console.log('[AUDIO CMD MODEL] Insert successful (without is_bits_only):', result.rows[0]?.id);
        return result.rows[0];
      } catch (retryError) {
        console.error('[AUDIO CMD MODEL] Retry failed:', retryError.message);
        if (retryError.code === '23505') {
          throw new Error(`Command "${command}" already exists`);
        }
        throw new Error(`Database error: ${retryError.message}`);
      }
    }
    
    console.error('[AUDIO CMD MODEL] Database error:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      constraint: error.constraint
    });
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
  // Try with is_bits_only filter, fallback to without if column doesn't exist
  let query = `
    SELECT * FROM audio_commands
    WHERE user_id = $1 AND (is_bits_only = false OR is_bits_only IS NULL)
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    // If column doesn't exist, retry without the filter
    if (error.message && error.message.includes('column "is_bits_only" does not exist')) {
      query = `
        SELECT * FROM audio_commands
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    }
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get all active audio commands for a Twitch user
 */
export async function getActiveAudioCommandsByTwitchUserId(twitchUserId) {
  // Try with is_bits_only filter, fallback to without if column doesn't exist
  let query = `
    SELECT * FROM audio_commands
    WHERE twitch_user_id = $1 AND is_active = true AND (is_bits_only = false OR is_bits_only IS NULL)
    ORDER BY command ASC
  `;

  try {
    const result = await pool.query(query, [twitchUserId]);
    return result.rows;
  } catch (error) {
    // If column doesn't exist, retry without the filter
    if (error.message && error.message.includes('column "is_bits_only" does not exist')) {
      query = `
        SELECT * FROM audio_commands
        WHERE twitch_user_id = $1 AND is_active = true
        ORDER BY command ASC
      `;
      const result = await pool.query(query, [twitchUserId]);
      return result.rows;
    }
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

