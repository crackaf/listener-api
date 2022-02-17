import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { ContractModel, EventModel } from '../schema';
import { IContractSchema, IEventSchema } from '../utils/types';
import { IDatabase } from '../utils/types';

export class Database implements IDatabase {
  private static _instance: Database;

  private constructor() {
    const uri =
      'mongodb+srv://bubbles:KseTfjRc4rOlgQXK@bubbles-project.vus3i.mongodb.net/listenerDatabase?retryWrites=true&w=majority';
    mongoose
      .connect(uri)
      .then(() => console.log('Database connected!'))
      .catch((err) => console.error(err));
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  /**
   * @return {IContractSchema[]}
   */
  getContracts() {
    return ContractModel.find({}).exec();
  }

  /**
   *
   * @param {string} address
   * @return {boolean}
   */
  async isExistContract(address: string): Promise<boolean> {
    const contractObj = await ContractModel.exists({
      address: { $regex: new RegExp(address, 'i') },
    });
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
        address: { $regex: new RegExp(address, 'i') },
        network: { $regex: new RegExp(network, 'i') },
      },
      (err, result) => {
        if (err) {
          console.info(`Encountered error while inserting contract ${address}`);
          Sentry.addBreadcrumb({
            message: `Error inserting contract.`,
            data: { address: address, network: network },
          });
        }
        if (!result) {
          new ContractModel({
            address,
            latestBlock,
            network,
            events,
            jsonInterface,
          }).save();
          console.info(`Added contract ${address}`);
          Sentry.addBreadcrumb({
            message: `Contract added.`,
            data: { address: address, network: network },
          });
        } else {
          console.info(`Could not add contract ${address}`);
          Sentry.addBreadcrumb({
            message: `Contract not added.`,
            data: { address: address, network: network },
          });
        }
      },
    );
  }

  /**
   *
   * @param {IEventSchema} eventObject
   */
  insertEvent({
    address,
    event,
    transactionHash,
    blockNumber,
    returnValues,
  }: IEventSchema) {
    new EventModel({
      address,
      event,
      transactionHash,
      blockNumber,
      returnValues,
    })
      .save()
      .then((result: IEventSchema) => {
        if (!result) {
          console.info(`Added event ${address}`);
          Sentry.addBreadcrumb({
            message: `Event added.`,
            data: { address: address, event: event },
          });
        } else {
          console.info(`Could not add event ${address}`);
          Sentry.addBreadcrumb({
            message: `Event not added.`,
            data: { address: address, event: event },
          });
        }
      })
      .catch((err) => {
        console.info(`Encountered error while inserting event ${address}`);
        Sentry.addBreadcrumb({
          message: `Error inserting event.`,
          data: { address: address, event: event },
        });
      });
  }

  /**
   *
   * @param {IEventSchema[]} events
   * @return {void}
   */
  insertEvents(events: IEventSchema[]) {
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
      .then((result) => {
        if (!result) {
          console.info(`Added events ${data.length}`);
          Sentry.addBreadcrumb({
            message: `Events added.`,
          });
        } else {
          console.info(`Could not add event ${data.length}`);
          Sentry.addBreadcrumb({
            message: `Events not added.`,
          });
        }
      })
      .catch((err) => {
        console.info(`Encountered error while inserting events ${data.length}`);
        Sentry.addBreadcrumb({
          message: `Error inserting events.`,
        });
      });
  }

  /**
   * @param {string} contractAddr
   * @param {IContractSchema} contractObj
   * @return {boolean}
   */
  async updateContract({
    address,
    latestBlock,
    network,
    events,
    jsonInterface,
  }: Partial<IContractSchema>) {
    const filter = {
      address: { $regex: new RegExp(address, 'i') },
      network: { $regex: new RegExp(network, 'i') },
    };
    const update = {
      latestBlock: latestBlock,
      events: events,
      jsonInterface: jsonInterface,
    };
    ContractModel.findOneAndUpdate(filter, update, {
      new: true,
    }).then((doc) => {
      if (!doc) {
        console.info(`Invalid address. Not updated ${address}`);
        Sentry.addBreadcrumb({
          message: `Contract not updated.`,
          data: { address: address, network: network },
        });
      } else {
        console.info(`Contract updated ${address}`);
        Sentry.addBreadcrumb({
          message: `Contract updated.`,
          data: { address: address, network: network },
        });
      }
    });
  }

  /**
   *
   * @param {IEventSchema | IEventSchema[]} data
   */
  eventHandler(data: IEventSchema | IEventSchema[]) {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        const maxBlockNumber = Math.max(...data.map((d) => d.blockNumber));
        const latestBlockData = data.find(
          (dataItem: IEventSchema) => dataItem.blockNumber == maxBlockNumber,
        );
        this.insertEvents(data);
        this.updateContract({
          address: latestBlockData.address,
          latestBlock: latestBlockData.blockNumber,
        });
      }
    } else {
      this.updateContract({
        address: data.address,
        latestBlock: data.blockNumber,
      });
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
    return ContractModel.find(
      {
        address,
        latestBlock,
        network,
        events,
        jsonInterface,
      },
      (err, result) => {
        if (err) {
          console.info(`Encountered error while getting contract ${address}`);
          Sentry.addBreadcrumb({
            message: `Error getting contract.`,
            data: { address: address, network: network },
          });
        }
        if (!result) {
          console.info(`Contract found ${address}`);
          Sentry.addBreadcrumb({
            message: `Contract found.`,
            data: { address: address, network: network },
          });
        } else {
          console.info(`Could not find contract ${address}`);
          Sentry.addBreadcrumb({
            message: `Contract not found.`,
            data: { address: address, network: network },
          });
        }
      },
    ).exec();
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
    return EventModel.find(
      {
        address,
        blockNumber,
        transactionHash,
        event,
        returnValues,
      },
      (err, result) => {
        if (err) {
          console.info(`Encountered error while getting event ${address}`);
          Sentry.addBreadcrumb({
            message: `Error getting event.`,
            data: { address: address, event: event },
          });
        }
        if (!result) {
          console.info(`Event found ${address}`);
          Sentry.addBreadcrumb({
            message: `Event found.`,
            data: { address: address, event: event },
          });
        } else {
          console.info(`Could not find event ${address}`);
          Sentry.addBreadcrumb({
            message: `Event not found.`,
            data: { address: address, network: event },
          });
        }
      },
    ).exec();
  }
}

export default Database.Instance;
