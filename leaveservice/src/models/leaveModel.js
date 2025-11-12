// Sequelize models for leave management
import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

// leave_policies
export const LeavePolicy = sequelize.define('leave_policies', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  policy_name: { type: DataTypes.STRING(100), allowNull: false },
  leave_type: { type: DataTypes.STRING(50), allowNull: false },
  max_days_per_year: { type: DataTypes.INTEGER, allowNull: false },
  carry_forward: { type: DataTypes.BOOLEAN, defaultValue: false },
  description: { type: DataTypes.TEXT },
}, {
  tableName: 'leave_policies',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// leave_requests
export const LeaveRequest = sequelize.define('leave_requests', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  policy_id: { type: DataTypes.INTEGER, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('pending','approved','rejected','cancelled'), defaultValue: 'pending' },
  approver_id: { type: DataTypes.UUID },
  approved_at: { type: DataTypes.DATE },
}, {
  tableName: 'leave_requests',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// leave_balances
export const LeaveBalance = sequelize.define('leave_balances', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  policy_id: { type: DataTypes.INTEGER, allowNull: false },
  total_allocated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  total_used: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // balance_days is generated in DB; expose as virtual computed field in Sequelize
  balance_days: {
    type: DataTypes.VIRTUAL,
    get() {
      return (this.getDataValue('total_allocated') || 0) - (this.getDataValue('total_used') || 0);
    }
  },
  year: { type: DataTypes.INTEGER, defaultValue: (new Date()).getFullYear() },
}, {
  tableName: 'leave_balances',
  underscored: true,
  timestamps: false,
});

// leave_audit
export const LeaveAudit = sequelize.define('leave_audit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  action: { type: DataTypes.STRING(50), allowNull: false },
  user_id: { type: DataTypes.UUID },
  request_id: { type: DataTypes.INTEGER },
  details: { type: DataTypes.JSONB },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'leave_audit',
  underscored: true,
  timestamps: false,
});

// Associations
LeavePolicy.hasMany(LeaveRequest, { foreignKey: 'policy_id' });
LeaveRequest.belongsTo(LeavePolicy, { foreignKey: 'policy_id' });

LeavePolicy.hasMany(LeaveBalance, { foreignKey: 'policy_id' });
LeaveBalance.belongsTo(LeavePolicy, { foreignKey: 'policy_id' });

LeaveRequest.hasMany(LeaveAudit, { foreignKey: 'request_id' });
LeaveAudit.belongsTo(LeaveRequest, { foreignKey: 'request_id' });

export default {
  LeavePolicy,
  LeaveRequest,
  LeaveBalance,
  LeaveAudit,
};
