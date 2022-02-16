/* eslint-disable max-len */
import { AbiItem } from 'web3-utils';
import { EventData } from 'web3-eth-contract';
import { Listen } from './listen';
import { Database } from './database';
import NETWORKS from '../config/networks';
export interface IContracts {
  [key: string]: {
    address: string;
    listen: Listen;
    events: string[];
    latestBlock: number;
    network: string;
  };
}

// address->event->boolean
export interface IsListening {
  [key: string]: {
    [key: string]: boolean;
  };
}

export class Listener {
  private _db: Database;

  public contracts: IContracts = {};
  public isListening: IsListening = {};

  constructor(dbConnector: Database) {
    this._db = dbConnector;
    this._loadDb().finally(() => {
      // initiazlize the listener array
      for (const addr in this.contracts) {
        if (Object.prototype.hasOwnProperty.call(this.contracts, addr)) {
          for (const e of this.contracts[addr].events) {
            if (!(addr in this.isListening)) {
              this.isListening[addr] = {};
            }
            this.isListening[addr][e] = false;
          }
        }
      }
      // load past events then current
      this.loadPastEvents().finally(() => {
        this.listenEvents();
      });
    });
  }

  private async _loadDb() {
    const dataList = await this._db.loadDb();
    for (const {
      network,
      jsonInterface,
      address,
      events,
      latestBlock,
    } of dataList) {
      this.add(
        network as unknown as any,
        jsonInterface,
        address,
        events,
        latestBlock,
      );
    }
  }

  private _updateBlock(address: string, newBlockNumber: number) {
    if (this.contracts[address].latestBlock < newBlockNumber) {
      this.contracts[address].latestBlock = newBlockNumber;
    }
  }

  private _eventHandlerWrapper(data: EventData | EventData[]) {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        // data is array
        // get max block from it
        this._updateBlock(
          data[0].address,
          Math.max(...data.map((d) => d.blockNumber)),
        );
      }
    } else {
      this._updateBlock(data.address, data.blockNumber);
    }

    // add to db
    this._db.eventHandler(data);
  }

  private _add(
    _listen: Listen,
    _network: string,
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

    // listening to false
    if (!(_listen.address in this.isListening)) {
      this.isListening[_listen.address] = {};
    }
    for (const e of this.contracts[_listen.address].events) {
      this.isListening[_listen.address][e] = false;
    }

    // load past events for the db then current
    this.loadPastEvents(_listen.address).finally(() => {
      this.listenEvents(_listen.address);
    });
  }

  add(
    network: keyof typeof NETWORKS,
    jsonInterface: AbiItem | AbiItem[],
    address: string,
    events: string | string[] = [],
    latestBlock: number = 0,
  ) {
    // array conversion
    if (!Array.isArray(events)) {
      events = [events];
    }
    const rpc = NETWORKS[network];

    // already exsist in db?
    const inDb = this._db.isExistContract(address);
    const inLocal = address in this.contracts;

    if (inLocal && inDb) {
      return {
        success: false,
        msg: `Address ${address} already exsist in db. If you are adding events, please use addEvent.`,
      };
    }

    if (!inDb) {
      // insert in db
      this._db.insertContract({
        network,
        jsonInterface,
        address,
        events,
        latestBlock,
      });
    }
    if (!inLocal) {
      // insert in array
      this._add(
        new Listen(rpc, jsonInterface, address),
        network,
        events,
        latestBlock,
      );
    }

    return {
      success: true,
      msg: `Added contract ${address} with events.`,
    };
  }

  addEvent(address: string, event: string) {
    if (!(address in this.contracts)) {
      if (!this.contracts[address].events.includes(event)) {
        // add to array
        this.contracts[address].events.push(event);
        // update to db
        this._db.updateContract({
          address: this.contracts[address].address,
          events: this.contracts[address].events,
          latestBlock: this.contracts[address].latestBlock,
          network: this.contracts[address].network,
          jsonInterface: this.contracts[address].listen.jsonInterface,
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

  async loadPastEvents(address?: string) {
    if (address) {
      // for sepcific contract and for every event
      if (Object.prototype.hasOwnProperty.call(this.contracts, address)) {
        // for every event
        for (const e of this.contracts[address].events) {
          this.contracts[address].listen.loadPastEvents(
            e,
            this._eventHandlerWrapper,
            {
              fromBlock: this.contracts[address].latestBlock,
            },
          );
        }
        return {
          success: true,
          msg: `Listening to ${address} for every event.`,
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
        // for every event
        for (const e of this.contracts[addr].events) {
          this.contracts[addr].listen.loadPastEvents(
            e,
            this._eventHandlerWrapper,
            {
              fromBlock: this.contracts[addr].latestBlock,
            },
          );
        }
      }
    }
    return {
      success: true,
      msg: `Listening to every address for every event.`,
    };
  }

  async listenEvents(address?: string) {
    if (address) {
      // for sepcific contract and for every event
      if (Object.prototype.hasOwnProperty.call(this.contracts, address)) {
        // for every event
        for (const e of this.contracts[address].events) {
          if (!this.isListening[address][e]) {
            // not listening to this event
            this.contracts[address].listen.listen(
              e as unknown as any,
              this._eventHandlerWrapper,
            );
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
        // for every event
        for (const e of this.contracts[addr].events) {
          if (!this.isListening[address][e]) {
            // not listening to this event
            this.contracts[address].listen.listen(
              e as unknown as any,
              this._eventHandlerWrapper,
            );
          }
        }
      }
    }
    return {
      success: true,
      msg: `Listening to every address for every event.`,
    };
  }
}
