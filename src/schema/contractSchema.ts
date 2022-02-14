import {model, Schema} from 'mongoose';

export interface IContract {
  contractAddr: string;
  latestBlock: number;
}

const contractSchema = new Schema<IContract>({
  contractAddr: {
    type: String,
    required: true,
  },
  latestBlock: {
    type: Number,
    required: true,
  },
});

export default model('Contract', contractSchema);
