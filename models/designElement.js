import { query } from '../config/database.js';

/**
 * Save or update design elements for a user
 */
export async function saveDesignElements(userId, twitchUserId, designData) {
  // Check if design already exists
  const existing = await query(
    `SELECT id FROM design_elements WHERE user_id = $1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    // Update existing design
    const result = await query(
      `UPDATE design_elements 
       SET design_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(designData), userId]
    );
    return result.rows[0];
  } else {
    // Create new design
    const result = await query(
      `INSERT INTO design_elements (user_id, twitch_user_id, design_data)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, twitchUserId, JSON.stringify(designData)]
    );
    return result.rows[0];
  }
}

/**
 * Get design elements for a user
 */
export async function getDesignElementsByUserId(userId) {
  const result = await query(
    `SELECT * FROM design_elements WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return {
    ...result.rows[0],
    design_data: typeof result.rows[0].design_data === 'string' 
      ? JSON.parse(result.rows[0].design_data)
      : result.rows[0].design_data
  };
}

/**
 * Get design elements by Twitch user ID
 */
export async function getDesignElementsByTwitchId(twitchUserId) {
  const result = await query(
    `SELECT * FROM design_elements WHERE twitch_user_id = $1`,
    [twitchUserId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return {
    ...result.rows[0],
    design_data: typeof result.rows[0].design_data === 'string' 
      ? JSON.parse(result.rows[0].design_data)
      : result.rows[0].design_data
  };
}

