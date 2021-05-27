type MtFixture = {
  input: string;
  expectedOutput: Record<any, any>;
};

export const simpleStatement: MtFixture = {
  input: [
    ":20:31MAR20DAILY",
    ":21:X",
    ":25:0000000123456",
    ":28C:123/1",
    ":60F:C250320EUR100,00",
    ":61:0310201020C500,00FMSCNONREF//8327000090031789",
    "Card transaction ",
    ":86:LINE1",
    "LINE2",
    "LINE3",
    ":62F:C251020EUR600,00",
  ].join("\r\n"),

  expectedOutput: {
    transactionReferenceNumber: "31MAR20DAILY",
    relatedReference: "X",
    accountIdentification: "0000000123456",
    statementNumber: { sequenceNumber: "1", statementNumber: "123" },
    openingBalance: {
      amount: "100,00",
      currency: "EUR",
      isCredit: true,
      date: "250320",
    },
    records: [
      {
        accountOwnerInformation: "LINE1LINE2LINE3",
        amount: "500,00",
        entryDate: "1020",
        identificationCode: "MSC",
        isCredit: true,
        referenceForAccountInstitution: "8327000090031789",
        referenceForAccountOwner: "NONREF",
        supplementaryDetails: "Card transaction",
        transactionType: "F",
        valueDate: "031020",
      },
    ],
    closingBalance: {
      amount: "600,00",
      currency: "EUR",
      date: "251020",
      isCredit: true,
    },
  },
};

export const simpleStatement2: MtFixture = {
  input : "",
  expectedOutput: {}
}

export const simpleStatementWithMessageBlocks: MtFixture = {
  input: [
    "{1:F02OELBATWWAXXX0975000073}",
    "{2:I103ABNANL2AXXXXU3003}",
    "{3:{113:URGT} {108:INTLPMTS} {121:79df44f1-73b2-4622-b4a0-32c4c295a2be}}{4:",
    simpleStatement.input,
    "-}",
    "{5:{CHK:123456789ABC}}",
  ].join("\r\n"),
  expectedOutput: { ...simpleStatement.expectedOutput },
};
