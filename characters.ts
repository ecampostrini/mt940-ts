/*
 * Enum defining different Swift characters classes
 *
 * Reference:
 * https://www2.swift.com/knowledgecentre/publications/usgi_20200724/3.0?topic=con_31492.htm
 */
export enum SwiftCharacters {
  X = "[ a-zA-Z0-9/?:().,'+-]",

  Numeric = '[0-9]',

  Alpha = '[A-Z]',

  AlphaNumeric = '[0-9A-Z]',

  Hexa = '[A-F0-9]',
}
