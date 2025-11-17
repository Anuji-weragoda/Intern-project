import Joi from 'joi';

export const createLeaveSchema = Joi.object({
  // user_id will be populated from the authenticated token when present
  user_id: Joi.string().uuid().optional(),
  // policy_id may be omitted by clients; server will select a default policy when absent
  policy_id: Joi.number().integer().optional(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().required(),
  reason: Joi.string().max(2000).allow('', null),
});

export const patchLeaveSchema = Joi.object({
  action: Joi.string().valid('approve','reject','cancel').required(),
  approver_id: Joi.string().uuid().optional(),
  note: Joi.string().allow('', null).optional(),
});
