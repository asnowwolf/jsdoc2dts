#!/usr/bin/env node

import 'core-js/es/array';
import * as yargs from 'yargs';

yargs
  .usage('$0 <cmd> [args]')
  .commandDir('./commands', { extensions: ['js', 'ts'], exclude: /.d.ts$/ })
  .help().parse();
