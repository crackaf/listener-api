import { model, Schema } from 'mongoose';
import { IEventSchema } from '../utils/types';

const eventSchema = new Schema<IEventSchema>({
  address: {
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
});

export const EventModel = model('Event', eventSchema);
