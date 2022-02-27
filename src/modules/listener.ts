import * as Sentry from '@sentry/node';
import { AbiItem } from 'web3-utils';
import { Listen } from './listen';
import NETWORKS from '../config/networks';
import standardAbi from '../config/abi/standardInterface.json';
import {
  ApiEventData,
  IDatabase,
  // IListen,
  IReturn,
  ITokenSchema,
} from '../utils/types';
import { eventHandler, methodHandler } from './handlers';
interface IContracts {
  [key: string]: {
    address: string;
    listen: Listen;
    events: string[];
    latestBlock: number;
    network: keyof typeof NETWORKS;
  };
}

// address->event->boolean
export interface IsListening {
  [key: string]: {
    [key: string]: boolean;
  };
}

/**
 * Listener class to handle multiple contracts and multiple events
 */
export class Listener {
  // database connector
  private _db: IDatabase;

  // contracts mapping
  public contracts: IContracts = {};

  // address->event->boolean
  public isListening: IsListening = {};

  /**
   * Contructor to initialize Listener.
   * On initialization the database will be loaded
   * and all the events will be on listen.
   * @param {IDatabase} dbConnector Database connector to update and fetch data.
   * It must include functions named `loadDb`,`isExistContract`,`insertContract`
   * ,`insertEvent` and `eventHandler`.
   * Furthermore the database can be of any type. It depends on your db, we are
   * only using the above mentioned function that should be implemented.
   */
  constructor(dbConnector: IDatabase) {
    Sentry.addBreadcrumb({
      message: 'Contructor Called',
    });
    this._db = dbConnector;
    this._loadDb().finally(() => {
      Sentry.addBreadcrumb({
        message: 'Db loaded',
        data: {
          contracts: this.contracts,
          listeners: this.isListening,
        },
      });
      this._syncFromDb();
    });
  }

  /**
   * This function will update the local db with timeinterval
   */
  private async _syncFromDb() {
    // setInterval(() => {
    //   this._loadDb();
    // }, 100 * 1000); // every 100 seconds
  }

  /**
   * This function will load the database and
   */
  async _loadDb() {
    Sentry.addBreadcrumb({
      message: '_loadDb Called',
    });
    const dataList = await this._db.getContracts();
    Sentry.addBreadcrumb({
      message: 'Contract data from db',
      data: { list: dataList },
    });
    for (const {
      network,
      jsonInterface,
      address,
      events,
      latestBlock,
    } of dataList) {
      if (!(address in this.contracts)) {
        const result = this.add(
          network as unknown as any,
          jsonInterface,
          address,
          events,
          latestBlock,
        );
        Sentry.addBreadcrumb({
          message: 'loadDb->Add',
          data: {
            result: result,
            ...{
              network,
              jsonInterface,
              address,
              events,
              latestBlock,
            },
          },
        });
      }
    }
  }

  /**
   * Updates the latest block number.
   * First checks if the new block number is greater it will update
   * @param {string} address address of contract.
   * @param {number} newBlockNumber Block number which you want to update.
   */
  private _updateBlock(address: string, newBlockNumber: number) {
    if (this.contracts[address].latestBlock < newBlockNumber) {
      Sentry.addBreadcrumb({
        message: 'Update latest block',
        data: {
          address: address,
          oldNumber: this.contracts[address].latestBlock,
          newNumber: newBlockNumber,
        },
      });
      this.contracts[address].latestBlock = newBlockNumber;
    }
  }

  /**
   * call the functions for the event data
   * @param {ApiEventData} data event data
   */
  private _functionCalls(data: ApiEventData) {
    // for tokenId
    if (!!data.returnValues.tokenId) {
      try {
        this.contracts[data.address].listen.method(
          'tokenURI',
          (methodData: { tokenURI: string }) => {
            const params = {
              address: data.address,
              network: this.contracts[data.address].network,
              tokenId: data.returnValues.tokenId,
              blockNumber: data.blockNumber,
            };
            const { returnValues } = data;
            this._methodHandlerWrapper({
              ...params,
              data: { ...returnValues, ...methodData },
            });
          },
          [data.returnValues.tokenId],
        );
      } catch (err) {
        const params = {
          address: data.address,
          network: this.contracts[data.address].network,
          tokenId: data.returnValues.tokenId,
          blockNumber: data.blockNumber,
        };
        const { returnValues } = data;
        this._methodHandlerWrapper({ ...params, data: { ...returnValues } });
      }
    }
  }

  /**
   * Wrapper for the database event handler
   * @param {ApiEventData | ApiEventData[]} data
   * Event data which you want to handle
   */
  private _eventHandlerWrapper(data: ApiEventData | ApiEventData[]) {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        // data is array
        // get max block from it
        this._updateBlock(
          data[0].address,
          Math.max(
            ...data.map((d) => {
              return d.blockNumber ?? 0;
            }),
          ),
        );

        // call the required functions
        // only calling the token URI
        for (const d of data) {
          this._functionCalls(d);
        }
      }
    } else {
      this._updateBlock(data.address, data.blockNumber);

      // call the required functions
      this._functionCalls(data);
    }

    // add to db
    eventHandler(data);
  }

  /**
   *
   * @param {ITokeSchema} data data
   */
  private _methodHandlerWrapper(data: ITokenSchema) {
    methodHandler(data);
  }

  /**
   * Updating isListening boolean
   * @param {string} address Address of contract
   * @param {string} event Event name
   * @param {boolean} value Value which you want to insert in isListening
   */
  private _updateListening(address: string, event: string, value: boolean) {
    if (address in this.isListening) {
      this.isListening[address][event] = value;
    } else {
      this.isListening[address] = {};
      this.isListening[address][event] = value;
    }
  }

  /**
   * Get value of isListening object
   * @param {string} address Address of contract
   * @param {string} event Event name
   * @return {boolean} Value agaist address->event
   */
  private _getListening(address: string, event: string): boolean {
    if (address in this.isListening) {
      if (event in this.isListening[address]) {
        return this.isListening[address][event];
      }
    }
    return false;
  }

  /**
   * For adding the Listen to runtime storage
   * @param {Listen} _listen Listen object
   * @param {string} _network Network name
   * @param {string[]} _events Events names
   * @param {number} _fromBlock Latest block number
   */
  private _add(
    _listen: Listen,
    _network: keyof typeof NETWORKS,
    _events: string[],
    _fromBlock: number,
  ) {
    this.contracts[_listen.address] = {
      address: _listen.address,
      listen: _listen,
      events: _events,
      latestBlock: _fromBlock,
      network: _network,
    };

    Sentry.addBreadcrumb({
      message: 'Runtime storage add',
      data: {
        address: _listen.address,
        listen: _listen,
        events: _events,
        latestBlock: _fromBlock,
        network: _network,
      },
    });

    // listening to false
    for (const e of this.contracts[_listen.address].events) {
      this._updateListening(_listen.address, e, false);
    }

    // load past events for the db then current
    this.loadPastEvents(_listen.address).finally(() => {
      this.listenEvents(_listen.address);
    });
  }

  /**
   * Add the new contract to runtime storage and Database
   * @param {string} network  Network name
   * @param {AbiItem | AbiItem[]} jsonInterface Abi of contract
   * @param {string} address Address of contract
   * @param {string[]} events Events names
   * @param {number} latestBlock Latest block number
   * @return {IReturn} sccuess with msg
   */
  async add(
    network: keyof typeof NETWORKS,
    jsonInterface: AbiItem | AbiItem[],
    address: string,
    events: string | string[] = [],
    latestBlock: number = 0,
  ): Promise<IReturn> {
    let _events = events;
    // array conversion
    if (!Array.isArray(_events)) {
      _events = [_events];
    }

    if (!!!jsonInterface) {
      // eslint-disable-next-line no-param-reassign
      jsonInterface = standardAbi as AbiItem[];
    }

    // rpc
    const rpc = NETWORKS[network];

    // already exist in db?
    const inDb = await this._db.isExistContract(address, network);
    // already exist in runtime storage?
    const inLocal = address in this.contracts;

    if (inLocal && inDb) {
      return {
        success: false,
        msg: `Address ${address} already exsist in db. 
        If you are adding events, please use addEvent.`,
      };
    }

    if (!inLocal) {
      // insert in array
      try {
        this._add(
          new Listen(rpc, address, network, jsonInterface),
          network,
          _events,
          latestBlock,
        );
      } catch (error) {
        return {
          success: false,
          msg: `Error while adding the contract`,
        };
      }
    }

    if (!inDb) {
      // insert in db
      this._db.insertContract({
        network,
        jsonInterface,
        address,
        events: _events,
        latestBlock,
      });
    }

    return {
      success: true,
      msg: `Added contract ${address} with events ${_events}.`,
    };
  }

  /**
   * Add event name to the runtime storage and starts listening to this event
   * @param {string} address Contract address
   * @param {string} network Network of Contract
   * @param {string} event Event name of contract
   * @return {IReturn} sccuess with msg
   */
  addEvent(
    address: string,
    network: keyof typeof NETWORKS,
    event: string,
  ): IReturn {
    if (
      address in this.contracts &&
      this.contracts[address].network === network
    ) {
      if (!this.contracts[address].events.includes(event)) {
        // add to array
        this.contracts[address].events.push(event);
        // update to db
        this._db.updateContract({
          address: this.contracts[address].address,
          network: this.contracts[address].network,
          events: this.contracts[address].events,
        });
        // listen to past events and then listen
        this.loadPastEvents(address).finally(() => {
          this.listenEvents(address);
        });
        return {
          success: true,
          msg: `Event ${event} added in address ${address}!`,
        };
      }
      return {
        success: false,
        msg: `Event ${event} already in address ${address}!`,
      };
    }
    return {
      success: false,
      msg: `Address ${address} does not exist in db!`,
    };
  }

  /**
   * Add event name to the runtime storage and starts listening to this event
   * @param {string} address Contract address
   * @param {string} network Network of Contract
   * @param {string[]} events Event name of contract
   * @return {IReturn} sccuess with msg
   */
  addEvents(
    address: string,
    network: keyof typeof NETWORKS,
    events: string[],
  ): IReturn {
    for (const event of events) {
      this.addEvent(address, network, event);
    }
    return {
      success: true,
      msg: `Event ${events} added in address ${address}!`,
    };
  }

  /**
   * @async Listen to all the past events
   * @param {string} address? Optional contract address.
   * If address is given it will only listen to this contract's events.
   * @return {Promise<IReturn>} promise of success with msg
   */
  async loadPastEvents(address?: string): Promise<IReturn> {
    if (address) {
      // for sepcific contract and for every event
      if (Object.prototype.hasOwnProperty.call(this.contracts, address)) {
        console.info(`Listening to Past Events of ${address}`);
        // for every event
        for (const e of this.contracts[address].events) {
          await this.contracts[address].listen.loadPastEvents(
            e, // event name
            (data: ApiEventData | ApiEventData[]) => {
              this._eventHandlerWrapper(data);
            }, // callback
            {
              fromBlock: this.contracts[address].latestBlock,
            },
          );
        }
        return {
          success: true,
          msg: `Loading past events for ${address} for every event.`,
        };
      }
      // doesn't exist
      return {
        success: false,
        msg: `Address ${address} does not exist in db!`,
      };
    }
    // for every contract
    for (const addr in this.contracts) {
      if (Object.prototype.hasOwnProperty.call(this.contracts, addr)) {
        console.info(`Listening to Past Events of ${address}`);
        // for every event
        for (const e of this.contracts[addr].events) {
          await this.contracts[addr].listen.loadPastEvents(
            e,
            (data: ApiEventData | ApiEventData[]) => {
              return this._eventHandlerWrapper(data);
            },
            {
              fromBlock: this.contracts[addr].latestBlock,
            },
          );
        }
      }
    }
    return {
      success: true,
      msg: `Loading past events for every address(${this.contracts.length})
            for every event.`,
    };
  }

  /**
   * @async Listen to current events
   * @param {string} address? Optional contract address.
   * If address is given it will only listen to this contract's events.
   * @return {Promise<IReturn>} promise of success with msg
   */
  async listenEvents(address?: string): Promise<IReturn> {
    if (address) {
      // for sepcific contract and for every event
      if (Object.prototype.hasOwnProperty.call(this.contracts, address)) {
        console.info(`Listening to Future Events of ${address}`);
        // for every event
        for (const e of this.contracts[address].events) {
          if (
            address in this.isListening &&
            e in this.isListening[address] &&
            !this.isListening[address][e]
          ) {
            // not listening to this event
            this.contracts[address].listen.listen(
              e as unknown as any,
              (data: ApiEventData | ApiEventData[]) => {
                return this._eventHandlerWrapper(data);
              },
            );
            this._updateListening(address, e, true);
          }
        }
        return {
          success: true,
          msg: `Listening to ${address} for every event.`,
        };
      }
      return {
        success: false,
        msg: `Address ${address} does not exist in db!`,
      };
    }
    // for every contract
    for (const addr in this.contracts) {
      if (Object.prototype.hasOwnProperty.call(this.contracts, addr)) {
        console.info(`Listening to Future Events of ${address}`);
        // for every event
        for (const e of this.contracts[addr].events) {
          if (
            addr in this.isListening &&
            e in this.isListening[addr] &&
            !this.isListening[addr][e]
          ) {
            // not listening to this event
            this.contracts[address].listen.listen(
              e as unknown as any,
              (data: ApiEventData | ApiEventData[]) => {
                return this._eventHandlerWrapper(data);
              },
            );
            this._updateListening(addr, e, true);
          }
        }
      }
    }
    return {
      success: true,
      msg: `Listening to every address(${this.contracts.length})
            for every event.`,
    };
  }
}
