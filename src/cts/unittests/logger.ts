export const description = `
Unit tests for namespaced logging system.

Also serves as a larger test of async test functions, and of the logging system.
`;

import { Logger, Test } from "../../framework/index.js";

export const test = new Test();

test.case("construct", (log) => {
  const mylog = new Logger();
  const [testres, testrec] = mylog.record(["foo", "bar"]);
  const [res1, rec1] = testrec.record("baz");
  const params2 = {};
  const [res2, rec2] = testrec.record("qux", params2);

  log.expect(testres.path.length === 2);
  log.expect(testres.path[0] === "foo");
  log.expect(testres.path[1] === "bar");
  log.expect(testres.cases.length === 2);
  log.expect(testres.cases[0] === res1);
  log.expect(testres.cases[1] === res2);
  log.expect(res1.name === "baz");
  log.expect(res1.params === undefined);
  log.expect(res1.logs === undefined);
  log.expect(res1.status === "running");
  log.expect(res1.timems < 0);
  log.expect(res2.name === "qux");
  log.expect(res2.params === params2);
  log.expect(res2.logs === undefined);
  log.expect(res2.status === "running");
  log.expect(res2.timems < 0);
});

test.case("empty", (log) => {
  const mylog = new Logger();
  const [testres, testrec] = mylog.record(["foo", "bar"]);
  const [res, rec] = testrec.record("baz");

  rec.start();
  log.expect(res.status === "running");
  rec.finish();
  log.expect(res.status === "pass");
  log.expect(res.timems > 0);
});

test.case("pass", (log) => {
  const mylog = new Logger();
  const [testres, testrec] = mylog.record(["foo", "bar"]);
  const [res, rec] = testrec.record("baz");

  rec.start();
  rec.expect(true);
  rec.ok();
  log.expect(res.status === "running");
  rec.finish();
  log.expect(res.status === "pass");
  log.expect(res.timems > 0);
});

test.case("warn", (log) => {
  const mylog = new Logger();
  const [testres, testrec] = mylog.record(["foo", "bar"]);
  const [res, rec] = testrec.record("baz");

  rec.start();
  rec.warn();
  log.expect(res.status === "running");
  rec.finish();
  log.expect(res.status === "warn");
  log.expect(res.timems > 0);
});

test.case("fail", (log) => {
  const mylog = new Logger();
  const [testres, testrec] = mylog.record(["foo", "bar"]);
  const [res, rec] = testrec.record("baz");

  rec.start();
  rec.fail("bye");
  rec.expect(true, "still shouldn't pass");
  rec.ok("still shouldn't pass");
  log.expect(res.status === "running");
  rec.finish();
  log.expect(res.status === "fail");
  log.expect(res.timems > 0);
});