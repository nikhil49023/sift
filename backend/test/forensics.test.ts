import {test} from 'node:test';
import assert from 'node:assert/strict';
import {javascriptFacts,pythonFacts,inspect} from '../src/forensics.ts';
import {makeEvidence,parseLog,excludedPath} from '../src/ingestion.ts';
import type {Snapshot,AuditSubmission} from '@sift/contracts';
test('AST parsers detect real empty bodies without executing source',async()=>{
  const js=javascriptFacts('function pending() {} function simple() { return 1; }');
  assert.equal(js[0].empty,true);assert.equal(js[1].empty,false);
  const py=await pythonFacts('import os\ndef pending():\n    pass\ndef simple():\n    return 1\n');
  assert.equal(py[0].empty,true);assert.equal(py[1].empty,false);
});
test('Git history parsing excludes lockfiles from substantive churn',()=>{
  const sha='a'.repeat(40);const commits=parseLog(`\x1e${sha}\x1fBuilder\x1fb@example.test\x1f2026-01-01T00:00:00Z\x1f2026-01-01T00:00:00Z\n100\t0\tpackage-lock.json\n20\t2\tsrc/app.ts\n5\t0\tREADME.md`);
  assert.equal(commits[0].additions,25);assert.equal(commits[0].meaningfulAdditions,20);assert.equal(excludedPath('vendor/library.py'),true);
});
test('missing history, sprint and corpus do not turn into clean audit claims',async()=>{
  const sha='a'.repeat(40);const snapshot:Snapshot={repository:'test/repo',sha,evidence:[makeEvidence('test/repo',sha,'code','app.js','function done() { return 1; }','https://github.com/test/repo')],coverage:{complete:true,limitations:[],filesAnalyzed:1,commitsAnalyzed:0,excludedFiles:0},commits:[],blame:{},metadata:{}};
  const input:AuditSubmission={workflow:'hackathon',cohortId:'00000000-0000-4000-8000-000000000010',repositories:['test/repo'],candidateName:'Team',team:[]};
  const findings=await inspect(snapshot,input);assert.equal(findings.find(f=>f.pillar==='timeline')?.status,'UNKNOWN');assert.equal(findings.find(f=>f.pillar==='similarity')?.status,'UNKNOWN');
});
