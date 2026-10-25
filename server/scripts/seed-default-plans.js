import '../config/env.js';
import { connectDB } from '../config/db.js';
import Plan from '../models/Plan.js';
import { defaultPlans } from '../data/defaultPlans.js';

await connectDB();
for (const plan of defaultPlans) {
  await Plan.updateOne(
    { code: plan.code },
    { $setOnInsert: { ...plan, active: true } },
    { upsert: true, runValidators: true },
  );
}
console.log(`Ensured ${defaultPlans.length} default membership plans exist.`);
process.exit(0);
