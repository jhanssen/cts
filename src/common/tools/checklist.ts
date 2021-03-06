import * as fs from 'fs';
import * as process from 'process';

import { DefaultTestFileLoader } from '../framework/file_loader.js';
import { Ordering, compareQueries } from '../framework/query/compare.js';
import { parseQuery } from '../framework/query/parseQuery.js';
import { TestQuery, TestQueryMultiFile } from '../framework/query/query.js';
import { loadTreeForQuery, TestTree } from '../framework/tree.js';
import { assert, StacklessError } from '../framework/util/util.js';

function usage(rc: number): void {
  console.error('Usage:');
  console.error('  tools/checklist FILE');
  console.error('  tools/checklist my/list.txt');
  process.exit(rc);
}

if (process.argv.length === 2) usage(0);
if (process.argv.length !== 3) usage(1);

type QueriesBySuite = Map<string, TestQuery[]>;
async function loadQueryListFromTextFile(filename: string): Promise<QueriesBySuite> {
  const lines = (await fs.promises.readFile(filename, 'utf8')).split(/\r?\n/);
  const allQueries = lines.filter(l => l).map(l => parseQuery(l.trim()));

  const queriesBySuite: QueriesBySuite = new Map();
  for (const query of allQueries) {
    let suiteQueries = queriesBySuite.get(query.suite);
    if (suiteQueries === undefined) {
      suiteQueries = [];
      queriesBySuite.set(query.suite, suiteQueries);
    }

    suiteQueries.push(query);
  }

  return queriesBySuite;
}

function checkForOverlappingQueries(queries: TestQuery[]): void {
  for (const q1 of queries) {
    for (const q2 of queries) {
      if (q1 !== q2 && compareQueries(q1, q2) !== Ordering.Unordered) {
        throw new StacklessError(`The following checklist items overlap:\n    ${q1}\n    ${q2}`);
      }
    }
  }
}

function checkForUnmatchedSubtrees(tree: TestTree, matchQueries: TestQuery[]): number {
  let subtreeCount = 0;
  const unmatchedSubtrees: TestQuery[] = [];
  const overbroadMatches: [TestQuery, TestQuery][] = [];
  for (const collapsedSubtree of tree.iterateCollapsedQueries(true)) {
    subtreeCount++;
    let subtreeMatched = false;
    for (const q of matchQueries) {
      const comparison = compareQueries(q, collapsedSubtree);
      assert(comparison !== Ordering.StrictSubset); // shouldn't happen, due to subqueriesToExpand
      if (comparison === Ordering.StrictSuperset) overbroadMatches.push([q, collapsedSubtree]);
      if (comparison !== Ordering.Unordered) subtreeMatched = true;
    }
    if (!subtreeMatched) unmatchedSubtrees.push(collapsedSubtree);
  }

  if (overbroadMatches.length) {
    // (note, this doesn't show ALL multi-test queries - just ones that actually match any .spec.ts)
    console.log(`  FYI, the following checklist items were broader than one file:`);
    for (const [q, collapsedSubtree] of overbroadMatches) {
      console.log(`    ${q}  >  ${collapsedSubtree}`);
    }
  }

  if (unmatchedSubtrees.length) {
    throw new StacklessError(`Found unmatched tests:\n    ${unmatchedSubtrees.join('\n    ')}`);
  }
  return subtreeCount;
}

(async () => {
  console.log('Loading queries...');
  const queriesBySuite = await loadQueryListFromTextFile(process.argv[2]);
  console.log('  Found suites: ' + Array.from(queriesBySuite.keys()).join(' '));

  const loader = new DefaultTestFileLoader();
  for (const [suite, queriesInSuite] of queriesBySuite.entries()) {
    console.log(`Suite "${suite}":`);
    console.log(`  Checking overlaps between ${queriesInSuite.length} checklist items...`);
    checkForOverlappingQueries(queriesInSuite);
    const suiteQuery = new TestQueryMultiFile(suite, []);
    console.log(`  Loading tree ${suiteQuery}...`);
    const tree = await loadTreeForQuery(loader, suiteQuery, queriesInSuite);
    console.log('  Found no invalid queries in the checklist. Checking for unmatched tests...');
    const subtreeCount = checkForUnmatchedSubtrees(tree, queriesInSuite);
    console.log(`  No unmatched tests among ${subtreeCount} subtrees!`);
  }
  console.log(`Checklist looks good!`);
})().catch(ex => {
  console.log(ex.stack ?? ex.toString());
  process.exit(1);
});
