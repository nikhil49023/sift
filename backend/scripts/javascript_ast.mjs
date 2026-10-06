import { parse } from '@babel/parser';
let input='';for await(const chunk of process.stdin)input+=chunk;
try {
  const {content,typescript}=JSON.parse(input);const ast=parse(content,{sourceType:'unambiguous',plugins:typescript?['typescript','jsx']:['jsx']});const functions=[];
  const stack=[ast];
  while(stack.length){const node=stack.pop();if(!node||typeof node!=='object')continue;
    if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression','ObjectMethod','ClassMethod'].includes(node.type)){
      const body=node.body?.body||[];const todo=[node.body];let branches=0;
      while(todo.length){const n=todo.pop();if(!n||typeof n!=='object')continue;if(['IfStatement','ConditionalExpression','ForStatement','ForOfStatement','ForInStatement','WhileStatement','SwitchCase','CatchClause','LogicalExpression'].includes(n.type))branches++;for(const [key,value] of Object.entries(n)){if(['loc','start','end'].includes(key))continue;if(Array.isArray(value))todo.push(...value);else if(value&&typeof value==='object')todo.push(value);}}
      functions.push({name:node.id?.name||node.key?.name||'anonymous',line:node.loc?.start.line||1,endLine:node.loc?.end.line||1,empty:node.body?.type==='BlockStatement'&&body.length===0,placeholder:body.some(s=>s.type==='ThrowStatement'&&/not implemented|todo/i.test(content.slice(s.start,s.end))),complexity:1+branches});
    }
    for(const [key,value] of Object.entries(node)){if(['loc','start','end'].includes(key))continue;if(Array.isArray(value))stack.push(...value);else if(value&&typeof value==='object')stack.push(value);}
  }
  process.stdout.write(JSON.stringify({functions}));
} catch(error){process.stdout.write(JSON.stringify({error:error.name}));}
