import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  kind: { type: String, enum: ['fault', 'maintenance', 'repair'], required: true },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  scheduledAt: Date,
  completedAt: Date,
  costInPaise: { type: Number, min: 0, default: 0 },
  notes: { type: String, trim: true, maxlength: 2000 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, trim: true, maxlength: 80 },
  brand: { type: String, trim: true, maxlength: 120 },
  model: { type: String, trim: true, maxlength: 120 },
  serialNumber: { type: String, trim: true, maxlength: 120 },
  location: { type: String, trim: true, maxlength: 120 },
  purchaseDate: Date,
  purchaseCostInPaise: { type: Number, min: 0 },
  status: { type: String, enum: ['operational', 'needs_maintenance', 'under_repair', 'out_of_service'], default: 'operational', index: true },
  nextMaintenanceAt: { type: Date, index: true },
  maintenance: [maintenanceSchema],
  archivedAt: Date,
}, { timestamps: true });

export default mongoose.model('Equipment', equipmentSchema);
