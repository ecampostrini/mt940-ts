import { Tokenizer } from "./tokenizer";
import { Tag } from "./tags";

export type M<T> = {
  [P in keyof T]: T[P] extends Tag<any> ? ReturnType<T[P]> : never;
};

export const parse = <T extends Record<string, Tag<any>>>(
  spec: T,
  input: string
): M<T>[] => {
  const tokenizer = new Tokenizer(input);
  let ret = [] as M<T>[];

  while (tokenizer.peek().type !== "EOF") {
    while (tokenizer.peek().type !== "TAG" && tokenizer.peek().type !== "EOF")
      tokenizer.next();

    if (tokenizer.peek().type === "EOF") break;

    const message = {} as M<T>;
    for (let key in spec) {
      if (spec.hasOwnProperty(key)) {
        message[key] = spec[key](tokenizer);
      }
    }

    ret.push(message);
  }

  return ret as any;
};

export const parserFactory = <T extends Record<string, Tag<any>>>(specs: T) => (
  input: string
) => parse(specs, input);
