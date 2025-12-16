import pool from '../config/database.js';

/**
 * Create a new bit trigger
 */
export async function createBitTrigger(bitTriggerData) {
  const {
    userId,
    twitchUserId,
    bitAmount,
    commandType,
    commandId
  } = bitTriggerData;

  if (!commandType || !commandId) {
    throw new Error('commandType and commandId are required');
  }

  const query = `
    INSERT INTO bit_triggers (
      user_id, twitch_user_id, bit_amount, command_type, command_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    userId,
    twitchUserId,
    bitAmount,
    commandType,
    commandId
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error(`Bit trigger for ${bitAmount} bits already exists`);
    }
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get all bit triggers for a user
 */
export async function getBitTriggersByUserId(userId) {
  const query = `
    SELECT bt.*,
           CASE 
             WHEN bt.command_type = 'audio' THEN ac.command
             WHEN bt.command_type = 'gif' THEN gc.command
           END as command_name,
           CASE 
             WHEN bt.command_type = 'audio' THEN ac.file_path
             WHEN bt.command_type = 'gif' THEN gc.gif_url
           END as command_data
    FROM bit_triggers bt
    LEFT JOIN audio_commands ac ON bt.command_type = 'audio' AND bt.command_id = ac.id
    LEFT JOIN gif_commands gc ON bt.command_type = 'gif' AND bt.command_id = gc.id
    WHERE bt.user_id = $1
    ORDER BY bt.bit_amount ASC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get all active bit triggers for a Twitch user
 */
export async function getActiveBitTriggersByTwitchUserId(twitchUserId) {
  const query = `
    SELECT bt.*,
           CASE 
             WHEN bt.command_type = 'audio' THEN ac.command
             WHEN bt.command_type = 'gif' THEN gc.command
           END as command_name,
           CASE 
             WHEN bt.command_type = 'audio' THEN ac.file_path
             WHEN bt.command_type = 'gif' THEN gc.gif_url
           END as command_data
    FROM bit_triggers bt
    LEFT JOIN audio_commands ac ON bt.command_type = 'audio' AND bt.command_id = ac.id
    LEFT JOIN gif_commands gc ON bt.command_type = 'gif' AND bt.command_id = gc.id
    WHERE bt.twitch_user_id = $1 AND bt.is_active = true
    ORDER BY bt.bit_amount ASC
  `;

  try {
    const result = await pool.query(query, [twitchUserId]);
    return result.rows;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get bit trigger by ID
 */
export async function getBitTriggerById(id, userId) {
  const query = `
    SELECT bt.*,
           CASE 
             WHEN bt.command_type = 'audio' THEN ac.command
             WHEN bt.command_type = 'gif' THEN gc.command
           END as command_name
    FROM bit_triggers bt
    LEFT JOIN audio_commands ac ON bt.command_type = 'audio' AND bt.command_id = ac.id
    LEFT JOIN gif_commands gc ON bt.command_type = 'gif' AND bt.command_id = gc.id
    WHERE bt.id = $1 AND bt.user_id = $2
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
 * Find the best matching bit trigger for a given amount
 * Returns the trigger with the highest bit_amount that is <= the given amount
 */
export async function findBitTriggerForAmount(twitchUserId, bitAmount) {
  const query = `
    SELECT bt.*,
           CASE 
             WHEN bt.command_type = 'audio' THEN ac.command
             WHEN bt.command_type = 'gif' THEN gc.command
           END as command_name,
           CASE 
             WHEN bt.command_type = 'audio' THEN ac.file_path
             WHEN bt.command_type = 'gif' THEN gc.gif_url
           END as command_data
    FROM bit_triggers bt
    LEFT JOIN audio_commands ac ON bt.command_type = 'audio' AND bt.command_id = ac.id
    LEFT JOIN gif_commands gc ON bt.command_type = 'gif' AND bt.command_id = gc.id
    WHERE bt.twitch_user_id = $1 
      AND bt.is_active = true 
      AND bt.bit_amount <= $2
    ORDER BY bt.bit_amount DESC
    LIMIT 1
  `;

  try {
    const result = await pool.query(query, [twitchUserId, bitAmount]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Update a bit trigger
 */
export async function updateBitTrigger(id, userId, updateData) {
  const allowedFields = [
    'bit_amount', 'command_type', 'command_id', 'is_active'
  ];
  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramCount}`);
      values.push(updateData[key]);
      paramCount++;
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id, userId);
  const query = `
    UPDATE bit_triggers
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
      throw new Error(`Bit trigger for ${updateData.bit_amount} bits already exists`);
    }
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Delete a bit trigger
 */
export async function deleteBitTrigger(id, userId) {
  const query = `
    DELETE FROM bit_triggers
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

