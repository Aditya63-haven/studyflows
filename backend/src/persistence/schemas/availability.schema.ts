import { model, models, Model, Schema } from 'mongoose';

export interface AvailabilityWindowRecord {
  _id: string;
  startMinutes: number;
  endMinutes: number;
}

export interface DayAvailabilityRecord {
  weekday: number;
  mode: string;
  budgetMinutes: number;
  available: boolean;
  windows: AvailabilityWindowRecord[];
}

export interface AvailabilityDocument {
  _id: string;
  owner: string;
  days: DayAvailabilityRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const windowSchema = new Schema<AvailabilityWindowRecord>(
  {
    _id: { type: String, required: true },
    startMinutes: { type: Number, required: true },
    endMinutes: { type: Number, required: true },
  },
  { _id: false },
);

const daySchema = new Schema<DayAvailabilityRecord>(
  {
    weekday: { type: Number, required: true, min: 0, max: 6 },
    mode: { type: String, required: true, enum: ['budget', 'budget-windows'] },
    budgetMinutes: { type: Number, required: true, min: 0, max: 1440 },
    available: { type: Boolean, default: true },
    windows: { type: [windowSchema], default: [] },
  },
  { _id: false },
);

const availabilitySchema = new Schema<AvailabilityDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    days: { type: [daySchema], default: [] },
  },
  { timestamps: true, versionKey: false, collection: 'availabilities' },
);

availabilitySchema.index({ owner: 1 });

export const AvailabilityModel: Model<AvailabilityDocument> =
  (models.Availability as Model<AvailabilityDocument>) ||
  model<AvailabilityDocument>('Availability', availabilitySchema);
