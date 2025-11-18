import Joi from 'joi';

export function validateBody(schema) {
  return (req, res, next) => {
    // Debug: log a short preview of the raw incoming body to help diagnose parsing/shape issues
    try {
      const rawPreview = (typeof req.body === 'object') ? JSON.stringify(req.body).slice(0, 1000) : String(req.body).slice(0, 1000);
      console.log('[validate] raw body preview:', rawPreview);
    } catch (e) {
      console.log('[validate] raw body preview: <unserializable body>');
    }

    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
    }
    req.body = value;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
    }
    req.query = value;
    return next();
  };
}
