import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
  checkedInAt: { type: Date, default: Date.now, index: true },
  method: { type: String, enum: ['manual', 'qr'], default: 'manual' },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);