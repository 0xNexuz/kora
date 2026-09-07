import solc from 'solc';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const sources=Object.fromEntries(['KoraFacility.sol','TestUSDC.sol'].map(n=>[n,{content:readFileSync(new URL('../contracts/'+n,import.meta.url),'utf8')}]));
const settings={optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}};
const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings})));
const errors=(output.errors??[]).filter(e=>e.severity==='error');if(errors.length)throw new Error(JSON.stringify(errors));
mkdirSync(new URL('../backend/artifacts',import.meta.url),{recursive:true});
for(const name of ['KoraFacility','TestUSDC']){const c=output.contracts[name+'.sol'][name];writeFileSync(new URL('../backend/artifacts/'+name+'.json',import.meta.url),JSON.stringify({compiler:solc.version(),settings,abi:c.abi,bytecode:'0x'+c.evm.bytecode.object,deployedBytecode:'0x'+c.evm.deployedBytecode.object},null,2));}
console.log('Compiled KoraFacility and local-only TestUSDC with '+solc.version());
