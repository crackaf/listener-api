import { model, Schema } from 'mongoose';
import { IEventSchema } from '../utils/types';

const eventSchema = new Schema<IEventSchema>({
  address: {
    type: String,
    required: true,
  },
  network: {
    type: String,
    required: true,
  },
  blockNumber: {
    type: Number,
    required: true,
  },
  transactionHash: {
    type: String,
    required: true,
  },
  event: {
    type: String,
    required: true,
  },
  returnValues: {
    type: Object,
    required: true,
  },
}).index({ address: 1, network: 1, transactionHash: 1 }, { unique: true });

export const EventModel = model('Event', eventSchema);
