import { model, Schema } from 'mongoose';

export interface IEvents {
  address: string;
  blockNumber: number;
  transactionHash: string;
  event: string;
  returnValues: {
    [key: string]: any;
  };
}

const eventSchema = new Schema<IEvents>({
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

export const EventsModel = model('Events', eventSchema);
