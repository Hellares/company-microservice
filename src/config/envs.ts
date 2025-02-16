// import 'dotenv/config';
// import * as joi from 'joi';

// interface EnvVars {
//     PORT: number;
//     DATABASE_URL: string;
//     RABBITMQ_SERVERS: string[];
// }

// const envsSchema = joi.object({
//     PORT: joi.number().required(),
//     DATABASE_URL: joi.string().required(),
//     RABBITMQ_SERVERS: joi.array().items(joi.string()).required(),
// })
// .unknown(true);

// const { error, value } = envsSchema.validate({
//   ...process.env,
//   RABBITMQ_SERVERS: process.env.RABBITMQ_SERVERS?.split(',') || [],
// });

// if (error) {
//     throw new Error(`Config validation error: ${error.message}`);
// }

// const envVars: EnvVars = value;

// export const envs = {
//     port: envVars.PORT,
//     databaseUrl: envVars.DATABASE_URL,
//     rabbitmqServers: envVars.RABBITMQ_SERVERS,
// }

//!arriba funciona

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
    PORT: number;
    DATABASE_URL: string;
    RABBITMQ_SERVERS: string[];
    NODE_ENV?: string;
    RABBIT_RETRY_ATTEMPTS?: number;
    RABBIT_RETRY_DELAY?: number;
    RABBIT_PREFETCH_COUNT?: number;
}

const envsSchema = joi.object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    RABBITMQ_SERVERS: joi.array().items(joi.string()).required(),
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
    RABBIT_RETRY_ATTEMPTS: joi.number().default(5),
    RABBIT_RETRY_DELAY: joi.number().default(5000),
    RABBIT_PREFETCH_COUNT: joi.number().default(1),
})
.unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  RABBITMQ_SERVERS: process.env.RABBITMQ_SERVERS?.split(',') || [],
  RABBIT_RETRY_ATTEMPTS: parseInt(process.env.RABBIT_RETRY_ATTEMPTS || '5'),
  RABBIT_RETRY_DELAY: parseInt(process.env.RABBIT_RETRY_DELAY || '5000'),
  RABBIT_PREFETCH_COUNT: parseInt(process.env.RABBIT_PREFETCH_COUNT || '1'),
});

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
    port: envVars.PORT,
    databaseUrl: envVars.DATABASE_URL,
    rabbitmqServers: envVars.RABBITMQ_SERVERS,
    isProduction: envVars.NODE_ENV === 'production',
    rabbitmq: {
        retryAttempts: envVars.RABBIT_RETRY_ATTEMPTS,
        retryDelay: envVars.RABBIT_RETRY_DELAY,
        prefetchCount: envVars.RABBIT_PREFETCH_COUNT,
    }
};