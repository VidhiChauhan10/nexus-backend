import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from './modules/user/user.model';
import { Project } from './modules/project/project.model';
import { Task } from './modules/task/task.model';
import { hashPassword } from './utils/bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/team-task-manager';

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});
  console.log('🗑️  Cleared existing data');

  // Create users
  const adminPass = await hashPassword('admin123');
  const memberPass = await hashPassword('member123');

  const admin = await User.create({
    name: 'Alex Johnson',
    email: 'admin@example.com',
    password: adminPass,
    role: 'admin',
  });

  const member1 = await User.create({
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    password: memberPass,
    role: 'member',
  });

  const member2 = await User.create({
    name: 'Marcus Williams',
    email: 'marcus@example.com',
    password: memberPass,
    role: 'member',
  });

  console.log('👥 Created 3 users');

  // Create projects
  const project1 = await Project.create({
    title: 'Website Redesign',
    description: 'Revamp the company website with modern design and better UX',
    createdBy: admin._id,
    members: [
      { user: admin._id, role: 'admin' },
      { user: member1._id, role: 'member' },
      { user: member2._id, role: 'member' },
    ],
  });

  const project2 = await Project.create({
    title: 'Mobile App MVP',
    description: 'Build the first version of our mobile application',
    createdBy: admin._id,
    members: [
      { user: admin._id, role: 'admin' },
      { user: member1._id, role: 'member' },
    ],
  });

  console.log('📁 Created 2 projects');

  // Create tasks for project 1
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);

  await Task.insertMany([
    { title: 'Design new landing page mockups', description: 'Create Figma mockups for the hero section and feature highlights', status: 'done', priority: 'high', projectId: project1._id, createdBy: admin._id, assignedTo: member1._id, dueDate: yesterday },
    { title: 'Set up design system in Tailwind', description: 'Define color tokens, typography scale, and reusable components', status: 'in-progress', priority: 'high', projectId: project1._id, createdBy: admin._id, assignedTo: member1._id, dueDate: tomorrow },
    { title: 'Implement responsive navigation', description: 'Build mobile-first hamburger menu and desktop navbar', status: 'todo', priority: 'medium', projectId: project1._id, createdBy: admin._id, assignedTo: member2._id, dueDate: nextWeek },
    { title: 'Write copy for About page', description: 'Draft team bios and company story content', status: 'todo', priority: 'low', projectId: project1._id, createdBy: admin._id, dueDate: nextWeek },
    { title: 'SEO audit and optimization', description: 'Fix meta tags, improve page speed, add structured data', status: 'todo', priority: 'medium', projectId: project1._id, createdBy: admin._id, assignedTo: member2._id },
    { title: 'Integrate contact form', status: 'in-progress', priority: 'medium', projectId: project1._id, createdBy: member2._id, assignedTo: member2._id, dueDate: yesterday },
  ]);

  await Task.insertMany([
    { title: 'Set up React Native project', description: 'Initialize project with Expo and configure navigation', status: 'done', priority: 'high', projectId: project2._id, createdBy: admin._id, assignedTo: admin._id },
    { title: 'Build authentication screens', description: 'Login, signup, and forgot password screens', status: 'in-progress', priority: 'high', projectId: project2._id, createdBy: admin._id, assignedTo: member1._id, dueDate: tomorrow },
    { title: 'Design onboarding flow', description: '3-step onboarding for new users', status: 'todo', priority: 'medium', projectId: project2._id, createdBy: admin._id, assignedTo: member1._id, dueDate: nextWeek },
  ]);

  console.log('✅ Created 9 tasks');
  console.log('\n🎉 Seed complete! Test credentials:');
  console.log('   Admin  → admin@example.com  / admin123');
  console.log('   Member → sarah@example.com  / member123');
  console.log('   Member → marcus@example.com / member123');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
