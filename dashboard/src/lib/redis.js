import { createClient } from 'redis';

const redis = {
  createClient: (options) => {
    return createClient(options);
  }
};

export default redis;