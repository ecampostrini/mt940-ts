enum TOKEN {
  TAG = '[0-9]{2}[A-Z]?',
}

const TAG = RegExp(`^:(${TOKEN.TAG}):`);

const BLOCK_START = /^{([1-9][0-9]{0,2}|[A-Z]{1,3}):/;

const BLOCK_END = /^(})/;

const MINUS = /^(-)/;

const COLON = /^(:)/;

const NON_TEXTUAL_CHARACTERS = RegExp("({|})");

export type SYMBOL =
  | 'TAG'
  | 'BLOCK_START'
  | 'BLOCK_END'
  | 'MINUS'
  | 'TEXT'
  | 'COLON'
  | 'EOF';

export interface Token {
  line: number;
  type: SYMBOL;
  content: string;
}

export class Tokenizer {
  private readonly lines: string[];
  private nextToken: Token;
  private generator: Generator<Token, Token>;

  constructor(content: string) {
    this.lines = content.split('\n').map((line) => line.trim());
    this.generator = this.tokenizer();
    this.nextToken = this.generator.next().value;
  }

  public peek(): Token {
    return this.nextToken;
  }

  public next(): Token {
    let ret = this.nextToken;
    this.nextToken = this.generator.next().value;
    return ret;
  }

  private *tokenizer(): Generator<Token, Token> {
    let lineCount = 0;
    let lineOffset = 0;
    let match: RegExpExecArray;

    while (lineCount < this.lines.length) {
      const line = !lineOffset
        ? this.lines[lineCount]
        : this.lines[lineCount].slice(lineOffset);

      if ((match = TAG.exec(line))) {
        yield { line: lineCount + 1, type: 'TAG', content: match[1] };
        lineOffset += match[0].length;
        // skip the line counter increment in order to consume the rest of the line
        continue;
      } else if ((match = BLOCK_START.exec(line))) {
        yield {
          line: lineCount + 1,
          type: 'BLOCK_START',
          content: match[1],
        };
        lineOffset += match[0].length;
        // skip the line counter increment in order to consume the rest of the line
        continue;
      } else if ((match = BLOCK_END.exec(line))) {
        yield {
          line: lineCount + 1,
          type: 'BLOCK_END',
          content: match[1],
        };
        lineOffset += match[0].length;
        // skip the line counter increment in order to consume the rest of the line
        continue;
      } else if (MINUS.test(line)) {
        yield {line: lineCount - 1, type: 'MINUS', content: '-'};
      } else if ((match = COLON.exec(line))) {
        yield { line: lineCount + 1, type: 'COLON', content: match[1] };
        lineOffset += match[0].length;
        // skip the line counter increment in order to consume the rest of the line
        continue
      } else if (!line) {
        // skip empty lines
      } else {
        match = NON_TEXTUAL_CHARACTERS.exec(line);
        if (match) {
          yield {
            line: lineCount + 1,
            type: 'TEXT',
            content: line.substring(0, match.index),
          };
          // skip the line counter increment in order to consume the rest of the line
          lineOffset += match.index;
          continue;
        }
        yield { line: lineCount + 1, type: 'TEXT', content: line };
      }

      lineCount++;
      lineOffset = 0;
    }

    return { line: lineCount, type: 'EOF', content: '' } as Token;
  }
}
