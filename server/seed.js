import 'dotenv/config';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Settings from './models/Settings.js';
import Plan from './models/Plan.js';
import { defaultPlans } from './data/defaultPlans.js';

(async () => {
  await connectDB();
  const existing = await User.findOne({ role: 'owner' });
  if (!existing) {
    const owner = new User({
      name: process.env.OWNER_NAME || 'Gym Owner',
      email: process.env.OWNER_EMAIL,
      role: 'owner',
    });
    await owner.setPassword(process.env.OWNER_PASSWORD || 'change_me_strong');
    await owner.save();
    console.log('Owner created:', owner.email);
  } else {
    console.log('Owner already exists:', existing.email);
  }

  await Settings.findOneAndUpdate(
    { singleton: 'main' },
    { $setOnInsert: { businessName: 'GoGym', address: '', phone: '', whatsapp: '', email: '', openingHours: '' } },
    { upsert: true, new: true }
  );

  if ((await Plan.countDocuments()) === 0) {
    await Plan.insertMany(defaultPlans.map((plan) => ({ ...plan, active: true })));
    console.log('Seeded the default basic and professional membership plans.');
  }
  process.exit(0);
})();