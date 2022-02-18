import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { ContractModel, EventModel } from '../schema';
import { IContractSchema, IEventSchema } from '../utils/types';
import { IDatabase } from '../utils/types';
import { Console } from '@sentry/node/dist/integrations';

/**
 * Database management class
 */
export class Database implements IDatabase {
  private static _instance: Database;

  /**
   * Create database connection
   */
  private constructor() {
    const uri =
      'mongodb+srv://bubbles:KseTfjRc4rOlgQXK@bubbles-project.vus3i.mongodb.net/listenerDatabase?retryWrites=true&w=majority';
    mongoose
      .connect(uri)
      .then(() => console.info('Database connected!'))
      .catch((err) => console.error(err));
  }

  /**
   * Return or create database instance
   */
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
    new ContractModel({
      address,
      latestBlock,
      network,
      events,
      jsonInterface,
    })
      .save()
      .then((result) => {
        if (result) {
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
      })
      .catch((err) => {
        console.info(`Encountered error while inserting contract ${address}`);
        Sentry.addBreadcrumb({
          message: `Error inserting contract.`,
          data: { error: err, address: address, network: network },
        });
      });
  }

  /**
   *
   * @param {IEventSchema} eventObject
   */
  insertEvent({
    address,
    event,
    rpc,
    transactionHash,
    blockNumber,
    returnValues,
  }: IEventSchema) {
    new EventModel({
      address,
      rpc,
      event,
      transactionHash,
      blockNumber,
      returnValues,
    })
      .save()
      .then((result: IEventSchema) => {
        if (result) {
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
          data: { error: err, address: address, event: event },
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
      ({ address, rpc, event, transactionHash, blockNumber, returnValues }) => {
        return {
          address,
          rpc,
          event,
          transactionHash,
          blockNumber,
          returnValues,
        };
      },
    );
    EventModel.insertMany(data)
      .then((result) => {
        if (result) {
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
          data: {
            error: err,
          },
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
    })
      .then((doc) => {
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
      })
      .catch((err) => {
        console.info(`Encountered error while updating contract ${address}`);
        Sentry.addBreadcrumb({
          message: `Error updating contract.`,
          data: {
            error: err,
          },
        });
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
   * @param {IContractSchema} data
   * @return {IContractSchema}
   */
  async fetchContract(data: Partial<IContractSchema>) {
    let query = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && !!data[key]) {
        try {
          query = {
            ...query,
            [key]: JSON.parse(data[key]),
          };
        } catch {
          query = {
            ...query,
            [key]: data[key],
          };
        }
      }
    }
    if (!!query['events']) {
      query['events'] = { $in: query['events'] };
    }
    return await ContractModel.find(query);
  }

  /**
   *
   * @param {IEventSchema} data
   * @return {IEventSchema}
   */
  async fetchEvent(data: Partial<IEventSchema>) {
    let query = {};
    let returnValues = {};
    const temp: IEventSchema = {
      address: '',
      rpc: '',
      blockNumber: 0,
      transactionHash: '',
      event: '',
      returnValues: {},
    };
    // EventModel.mapReduce
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && !!data[key]) {
        if (Object.keys(temp).includes(key)) {
          try {
            query = {
              ...query,
              [key]: JSON.parse(data[key]),
            };
          } catch {
            query = {
              ...query,
              [key]: data[key],
            };
          }
        } else {
          try {
            returnValues = {
              ...returnValues,
              [key]: JSON.parse(data[key]),
            };
          } catch {
            returnValues = {
              ...returnValues,
              [key]: data[key],
            };
          }
        }
      }
    }
    if (returnValues && Object.keys(returnValues).length !== 0) {
      query['returnValues'] = returnValues;
    }
    console.info(query);
    return await EventModel.find(query);
  }
}

export default Database.Instance;
