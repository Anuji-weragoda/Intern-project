import Joi from 'joi';

export const clockInSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  method: Joi.string().valid('mobile','web','kiosk').optional(),
  geo: Joi.object({ lat: Joi.number().required(), lon: Joi.number().required() }).optional()
});

export const clockOutSchema = Joi.object({
  user_id: Joi.string().uuid().required()
});
