import mongoose from 'mongoose';
import { EventData } from 'web3-eth-contract';
import {
  ContractModel,
  EventModel,
  IContractSchema,
  IEventSchema,
} from '../schema';

export class Database {
  private static _instance: Database;

  private constructor() {
    const uri =
      'mongodb+srv://bubbles:KseTfjRc4rOlgQXK@bubbles-project.vus3i.mongodb.net/listenerDatabase?retryWrites=true&w=majority';
    mongoose
      .connect(uri)
      .then(() => console.log('Database connected!'))
      .catch((err) => console.log(err));
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  /**
   *@return {IContractSchema[]}
   */
  _loadDb() {
    return ContractModel.find({});
  }

  /**
   *
   * @param {string} address
   * @return {boolean}
   */
  isExistContract(address: string) {
    const contractObj = ContractModel.exists({ contractAddr: address });
    if (!contractObj) return false;
    return true;
  }

  /**
   *
   * @param {string} network
   * @param {object} jsonInterface
   * @param {string} address
   * @param {string[]} events
   * @param {number} latestBlock
   */
  insertContract({
    address,
    latestBlock,
    network,
    events,
    jsonInterface,
  }: IContractSchema) {
    new ContractModel({
      address,
      latestBlock,
      network,
      events,
      jsonInterface,
    }).save();
  }

  insertEvent({
    address,
    event,
    transactionHash,
    blockNumber,
    returnValues,
  }: EventData) {
    new EventModel({
      address,
      event,
      transactionHash,
      blockNumber,
      returnValues,
    }).save();
  }

  insertEvents(events: EventData[]) {
    if (events.length <= 0) return;
    const data: IEventSchema[] = events.map(
      ({ address, event, transactionHash, blockNumber, returnValues }) => {
        return {
          address,
          event,
          transactionHash,
          blockNumber,
          returnValues,
        };
      },
    );
    EventModel.insertMany(data)
      .then()
      .catch((err) => {
        console.log(err);
      });
  }
}

export default Database.Instance;
