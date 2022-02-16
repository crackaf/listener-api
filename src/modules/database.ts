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
  loadDb() {
    return ContractModel.find({}).exec();
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
    ContractModel.findOne(
      {
        address: address,
      },
      (err, result) => {
        if (err) {
          console.log(err);
        }
        if (!result) {
          new ContractModel({
            address,
            latestBlock,
            network,
            events,
            jsonInterface,
          }).save();
        }
      },
    );
  }

  /**
   *
   * @param {EventData} eventObject
   */
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

  /**
   *
   * @param {EventData[]} events
   * @return {void}
   */
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

  /**
   *
   * @param {IContractSchema} contractObj
   */
  updateContract({
    address,
    latestBlock,
    network,
    events,
    jsonInterface,
  }: IContractSchema) {
    const filter = { address: address };
    const update = {
      address: address,
      latestBlock: latestBlock,
      network: network,
      events: events,
      jsonInterface: jsonInterface,
    };
    ContractModel.findOneAndUpdate(filter, update);
  }

  /**
   *
   * @param {EventData | EventData[]} data
   */
  eventHandler(data: EventData | EventData[]) {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        const maxBlockNumber = Math.max(...data.map((d) => d.blockNumber));
        const latestBlockData = data.find(
          (dataItem: EventData) => dataItem.blockNumber == maxBlockNumber,
        );
        EventModel.findOne(
          {
            blockNumber: { $gte: maxBlockNumber },
            address: latestBlockData.address,
          },
          (err, result) => {
            if (err) {
              console.log(err);
            }
            if (!result) {
              this.insertEvent(latestBlockData);
            }
          },
        );
      }
    } else {
      this.insertEvent(data);
    }
  }

  /**
   *
   * @param {IContractSchema} contractObj
   * @return {IContractSchema}
   */
  fetchContract({
    address,
    latestBlock,
    network,
    events,
    jsonInterface,
  }: Partial<IContractSchema>) {
    return ContractModel.find({
      address,
      latestBlock,
      network,
      events,
      jsonInterface,
    }).exec();
  }

  /**
   *
   * @param {IEventSchema} eventObj
   * @return {IEventSchema}
   */
  fetchEvent({
    address,
    blockNumber,
    transactionHash,
    event,
    returnValues,
  }: Partial<IEventSchema>) {
    return EventModel.find({
      address,
      blockNumber,
      transactionHash,
      event,
      returnValues,
    }).exec();
  }
}

export default Database.Instance;
