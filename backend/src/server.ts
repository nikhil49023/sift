import {app} from './app.ts';
import {config,local} from './config.ts';
import {pool} from './db.ts';
const server=app.listen(config.PORT,local?'127.0.0.1':'0.0.0.0',()=>console.log(JSON.stringify({event:'server_started',port:config.PORT,authMode:config.AUTH_MODE})));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>{pool.end().finally(()=>process.exit(0));});});
