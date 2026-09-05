import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import mongoose, { Error as MongooseError } from 'mongoose';

// Deliberately sourced from `mongoose.mongo` rather than importing the
// `mongodb` package directly. `mongodb-memory-server` (test-only) pins an
// older `mongodb` major than the one mongoose itself depends on, so npm
// hoists two separate copies of the driver into node_modules. Importing
// `mongodb` directly can silently resolve to the *wrong* copy, in which case
// `instanceof MongoServerError` never matches the errors mongoose actually
// throws (they're instances of the class from mongoose's own bundled
// driver) and every duplicate-key error would fall through as a raw 500
// instead of the 409 below. Going through `mongoose.mongo` guarantees we
// reference the exact same class mongoose uses internally.
const { MongoServerError } = mongoose.mongo;
type MongoServerError = InstanceType<typeof mongoose.mongo.MongoServerError>;

/**
 * Catches raw Mongo/Mongoose errors that would otherwise bubble up as
 * unhandled 500s, and maps them to clean, client-safe HTTP responses:
 *  - duplicate key (code 11000) -> 409 Conflict, naming the offending field
 *  - Mongoose ValidationError    -> 400 Bad Request with field-level messages
 * Never surfaces raw driver error text or stack traces to the client.
 */
@Catch(MongoServerError, MongooseError.ValidationError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoServerError | MongooseError.ValidationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof MongoServerError && exception.code === 11000) {
      const field = Object.keys(exception.keyValue ?? {})[0] ?? 'field';
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: `A record with this ${field} already exists.`,
        error: 'Conflict',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof MongooseError.ValidationError) {
      const messages = Object.values(exception.errors).map((e) => e.message);
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: messages,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Fall back for any other Mongo server error we didn't special-case.
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'A database error occurred.',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
