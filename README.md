# mt940-ts

A Typescript library for parsing [MT940](https://www2.swift.com/knowledgecentre/publications/us9m_20200724/2.0?topic=mt940.htm) messages. It takes as an input text representing a set of MT940 statements and produces an array of statements as output. 

# Installation

TDB

# Usage

The module exports an `mt940Parser` method that takes a string as an agurment and returns an array of statements representing each of the MT940 messages present in the input.

## Example

```typescript
import { readFileSync } from "fs";
import { mt940Parser } from "mt940-ts";

const input = readFileSync("./mt94x.txt").toString();
const parsed = mt940Parser(input);

console.log("Number of statements: ", parsed.length);
for (const statement of parsed) {
  console.log(`==== Showing records for account: ${statement.accountIdentification} ====`);
  statement.records.forEach((record) => {
    console.log(record);
  });
}
```

# Creating a custom parser

TBD
