import pool from '../config/database.js';

/**
 * Create a new animated text command
 */
export async function createAnimatedTextCommand(animatedTextData) {
    const {
    userId,
    twitchUserId,
    command,
    textContent = null, // Optional - can be null for dynamic text
    animationType = 'neon',
    positionX = 960,
    positionY = 540,
    fontSize = 48,
    duration = 5000,
    color1 = '#ff005e',
    color2 = '#00d4ff',
    fontFamily = 'Arial',
    transitionPreset = 'fade',
    transitionInMs = 250,
    transitionOutMs = 400,
    transitionDistance = 40,
    customAnimationIn = null,
    customAnimationOut = null,
    isBitsOnly = false
  } = animatedTextData;

  const query = `
    INSERT INTO animated_text_commands (
      user_id, twitch_user_id, command, text_content, animation_type,
      position_x, position_y, font_size, duration, color1, color2,
      font_family, transition_preset, transition_in_ms, transition_out_ms, transition_distance,
      custom_animation_in, custom_animation_out,
      is_bits_only
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `;

  const values = [
    userId,
    twitchUserId,
    command.toLowerCase(),
    textContent,
    animationType,
    positionX,
    positionY,
    fontSize,
    duration,
    color1,
    color2,
    fontFamily,
    transitionPreset,
    transitionInMs,
    transitionOutMs,
    transitionDistance,
    customAnimationIn,
    customAnimationOut,
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
 * Get all animated text commands for a user
 */
export async function getAnimatedTextCommandsByUserId(userId) {
  const query = `
    SELECT * FROM animated_text_commands
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
 * Get all active animated text commands for a Twitch user
 */
export async function getActiveAnimatedTextCommandsByTwitchUserId(twitchUserId) {
  const query = `
    SELECT * FROM animated_text_commands
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
 * Get animated text command by ID
 */
export async function getAnimatedTextCommandById(id, userId = null) {
  let query;
  let values;
  
  if (userId) {
    query = `
      SELECT * FROM animated_text_commands
      WHERE id = $1 AND user_id = $2
    `;
    values = [id, userId];
  } else {
    query = `
      SELECT * FROM animated_text_commands
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
 * Update an animated text command
 */
export async function updateAnimatedTextCommand(id, userId, updateData) {
  const allowedFields = [
    'command', 'text_content', 'animation_type', 'position_x', 'position_y',
    'font_size', 'duration', 'color1', 'color2', 'font_family',
    'transition_preset', 'transition_in_ms', 'transition_out_ms', 'transition_distance',
    'custom_animation_in', 'custom_animation_out',
    'is_active'
  ];
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
    UPDATE animated_text_commands
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
 * Delete an animated text command
 */
export async function deleteAnimatedTextCommand(id, userId) {
  const query = `
    DELETE FROM animated_text_commands
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
