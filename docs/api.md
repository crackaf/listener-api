# Listener API


## Table of Contents

Listener API works by listening to contracts in database and adds their emitted events into a different collection of the same database. It also automatically updates latest block for a contract. If tokenId is present in any event of a contract, it is inserted into the token collection. Incase, same token is found when inserting, it will update it according to the new data (to handle change of ownership of a NFT).

| Title           |
----------------------------------------- |
| [MongoDB Collections](#mongodb-collections)          
| [Contracts](#contracts)           
| [Events](#events)     
| [Tokens](#tokens)         
| [Fetch Data](#fetch-data)           
| [Queries](#queries)
| [Insert, Delete and Update](#insert-delete-and-update)


### MongoDB Collections

All of the data listened by this API is stored in mongoDB under the following collection names:

- contracts
- events
- tokens

Note: The entries mentioned in the next part are also the key names used in mongoDB.

### Contracts

Contracts collection contains the following entries:

- address -> contract address
- latestBlock -> latest block the api has checked
- network -> Network nodes that the API is listening from. The networks are defined in src/config/networks.ts
- events -> List of string events that the API will catch.
- jsonInterface -> This is optional. If json interface is not provided then the standard json interface will be used.

This collection has a restriction on address and network i.e., an entry cannot have same address and network.

### Events

Events collection contains the following entries:

- address -> contract address
- network -> Network nodes that the API is listening from. The networks are defined in src/config/networks.ts
- blockNumber -> block number that emitted this event
- transactionHash -> transaction hash of the block
- event -> name of emitted event.
- returnValues -> This is a json object that contains values emitted from this event.

This collection has a restriction on address, network and transactionHash i.e., an entry cannot have same address, network and transactionHash.

### Tokens

Tokens collection contains the following entries:

- address -> contract address
- network -> Network nodes that the API is listening from. The networks are defined in src/config/networks.ts
- tokenId -> tokenId of NFT on that address and network
- transactionHash -> transaction hash of the block
- data -> This is a json object that contains values of the token (owner etc)

This collection has a restriction on address, network and tokenId i.e., an entry cannot have same address, network and tokenId.

## Fetch Data

All three collections have their GET API calls.

### GET Contracts

Contracts collection has three APIs defined to fetch data from contracts.

- Get all contracts <br/>
  API call: `/contracts` <br/>
  Retruns: An array of json objects (contracts)

- Get all contracts against an address <br/>
  API call: `/contracts/address` <br/>
  Returns: An array of json objects (contracts)

- Get a contract against an address and network <br/>
  API call: `/contracts/address/network?(Queries)` <br/>
  Returns: An array of single json object

  [See queries for more info](#queries)<br/>

### GET Events

Events collection has two APIs defined to fetch data from events.

- Get all events <br/>
  API call: `/events` <br/>
  Retruns: An array of json objects (events)

- Get all events against an address <br/>
  API call: `/events/address`
  Returns: An array of json objects (events)

  [See queries for more info](#queries)<br/>

### GET Tokens

Tokens collection has five APIs defined to fetch data from tokens.

- Get all tokens.<br/>
  API call: `/tokens` <br/>
  Retruns: An array of json objects (tokens)

- Get all tokens against an address.<br/>
  API call: `/tokens/address/?(Queries)`
  Returns: An array of json objects (tokens)

- Get all tokens against an address and network.<br/>
  API call: `/tokens/address/network?(Queries)` <br/>
  Returns: An array of json objects (tokens)

- Get all tokens against an address that have a specific tokenId.<br/>
API call: `/tokens/address/tokenId?(Queries)` <br/>
Returns: An array of json objects (tokens)

- Get a single token against an address and network that has a specific tokenId. <br/>
API call: `/tokens/address/network/tokenId?(Queries)` <br/>
Returns: An array of single json object (token)

 [See queries for more info](#queries)<br/>


## Queries
Queries: Queries will help to filter returned data according to need. Multiple queries can be used with eachother.
Three quries have been added into the API calls: [select, sort, range]

  - select: Selects values from results <br/>
    <pre>
    format: select=data.to tokenId[space][more keys] 
    </pre>
  - sort: Sort values according to the given key 
    Note: use + for ascending and - for descending sort
    <br/>
    <pre>
    format: sort=+tokenId,-address[comma][+-][more keys] 
    </pre>
  - range: Gives range of returned data based on the given starting and ending value.
    <pre>
    format: range=0-100
    </pre>
  Example: <br/>

  <pre>
  /tokens/[some_address]/?select=tokenId data.to&sort=+tokenId&range=100-150
  </pre>

## Insert, Delete and Update

Only contracts collection can be directly inserted, updated and deleted.

### Insert Contract
This is an important api that directly inserts a contract into mongoDB.<br/>

Note: Make sure that the correct contract details are entered else the listener will throw an error in logs regarding that contract. <br/>
Usage:
```
API call: /contracts

Request Body = {
  network: (Some network from src/config/networls.ts),
  address: (Contract address),
  latestBlock: (Block number to listen from),
  events: (String array of events to listen),
  jsonInterface: (jsonInterface of contract (optional))
}
```

### Update and Delete Contract
Contract can be updated or deleted by passing object id.<br/>

Note: Contract address and network cannot be directly updated. To update contract first fetch the Object id of that contract using api call by passing address and network. Object id can be extracted from the returned json object.

Usage for contract update:
```
API call: /contracts/id
Method: PUT
Request Body = {
  network: (Some network from src/config/networls.ts),
  address: (Contract address),
  latestBlock: (Block number to listen from),
  events: (String array of events to listen),
  jsonInterface: (jsonInterface of contract (optional))
}
```
Contract deletion api is same except the method and request body. Same process will be followed to delete a contract. First get its object id and then delete the contract.
Usage for contract delete:

```
API call: /contract/id
Method: DELETE
```