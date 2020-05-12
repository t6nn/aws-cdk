#!/usr/bin/env node
import * as fs from 'fs-extra';
import * as yargs from 'yargs';
import generate from '../lib';

async function main() {
  const argv = yargs.usage('Usage: cfn2ts')
    .option('scope', { type: 'string', array: true, desc: 'Scope to generate TypeScript for (e.g: AWS::IAM)' })
    .option('filter-resource-prefix', { type: 'string', desc: 'A prefix filter on the resource type name' })
    .option('out', { type: 'string', desc: 'Path to the directory where the TypeScript files should be written', default: 'lib' })
    .option('core-import', { type: 'string', desc: 'The typescript import to use for the CDK core module. Can also be defined in package.json under "cdk-build.cfn2ts-core-import"', default: '@aws-cdk/core' })
    .epilog('if --scope is not defined, cfn2ts will try to obtain the scope from the local package.json under the "cdk-build.cloudformation" key.')
    .argv;

  const pkg = await tryReadPackageJson();

  if (!argv.scope) {
    argv.scope = await tryAutoDetectScope(pkg);
  }

  if (!argv['filter-resource-prefix']) {
    argv['filter-resource-prefix'] = pkg?.['cdk-build']?.['filter-resource-prefix'];
  }

  // read "cfn2ts-core-import" from package.json
  const coreImport = pkg?.['cdk-build']?.['cfn2ts-core-import'];
  if (coreImport) {
    argv['core-import'] = coreImport;
  }

  if (!argv.scope) {
    throw new Error('--scope is not provided and cannot be auto-detected from package.json (under "cdk-build.cloudformation")');
  }

  await generate(argv.scope, argv.out, {
    coreImport: argv['core-import'],
    filterResourcePrefix: argv['filter-resource-prefix'],
  });
}

main().catch(err => {
  // tslint:disable-next-line:no-console
  console.error(err);
  process.exit(1);
});

async function tryAutoDetectScope(pkg: any): Promise<undefined | string[]> {
  const value = pkg['cdk-build'] && pkg['cdk-build'].cloudformation;
  return value && (typeof value === 'string' ? [value] : value);
}

async function tryReadPackageJson() {
  if (!await fs.pathExists('./package.json')) {
    return undefined;
  }

  return await fs.readJSON('./package.json');
}