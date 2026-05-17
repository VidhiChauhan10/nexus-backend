import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectMember {
  user: mongoose.Types.ObjectId;
  role: 'admin' | 'member';
}

export interface IProject extends Document {
  title: string;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  members: IProjectMember[];
  createdAt: Date;
  updatedAt: Date;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
  },
  { _id: false }
);

const projectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [projectMemberSchema],
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', projectSchema);
