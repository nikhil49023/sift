import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DIMENSIONS,type Evidence,type Snapshot} from '@sift/contracts';
import {makeEvidence} from '../src/ingestion.ts';
import {validateJudgment,incompleteJudgment,synthesize} from '../src/jev/index.ts';
const sha='a'.repeat(40);
const code=makeEvidence('test/repo',sha,'code','tests/app.test.ts','first line\nassert.equal(result, 1);\nthird line','https://github.com/test/repo');
test('JEV rejects fabricated citations and wrong line ranges',()=>{
  const j=incompleteJudgment('test');j.dimensions.systemsRigor={level:2,rationale:'test',citations:[{evidenceId:'invented',startLine:1,endLine:1,excerpt:'first line'}]};
  assert.throws(()=>validateJudgment(j,[code]),/Unknown evidence/);
  j.dimensions.systemsRigor.citations[0].evidenceId=code.id;j.dimensions.systemsRigor.citations[0].startLine=2;j.dimensions.systemsRigor.citations[0].endLine=2;
  assert.throws(()=>validateJudgment(j,[code]),/does not match/);
  j.dimensions.systemsRigor.citations[0].startLine=1;j.dimensions.systemsRigor.citations[0].endLine=1;
  assert.equal(validateJudgment(j,[code]).dimensions.systemsRigor.level,2);
});
test('missing dimensional evidence withholds overall score',()=>{
  const snapshot:Snapshot={repository:'test/repo',sha,evidence:[code],coverage:{complete:true,limitations:[],filesAnalyzed:1,commitsAnalyzed:1,excludedFiles:0},commits:[],metadata:{},blame:{}};
  assert.equal(synthesize([snapshot],[],incompleteJudgment('missing evidence')).overallScore,null);
  const j=incompleteJudgment('test');for(const k of DIMENSIONS)j.dimensions[k].level=4;
  assert.equal(synthesize([snapshot],[],j).overallScore,100);
  assert.equal(synthesize([],[],j).overallScore,null);
  j.roleFit={rationale:'Synthetic role-fit fixture',citations:[{evidenceId:code.id,startLine:1,endLine:1,excerpt:'first line'}]};
  const assessment=synthesize([snapshot],[],j);
  assert.equal(assessment.evidenceManifest[0].id,code.id);
  assert.equal(assessment.citations[0].id,code.id);
  snapshot.coverage.complete=false;assert.equal(synthesize([snapshot],[],j).overallScore,null);
});
test('a plausible narrative alone cannot score a dimension',()=>{
  const j=incompleteJudgment('test');j.dimensions.systemsRigor.level=4;
  assert.throws(()=>validateJudgment(j,[]),/has no citation/);
});
