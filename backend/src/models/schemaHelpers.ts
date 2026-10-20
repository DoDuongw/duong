import { Schema } from 'mongoose';

/* eslint-disable @typescript-eslint/no-explicit-any */

type ObjectIdOpts = {
  ref?: string;
  required?: boolean;
  index?: boolean;
  unique?: boolean;
  default?: unknown;
};

export function objectId(opts: ObjectIdOpts = {}): any {
  return { type: Schema.Types.ObjectId, ...opts };
}
