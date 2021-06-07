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
type ParseLineResult = {
  match?: RegExpExecArray,
  nonMatchReason?: string,
}

export const getLine = (tokenizer: Tokenizer): string | undefined => {
  let content = "";
  let next = tokenizer.peek();
  let line = next.line;

  while ((next.type === 'TEXT' || next.type === 'MINUS') && line === next.line) {
    content = content + next.content;
    tokenizer.next();
    next = tokenizer.peek();
  }
  return content ? content : undefined;
}

export const configTag = <T>(
  tagId: TagId,
  regexList: RegExp[],
  bodyParser: (lines: ParseLineResult[]) => T,
): ((status: Status) => Tag<T>) => {
  return (status: Status) => (tokenizer: Tokenizer): T => {
    const { type, content, line: lineNum } = tokenizer.peek();
    if (type !== 'TAG' || content !== tagId) {
      if (status === 'mandatory') {
        throw new Error(`filename:${lineNum}: Missing mandatory tag ${tagId}`);
      }
      return;
    }
    // Consume the 'TAG' token
    tokenizer.next();


    let matches: ParseLineResult[] = [];
    let match: RegExpExecArray | null = null;
    let count = 0;
    let line: string | undefined;
    while ((line = getLine(tokenizer))) {
      const regex = regexList[count];
      if (!(match = regex.exec(line))) {
        matches.push({
          nonMatchReason: `filename:${lineNum + count}: '${line}' doesn't match the regex '${regex}'`
        });
        break;
      }
      matches.push({match});
      count += 1;
    }

    return bodyParser(matches);
  };
};

/*
 * Transaction reference number
 *
 * This field specifies the reference assigned by the Sender to unambiguously identify the message.
 */
const tag20Regex = [
  RegExp(`^(${SwiftCharacters.X}{0,16})$`)
];

export const tag20 = configTag<string>(
  '20',
  tag20Regex,
  (resultList) => {
    const [{match, nonMatchReason}] = resultList;
    if (nonMatchReason)
      throw new Error(nonMatchReason);
    return match[1];
  },
);

/*
 * Related reference
 *
 * If the MT 940 is sent in response to an MT 920 Request Message, this field must contain
 * the field 20 Transaction Reference Number of the request message.
 */
const tag21Regex = [
  RegExp(`^(${SwiftCharacters.X}{0,16})$`),
];

export const tag21 = configTag(
  '21',
  tag21Regex,
  (resultList) => {
    const [{match ,nonMatchReason}] = resultList;
    if (nonMatchReason)
      throw new Error(nonMatchReason);
    return match[1];
  },
);

/*
 * Account identification
 *
 * This field identifies the account and optionally the identifier code of the account
 * owner for which the statement is sent.
 */
const tag25Regex = [
  RegExp(`^(${SwiftCharacters.X}{1,35})$`),
]

export const tag25 = configTag(
  '25',
  tag25Regex,
  (resultList) => {
    const [{match ,nonMatchReason}] = resultList;
    if (nonMatchReason)
      throw new Error(nonMatchReason);
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
const tag28CRegex = [
  RegExp(
    `^(${SwiftCharacters.Numeric}{1,5})(?:/(${SwiftCharacters.Numeric}{1,5}))?$`,
  ),
];

export const tag28 = configTag(
  '28C',
  tag28CRegex,
  (resultList) => {
    const ret = {} as {
      statementNumber: string;
      sequenceNumber?: string;
    };
    const [
      {match, nonMatchReason},
    ] = resultList;

    if (nonMatchReason)
      throw new Error(nonMatchReason);
    ret.statementNumber = match[1];

    if (match[2])
      ret.sequenceNumber = match[2];

    return ret;
  },
);

/*
 * Statement Line
 *
 * This field contains the details of each transaction.
 */
const tag61Regex = [
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
      `$`,
    ].join(''),
  ),
  RegExp(
      `^(?:(${SwiftCharacters.X}{1,34}))?$`, // Supplementary details
  ),
]

export const tag61 = configTag(
  '61',
  tag61Regex,
  (resultList) => {
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

    const [
      {match: firstLineMatch, nonMatchReason: firstLineNoMatchReason},
      {match: secondLineMatch}
    ] = resultList;

    if (firstLineNoMatchReason)
      throw new Error(firstLineNoMatchReason);

    ret.valueDate = firstLineMatch[1];
    ret.entryDate = firstLineMatch[2];
    ret.isCredit = firstLineMatch[3] === 'C' || firstLineMatch[3] === 'RD';
    if (firstLineMatch[4]) ret.fundsCode = firstLineMatch[4];
    ret.amount = firstLineMatch[5] + ',' + (firstLineMatch[6] ? firstLineMatch[6] : '00');
    ret.transactionType = firstLineMatch[7];
    ret.identificationCode = firstLineMatch[8];

    // Find the `//` that is in between the reference for the account owner and the reference
    // for the account servicing institution
    const separatorPos = firstLineMatch[9].search('//');
    if (separatorPos === -1) {
      ret.referenceForAccountOwner = firstLineMatch[9];
    } else {
      ret.referenceForAccountOwner = firstLineMatch[9].slice(0, separatorPos);
      ret.referenceForAccountInstitution = firstLineMatch[9].slice(separatorPos + 2);
    }

    if (secondLineMatch) ret.supplementaryDetails = secondLineMatch[1];

    return ret;
  },
);

/*
 * Information to account owner
 *
 * This field contains additional information about the transaction detailed in the preceding
 * statement line and which is to be passed on to the account owner.
 */
const tag86Regex = [
    RegExp([`^`, `(.{1,65})`, `$`].join('')),
    RegExp([`^`, `(.{1,65})`, `$`].join('')),
    RegExp([`^`, `(.{1,65})`, `$`].join('')),
    RegExp([`^`, `(.{1,65})`, `$`].join('')),
    RegExp([`^`, `(.{1,65})`, `$`].join('')),
    RegExp([`^`, `(.{1,65})`, `$`].join('')),
]

export const tag86 = configTag(
  '86',
  tag86Regex,
  (resultList) => {
    const [
      {match: line1Match, nonMatchReason: line1NoMatchReason},
      {match: line2Match},
      {match: line3Match},
      {match: line4Match},
      {match: line5Match},
      {match: line6Match},
    ] = resultList;

    if (line1NoMatchReason)
      throw new Error(line1NoMatchReason);

    return {
      accountOwnerInformation:
        line1Match[1] +
        (line2Match?.[1] ?? '') +
        (line3Match?.[1] ?? '') +
        (line4Match?.[1] ?? '') +
        (line5Match?.[1] ?? '') +
        (line6Match?.[1] ?? '')
    }
  },
);

const balanceRegex = [RegExp(
  [
    `^`,
    `(D|C)`, // D/C Mark
    `(${SwiftCharacters.Numeric}{6})`, // Date
    `(${SwiftCharacters.Alpha}{3})`, // Currency
    `(${SwiftCharacters.Numeric}{1,15})(?:,(${SwiftCharacters.Numeric}{0,2}))?`, // Amount
    `$`,
  ].join(''),
)];

const balanceParser = (resultList: ParseLineResult[]) => {
  const ret = {} as {
    isCredit: boolean;
    date: string;
    currency: string;
    amount: string;
  };

  const [{match, nonMatchReason}] = resultList;

  if (nonMatchReason)
    throw new Error(nonMatchReason);

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
