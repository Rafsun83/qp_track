import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response_message';

// Lets a route override ResponseInterceptor's default "Request successful"
// message, e.g. @ResponseMessage('Users fetched successfully').
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
