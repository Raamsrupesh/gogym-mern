import mongoose from 'mongoose';

const memberReportSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['bmi_report', 'body_measurements', 'progress_assessment'],
    required: true,
    index: true,
  },
  assessmentDate: { type: Date, required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  document: {
    filename: String,
    originalName: String,
    mimeType: String,
  },
}, { timestamps: true });

memberReportSchema.index({ member: 1, type: 1, assessmentDate: -1 });
export default mongoose.model('MemberReport', memberReportSchema);
