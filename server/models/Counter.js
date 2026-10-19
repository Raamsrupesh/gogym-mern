import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
}, { _id: false });

counterSchema.statics.next = async function (key) {
  const doc = await this.findOneAndUpdate(
    { _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true }
  );
  return doc.seq;
};
export default mongoose.model('Counter', counterSchema);