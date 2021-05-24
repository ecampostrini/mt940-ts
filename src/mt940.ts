import {
  tag20,
  tag21,
  tag25,
  tag28,
  tag60F,
  tag61,
  tag86,
  tag62F,
} from './tags';
import { REPEAT } from './combinators';
import { parserFactory } from './parser';

const mt940 = {
  transactionReferenceNumber: tag20('mandatory'),
  relatedReference: tag21('optional'),
  accountIdentification: tag25('mandatory'),
  statementNumber: tag28('mandatory'),
  openingBalance: tag60F('mandatory'),
  records: REPEAT(tag61('mandatory'), tag86('mandatory')),
  closingBalance: tag62F('mandatory'),
  informationToAccountOwner: tag86('optional'),
};

export const parser = parserFactory(mt940);
