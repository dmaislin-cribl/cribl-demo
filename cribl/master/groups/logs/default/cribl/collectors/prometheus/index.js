/* eslint-disable no-await-in-loop */

const { httpSearch, isHttp200, RestVerb, HttpError } = C.internal.HttpUtils;
const { PrometheusParser } = C.internal.Parsers;
const { DiscoveryAdapterFactory } = C.internal.Adapters;

exports.name = 'Prometheus';
exports.version = '0.1';
exports.disabled = false;
exports.destroyable = false;

let conf;
let batchSize;
let dimensions;

exports.getParser = (job) => {
  return new PrometheusParser(job.logger(), dimensions);
};

exports.init = async (opts) => {
  conf = opts.conf;
  batchSize = conf.maxBatchSize || 10;
  dimensions = conf.dimensionList;
  // validate adapter conf
  DiscoveryAdapterFactory.create(conf).validate();
};

exports.discover = async (job) => {
  try {
    const targets = (await DiscoveryAdapterFactory.create(conf, job.logger()).discoverTargets()) || [];
    const results = [];
    for (const record of targets) {
      results.push(record);
      if (results.length >= batchSize) {
        await job.addResults(results);
        results.length = 0;
      }
    }
    if (results.length) await job.addResults(results);
  } catch (error) {
    job.logger().error('Discover error', { error });
    throw error;
  }
};

exports.collect = async (collectible, job) => {
  const opts = { url: collectible.source, method: RestVerb.GET };
  const result = await httpSearch(opts, job.logger());
  result.res.on('end', () => {
    if (!isHttp200(result.res.statusCode)) {
      const error = new HttpError('http error', result.res.statusCode, { host: result.host, port: result.port, path: result.path, method: result.method });
      job.reportError(error).catch(() => {});
    }
  });
  result.res.on('error', (error) => {
    job.reportError(error).catch(() => {});
  });

  return result.res;
};
