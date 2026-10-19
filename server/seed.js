import 'dotenv/config';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Settings from './models/Settings.js';
import Plan from './models/Plan.js';

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
    await Plan.create({
      name: 'Monthly', description: 'Full gym access, 30 days', priceInPaise: 150000,
      durationDays: 30, joiningFeeInPaise: 0, active: true, order: 1,
      benefits: ['Full equipment access', 'Locker'],
    });
    console.log('Seeded one sample plan — replace with real plans in the owner dashboard.');
  }
  process.exit(0);
})();