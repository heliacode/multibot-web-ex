import pool from '../config/database.js';

/**
 * Get all cronjobs
 */
export async function getAllCronjobs() {
  const query = `
    SELECT * FROM cronjobs
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get cronjob by ID
 */
export async function getCronjobById(id) {
  const query = 'SELECT * FROM cronjobs WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Create a new cronjob
 */
export async function createCronjob(cronjobData) {
  const {
    article_title,
    cron_expression,
    content_template,
    keywords,
    topic,
    is_active = true
  } = cronjobData;

  const query = `
    INSERT INTO cronjobs (
      article_title, cron_expression, content_template, keywords, topic, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    article_title,
    cron_expression,
    content_template || '',
    keywords || '',
    topic || '',
    is_active
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update a cronjob
 */
export async function updateCronjob(id, cronjobData) {
  const {
    article_title,
    cron_expression,
    content_template,
    keywords,
    topic,
    is_active
  } = cronjobData;

  const query = `
    UPDATE cronjobs
    SET 
      article_title = $1,
      cron_expression = $2,
      content_template = $3,
      keywords = $4,
      topic = $5,
      is_active = $6,
      updated_at = NOW()
    WHERE id = $7
    RETURNING *
  `;

  const values = [
    article_title,
    cron_expression,
    content_template || '',
    keywords || '',
    topic || '',
    is_active,
    id
  ];

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Delete a cronjob
 */
export async function deleteCronjob(id) {
  const query = 'DELETE FROM cronjobs WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get active cronjobs
 */
export async function getActiveCronjobs() {
  const query = `
    SELECT * FROM cronjobs
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Update next run time for a cronjob
 */
export async function updateNextRun(id, nextRun) {
  const query = `
    UPDATE cronjobs
    SET next_run = $1
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [nextRun, id]);
  return result.rows[0] || null;
}
