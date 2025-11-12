// Sequelize models for attendance management
import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

export const AttendanceLog = sequelize.define('attendance_logs', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  clock_in: { type: DataTypes.DATE },
  clock_out: { type: DataTypes.DATE },
  // total_hours is computed by DB; expose as virtual
  total_hours: {
    type: DataTypes.VIRTUAL,
    get() {
      const inTs = this.getDataValue('clock_in');
      const outTs = this.getDataValue('clock_out');
      if (inTs && outTs) {
        return (new Date(outTs) - new Date(inTs)) / 3600000; // hours
      }
      return null;
    }
  },
  method: { type: DataTypes.STRING(20), defaultValue: 'mobile' },
  geo_location: { type: DataTypes.GEOMETRY('POINT') },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'attendance_logs',
  underscored: true,
  timestamps: false,
});

export default {
  AttendanceLog,
};
