import { AbiItem } from 'web3-utils';
import { EventData } from 'web3-eth-contract';
import { Listen } from './listen';

export interface IEvent {
  event: string;
  eventHandler: (data: EventData | EventData[]) => void;
}

export interface IContracts {
  [key: string]: {
    address: string;
    listen: Listen;
    events: IEvent[];
    fromBlock: number;
  };
}

export class Listener {
  public contracts: IContracts;

  constructor() {}

  _add(_listen: Listen, _events: IEvent[], _fromBlock: number) {
    this.contracts[_listen.address] = {
      address: _listen.address,
      listen: _listen,
      events: _events,
      fromBlock: _fromBlock,
    };
  }

  add(
    rpc: string,
    jsonInterface: AbiItem | AbiItem[],
    address: string,
    events: IEvent | IEvent[],
    fromBlock: number = 0,
  ) {
    if (Array.isArray(events)) {
      this._add(new Listen(rpc, jsonInterface, address), events, fromBlock);
    } else {
      this._add(new Listen(rpc, jsonInterface, address), [events], fromBlock);
    }
  }

  loadPastEvents() {
    // for every contract
    for (const addr in this.contracts) {
      if (Object.prototype.hasOwnProperty.call(this.contracts, addr)) {
        // for every event
        for (const e of this.contracts[addr].events) {
          this.contracts[addr].listen.loadPastEvents(
            e.event,
            {
              fromBlock: this.contracts[addr].fromBlock,
            },
            e.eventHandler,
          );
        }
      }
    }
  }
}
