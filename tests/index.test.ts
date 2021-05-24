import { simpleStatement, simpleStatementWithMessageBlocks } from "./fixtures";
import { mt940Parser } from "../src";

describe("MT940 parser", () => {
  test("Parse simple statement", () => {
    const { input, expectedOutput } = simpleStatement;
    expect(mt940Parser(input)).toEqual([expectedOutput]);
  });

  test.skip("Parse simple statement with message blocks", () => {
    const { input, expectedOutput } = simpleStatementWithMessageBlocks;
    expect(mt940Parser(input)).toEqual([expectedOutput]);
  });
});
