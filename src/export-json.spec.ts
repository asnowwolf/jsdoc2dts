import { exportJson } from './export-json';

describe('doc-to-json', () => {
  it('export', () => {
    exportJson('./src/test/samples/Graph.js', './src/test/output/Graph.json');
  });
});
