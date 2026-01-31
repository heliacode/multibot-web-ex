import {
  getAllCronjobs,
  getCronjobById,
  createCronjob,
  updateCronjob,
  deleteCronjob
} from '../models/cronjob.js';

// TODO: Add admin check middleware
// For now, we'll check if user is admin (you can implement proper admin role checking)
function isAdmin(req) {
  // Placeholder - implement proper admin check
  // For example, check if user has admin role in database
  // For now, allow all authenticated users (you should restrict this)
  return !!req.session.userId;
}

/**
 * Get all cronjobs
 */
export async function getCronjobs(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const cronjobs = await getAllCronjobs();
    res.json({
      success: true,
      cronjobs
    });
  } catch (error) {
    console.error('[Admin] Error getting cronjobs:', error);
    res.status(500).json({ error: 'Failed to get cronjobs' });
  }
}

/**
 * Get a single cronjob
 */
export async function getCronjob(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const cronjob = await getCronjobById(id);

    if (!cronjob) {
      return res.status(404).json({ error: 'Cronjob not found' });
    }

    res.json({
      success: true,
      cronjob
    });
  } catch (error) {
    console.error('[Admin] Error getting cronjob:', error);
    res.status(500).json({ error: 'Failed to get cronjob' });
  }
}

/**
 * Create a new cronjob
 */
export async function createCronjobHandler(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const {
      article_title,
      cron_expression,
      content_template,
      keywords,
      topic,
      is_active
    } = req.body;

    if (!article_title || !cron_expression) {
      return res.status(400).json({ error: 'Article title and cron expression are required' });
    }

    // Validate cron expression format (basic validation)
    const cronParts = cron_expression.trim().split(/\s+/);
    if (cronParts.length !== 5) {
      return res.status(400).json({ error: 'Invalid cron expression. Must have 5 parts: minute hour day month weekday' });
    }

    const cronjob = await createCronjob({
      article_title,
      cron_expression,
      content_template,
      keywords,
      topic,
      is_active: is_active !== undefined ? is_active : true
    });

    res.json({
      success: true,
      cronjob
    });
  } catch (error) {
    console.error('[Admin] Error creating cronjob:', error);
    res.status(500).json({ error: 'Failed to create cronjob' });
  }
}

/**
 * Update a cronjob
 */
export async function updateCronjobHandler(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const {
      article_title,
      cron_expression,
      content_template,
      keywords,
      topic,
      is_active
    } = req.body;

    const existingCronjob = await getCronjobById(id);
    if (!existingCronjob) {
      return res.status(404).json({ error: 'Cronjob not found' });
    }

    // Validate cron expression if provided
    if (cron_expression) {
      const cronParts = cron_expression.trim().split(/\s+/);
      if (cronParts.length !== 5) {
        return res.status(400).json({ error: 'Invalid cron expression. Must have 5 parts: minute hour day month weekday' });
      }
    }

    const cronjob = await updateCronjob(id, {
      article_title,
      cron_expression,
      content_template,
      keywords,
      topic,
      is_active
    });

    res.json({
      success: true,
      cronjob
    });
  } catch (error) {
    console.error('[Admin] Error updating cronjob:', error);
    res.status(500).json({ error: 'Failed to update cronjob' });
  }
}

/**
 * Delete a cronjob
 */
export async function deleteCronjobHandler(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const cronjob = await deleteCronjob(id);

    if (!cronjob) {
      return res.status(404).json({ error: 'Cronjob not found' });
    }

    res.json({
      success: true,
      message: 'Cronjob deleted successfully'
    });
  } catch (error) {
    console.error('[Admin] Error deleting cronjob:', error);
    res.status(500).json({ error: 'Failed to delete cronjob' });
  }
}
