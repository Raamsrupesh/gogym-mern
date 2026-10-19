import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['owner', 'staff', 'member'], default: 'member', index: true },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  consentMarketing: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.methods.setPassword = async function (pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
};
userSchema.methods.verifyPassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};
userSchema.methods.toSafe = function () {
  const { passwordHash, __v, ...rest } = this.toObject();
  return rest;
};
export default mongoose.model('User', userSchema);