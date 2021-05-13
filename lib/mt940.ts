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
  targetAccount: tag20('mandatory'),
  referenciaDeMensaje: tag21('optional'),
  identificacionDeCuenta: tag25('mandatory'),
  statementNumber: tag28('mandatory'),
  openingBalance: tag60F('mandatory'),
  records: REPEAT(tag61('mandatory'), tag86('mandatory')),
  closingBalance: tag62F('mandatory'),
  informationToAccountOwner: tag86('optional'),
};

export const parser = parserFactory(mt940);
