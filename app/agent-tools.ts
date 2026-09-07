type Registry = { registerTool: (tool: {name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown}, options:{signal:AbortSignal})=>void|Promise<void> };
if(typeof document!=='undefined'){
 const registry=(document as Document & {modelContext?:Registry}).modelContext;
 if(registry){const lifecycle=new AbortController();
 try{Promise.resolve(registry.registerTool({name:'open_kora_workspace',description:'Navigate to the Kora demo financial workspace. Does not change financial records.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');const target=document.getElementById('workspace');if(!target)throw new Error('Workspace is not ready.');target.scrollIntoView({behavior:'instant'});return {section:'workspace',demo:true};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 }
}
