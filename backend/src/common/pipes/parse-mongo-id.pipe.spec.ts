import { BadRequestException } from '@nestjs/common';
import { ParseMongoIdPipe } from './parse-mongo-id.pipe';

describe('ParseMongoIdPipe', () => {
  const pipe = new ParseMongoIdPipe();

  it('passes through a valid ObjectId string', () => {
    const valid = '65f1a2b3c4d5e6f7a8b9c000';
    expect(pipe.transform(valid)).toBe(valid);
  });

  it('throws BadRequestException for an invalid id', () => {
    expect(() => pipe.transform('not-an-id')).toThrow(BadRequestException);
  });
});
