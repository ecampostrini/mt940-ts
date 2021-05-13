import { SwiftCharacters } from './characters';
import { Tokenizer } from './tokenizer';

export type Tag<T extends {}> = (tokenizer: Tokenizer) => T;

export type TagId =
  | '20'
  | '21'
  | '25'
  | '28C'
  | '60F'
  | '61'
  | '62F'
  | '64'
  | '65'
  | '86';

type Status = 'mandatory' | 'optional';

export const configTag = <T>(
  tagId: TagId,
  pattern: RegExp,
  bodyParser: (execArray: RegExpExecArray) => T,
): ((status: Status) => Tag<T>) => {
  return (status: Status) => (tokenizer: Tokenizer): T => {
    const { type, content, line } = tokenizer.peek();
    if (type !== 'TAG' || content !== tagId) {
      if (status === 'mandatory') {
        throw new Error(`filname:${line}: Missing mandatory tag ${tagId}`);
      }
      return;
    }
    // Consume the 'TAG' token
    tokenizer.next();

    let tagBody: string = '';
    while (tokenizer.peek()?.type === 'TEXT') {
      if (tagBody) tagBody += '\n';
      tagBody += tokenizer.next().content;
    }

    const match = pattern.exec(tagBody);
    if (!match) {
      throw new Error(
        `filename:${line}: line '${tagBody}' doesn't match regex '${pattern}' while parsing ` +
          `tag ${tagId}`,
      );
    }

    return bodyParser(match);
  };
};

/*
 * Transaction reference number
 *
 * This field specifies the reference assigned by the Sender to unambiguously identify the message.
 */
export const tag20 = configTag<string>(
  '20',
  RegExp(`^(${SwiftCharacters.X}{0,16})$`),
  (match) => {
    return match[1];
  },
);

/*
 * Related reference
 *
 * If the MT 940 is sent in response to an MT 920 Request Message, this field must contain
 * the field 20 Transaction Reference Number of the request message.
 */
export const tag21 = configTag(
  '21',
  RegExp(`^(${SwiftCharacters.X}{0,16})$`),
  (match) => {
    return match[1] ? match[1] : undefined;
  },
);

/*
 * Account identification
 *
 * This field identifies the account and optionally the identifier code of the account
 * owner for which the statement is sent.
 */
export const tag25 = configTag(
  '25',
  RegExp(`^(${SwiftCharacters.X}{1,35})$`),
  (match) => {
    return match[1];
  },
);

/*
 * Statement Number/Sequence Number
 *
 * This field contains the sequential number of the statement, optionally followed by
 * the sequence number of the message within that statement when more than one message
 * is sent for one statement.
 */
export const tag28 = configTag(
  '28C',
  RegExp(
    `^(${SwiftCharacters.Numeric}{1,5})(?:/(${SwiftCharacters.Numeric}{1,5}))?$`,
  ),
  (match) => {
    const ret = {} as {
      statementNumber: string;
      sequenceNumber?: string;
    };

    ret.statementNumber = match[1];
    if (match[2]) ret.sequenceNumber = match[2];

    return ret;
  },
);

/*
 * Statement Line
 *
 * This field contains the details of each transaction.
 */
export const tag61 = configTag(
  '61',
  RegExp(
    [
      `^`,
      `(${SwiftCharacters.Numeric}{6})`, // value date
      `(${SwiftCharacters.Numeric}{4})?`, // entry date
      `(C|D|RD|RC)`, // debit/credit mark
      `(${SwiftCharacters.Alpha})?`, // funds code
      `(${SwiftCharacters.Numeric}{1,15})(?:,(${SwiftCharacters.Numeric}{0,2}))?`, // Amount
      `(S|N|F)?`, // transaction type
      `(${SwiftCharacters.AlphaNumeric}{3})`, // identification code
      `(${SwiftCharacters.X}{1,34})`, // reference for the account owner and account servicing institution
      `(?:\n(${SwiftCharacters.X}{1,34}))?`, // Supplementary details
      `$`,
    ].join(''),
  ),
  (match) => {
    const ret = {} as {
      valueDate: string;
      entryDate?: string;
      isCredit: boolean;
      fundsCode?: string;
      amount: string;
      transactionType: string;
      identificationCode: string;
      referenceForAccountOwner: string;
      referenceForAccountInstitution?: string;
      supplementaryDetails?: string;
    };

    ret.valueDate = match[1];
    ret.entryDate = match[2];
    ret.isCredit = match[3] === 'C' || match[3] === 'RD';
    if (match[4]) ret.fundsCode = match[4];
    ret.amount = match[5] + ',' + (match[6] ? match[6] : '00');
    ret.transactionType = match[7];
    ret.identificationCode = match[8];

    // Find the `//` that is in between the reference for the account owner and the reference
    // for the account servicing institution
    const separatorPos = match[9].search('//');
    if (separatorPos === -1) {
      ret.referenceForAccountOwner = match[9];
    } else {
      ret.referenceForAccountOwner = match[9].slice(0, separatorPos);
      ret.referenceForAccountInstitution = match[9].slice(separatorPos + 2);
    }

    if (match[10]) ret.supplementaryDetails = match[10];

    return ret;
  },
);

/*
 * Information to account owner
 *
 * This field contains additional information about the transaction detailed in the preceding
 * statement line and which is to be passed on to the account owner.
 */
export const tag86 = configTag(
  '86',
  RegExp([`^`, `(.{1,65})`, `(?:\n(.{1,65}))?`.repeat(5), `$`].join('')),
  (match) => {
    return {
      accountOwnerInformation:
        (match[1] || '') +
        (match[2] || '') +
        (match[3] || '') +
        (match[4] || '') +
        (match[5] || '') +
        (match[6] || ''),
    };
  },
);

const balanceRegex = RegExp(
  [
    `^`,
    `(D|C)`, // D/C Mark
    `(${SwiftCharacters.Numeric}{6})`, // Date
    `(${SwiftCharacters.Alpha}{3})`, // Currency
    `(${SwiftCharacters.Numeric}{1,15})(?:,(${SwiftCharacters.Numeric}{0,2}))?`, // Amount
    `$`,
  ].join(''),
);

const balanceParser = (match: RegExpExecArray) => {
  const ret = {} as {
    isCredit: boolean;
    date: string;
    currency: string;
    amount: string;
  };

  ret.isCredit = match[1] === 'C';
  ret.date = match[2];
  ret.currency = match[3];
  ret.amount = match[4] + ',' + (match[5] ? match[5] : '00');

  return ret;
};

/*
 * Opening balance
 *
 * This field specifies, for the (intermediate) opening balance, whether it is a debit
 * or credit balance, the date, the currency and the amount of the balance.
 */
export const tag60F = configTag('60F', balanceRegex, balanceParser);

/*
 * Closing balance
 *
 * This field specifies, for the (intermediate) closing balance, whether it is a debit or
 * credit balance, the date, the currency and the amount of the balance.
 */
export const tag62F = configTag('62F', balanceRegex, balanceParser);

/*
 * Closing Available Balance
 *
 * This field indicates the funds which are available to the account owner (if credit balance)
 * or the balance which is subject to interest charges (if debit balance).
 */
export const tag64 = configTag('64', balanceRegex, balanceParser);

/*
 * Forward Available Balance
 *
 * This field indicates the funds which are available to the account owner (if a credit or debit
 * balance) for the specified forward value date.
 */
export const tag65 = configTag('65', balanceRegex, balanceParser);
