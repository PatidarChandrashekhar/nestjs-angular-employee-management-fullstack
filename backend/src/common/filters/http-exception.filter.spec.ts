import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('normalizes a BadRequestException into the standard envelope', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const getResponse = jest.fn().mockReturnValue({ status });
    const getRequest = jest.fn().mockReturnValue({ url: '/api/v1/employees', headers: {} });
    const host = { switchToHttp: () => ({ getResponse, getRequest }) } as unknown as ArgumentsHost;

    filter.catch(new BadRequestException('salary must not be negative'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, path: '/api/v1/employees' }),
    );
  });
});
