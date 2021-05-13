import { Tokenizer } from './tokenizer';
import { Tag } from './tags';

export const REPEAT = <T, U>(t1: Tag<T>, t2: Tag<U>): Tag<(T & U)[]> => {
  return (tokenizer: Tokenizer): (T & U)[] => {
    let ret: (T & U)[] = [];
    let next = tokenizer.peek();
    while (next.type === 'TAG' && next.content === '61') {
      ret.push({ ...t1(tokenizer), ...t2(tokenizer) });
      next = tokenizer.peek();
    }
    return ret;
  };
};
