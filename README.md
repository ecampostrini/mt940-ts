# mt940-ts

[![Build Status](https://travis-ci.com/ecampostrini/mt940-ts.svg?branch=main)](https://travis-ci.com/ecampostrini/mt940-ts)

A Typescript library for parsing [MT940](https://www2.swift.com/knowledgecentre/publications/us9m_20200724/2.0?topic=mt940.htm) messages. It takes as an input text representing a set of MT940 statements and produces an array of statements as output.

# Installation

```bash
npm install mt940-ts
```

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
  console.log(
    `==== Showing records for account: ${statement.accountIdentification} ====`
  );
  statement.records.forEach((record) => {
    console.log(record);
  });
}
```

# Creating a custom parser

`mt940-ts` aims to be provide a simple framework that facilitates the creation of parsers for any MTXXX Swift message.
In order to write a custom parser for a given MTXXX message, the following steps must be followed:

- define the tags that compose the MTXXX message
- create an object that represents the structure of the MTXXX message, where each property belongs to a field in the MTXXX message and each value is the tag that corresponds to such property
- create the parser by calling the `parserFactory` function from `src/parser.ts` passing the object created on the previous step as the parameter

As an example, les create a parser for the [MT973](https://www2.swift.com/knowledgecentre/publications/usgf_20210723/2.0?topic=rsc_olh_mt973.htm) message. I chose this one because it's rather small, having only 3 fields. Let's start by extending the `src/tags.ts` file with the definition of the tag `12` (tags `20` and `25` are already defined since they are used by the MT940 parser):

```typescript
/*
 * Message type
 *
 * This field identifies the message type which is being requested.
 */
const messageTypeRegex = [RegExp(`^(971|972|998)$`)];

export const tag12 = configTag(
  "12",
  messageTypeRegex,
  (resultList: ParseLineResult[]) => {
    const [{ match, nonMatchReason }] = resultList;

    if (nonMatchReason) throw new Error(nonMatchReason);

    if (!match) throw new Error("Failed to extract message type");

    return { messageType: match[1] };
  }
);
```

Next, let's create the file `src/mt973.ts` which will contain the object that defines the structure of the message and it will create and export our parser:

```typescript
import { tag12, tag20, tag25 } from "./tags";
import { parserFactory } from "./parser";
import { REPEAT } from "./combinators";

const mt973 = {
  transactionReferenceNumber: tag20("mandatory"),
  requestedMessages: REPEAT(tag12("mandatory"), tag25("mandatory")),
};

export const parser = parserFactory(mt973);
```

Note that the `requestedMessages` field uses the `REPEAT` parser combinator _combines_ the given tags into a single tag and expects one or more occurrences of such combined tag in the input.

Now we can import our paser in our project and use it like so:

```typescript
import { parser as mt973Parser } from "./mt973";

const mt973Msgs = mt973Parser("input");

for (const mt973Msg of mt973Msgs) {
  const { transactionReferenceNumber, requestedMessages } = mt973Msg;
  console.log(transactionReferenceNumber);
  for (const requestedMessage of requestedMessages) {
    console.log(`transaction reference number: ${requestedMessage}`);
    console.log(`message type: ${requestedMessage.messageType}`);
  }
}
```
