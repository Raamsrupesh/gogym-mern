export const workoutServices = [
  {
    id: 'personal-training',
    title: 'Personal Training',
    description: 'One-on-one coaching tailored to your body type, fitness level, schedule, and goals — with a personalized plan, form correction, and consistent progress tracking.'
  },
  {
    id: 'hiit',
    title: 'HIIT Workouts',
    description: 'Short, high-intensity interval sessions combining cardio and strength movements to maximize calorie burn, improve stamina, and build lean muscle in less time.'
  },
  {
    id: 'weight-loss',
    title: 'Weight Loss Program',
    description: 'A sustainable fat-loss program combining calorie-focused nutrition guidance, strength training, and cardio conditioning to reduce body weight while preserving muscle.'
  },
  {
    id: 'weight-gain',
    title: 'Weight Gain Program',
    description: 'A structured lean-mass program with progressive strength training, calorie-surplus nutrition guidance, and recovery planning to help underweight clients gain healthy weight.'
  },
  {
    id: 'muscle-building',
    title: 'Muscle Building Program',
    description: 'Progressive hypertrophy training using compound and isolation exercises, planned training volume, and nutrition support to build strength, size, and a balanced physique.'
  },
  {
    id: 'belly-fat-training',
    title: 'Belly Fat Training',
    description: 'Full-body fat-loss training with core strengthening, metabolic conditioning, and nutrition coaching — because overall fat reduction, not spot reduction, reduces belly fat.'
  },
  {
    id: 'zero-size',
    title: 'Zero Size Program',
    description: 'A body-toning and inch-loss program focused on controlled strength work, conditioning, posture, and healthy nutrition habits for a leaner, more defined body shape.'
  },
  {
    id: 'cardio-training',
    title: 'Cardio Training',
    description: 'Treadmill, cycling, rowing, and functional cardio sessions designed to improve heart health, lung capacity, endurance, and daily energy levels.'
  },
  {
    id: 'strength-training',
    title: 'Strength Training',
    description: 'Progressive resistance training with free weights, machines, and bodyweight movements to build muscle, improve bone density, boost metabolism, and develop functional power.'
  },
  {
    id: 'gait-training-stroke',
    title: 'Gait Training for Brain Stroke Patients',
    description: 'Supervised rehabilitation-focused walking training to improve balance, coordination, leg strength, step symmetry, and confidence after a stroke. Delivered only with appropriate medical clearance and under qualified physiotherapy guidance.'
  }
];

export function getWorkoutService(id) {
  return workoutServices.find((service) => service.id === id);
}