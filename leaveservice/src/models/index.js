// Centralized models export
import sequelize from './sequelize.js';
import { LeavePolicy, LeaveRequest, LeaveBalance, LeaveAudit } from './leaveModel.js';
import AttendanceDefault from './attendanceModel.js';

const { AttendanceLog } = AttendanceDefault;

// ✅ Check DB connection on initialization
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
})();

// Ensure associations are initialized by importing models
// (associations are set inside model files)

export {
  sequelize,
  LeavePolicy,
  LeaveRequest,
  LeaveBalance,
  LeaveAudit,
  AttendanceLog,
};

export default {
  sequelize,
  LeavePolicy,
  LeaveRequest,
  LeaveBalance,
  LeaveAudit,
  AttendanceLog,
};
