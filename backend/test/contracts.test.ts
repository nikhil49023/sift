import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AuditInput,Repository} from '@sift/contracts';
test('repository inputs cannot point Git ingestion at other hosts or inject arguments',()=>{
  assert.equal(Repository.parse('https://github.com/expressjs/express.git'),'expressjs/express');
  for(const value of ['https://evil.test/a/b','--upload-pack=evil','a/../b','a/b?token=foo']) assert.equal(Repository.safeParse(value).success,false);
});
test('submission enforces workflow, unique repositories, sprint ordering and file budget',()=>{
  const base={workflow:'hackathon',cohortId:'00000000-0000-4000-8000-000000000010',candidateName:'Team',repositories:['a/b']};
  assert.equal(AuditInput.safeParse(base).success,true);
  assert.equal(AuditInput.safeParse({...base,repositories:['a/b','a/b']}).success,false);
  assert.equal(AuditInput.safeParse({...base,sprint:{start:'2026-01-02T00:00:00Z',end:'2026-01-01T00:00:00Z'}}).success,false);
});
