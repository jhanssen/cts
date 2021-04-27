/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/import { Logger } from '../common/framework/logging/logger.js';import { TestQuerySingleCase } from '../common/framework/query/query.js';
import { objectEquals } from '../common/framework/util/util.js';

import { UnitTest } from './unit_test.js';

export class TestGroupTest extends UnitTest {
  async run(g) {
    const logger = new Logger(true);
    for (const t of g.iterate()) {
      for (const rc of t.iterate()) {
        const query = new TestQuerySingleCase('xx', ['yy'], rc.id.test, rc.id.params);
        const [rec] = logger.record(query.toString());
        await rc.run(rec, query, []);
      }
    }
    return logger.results;
  }

  expectCases(g, cases) {
    const gcases = [];
    for (const t of g.iterate()) {
      gcases.push(...Array.from(t.iterate(), c => c.id));
    }
    this.expect(objectEquals(gcases, cases));
  }}
//# sourceMappingURL=test_group_test.js.map