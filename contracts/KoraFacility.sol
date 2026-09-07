// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
interface Token {function transferFrom(address,address,uint256) external returns(bool);function transfer(address,uint256) external returns(bool);}
/// @notice Testnet-only bilateral facility. Lender is the trusted policy/credit authority, never the LLM.
contract KoraFacility {
 address public immutable lender; Token public immutable usdc; uint256 public immutable chain;
 bool private entered;
 struct Terms {bytes32 id;bytes32 business;bytes32 obligation;bytes32 evidence;address borrower;uint256 principal;uint256 fee;uint256 dueAt;uint256 expiresAt;}
 struct Agreement {Terms terms;uint256 repaid;uint8 status;}
 mapping(bytes32=>Agreement) private agreements;
 mapping(bytes32=>bool) public usedObligation;
 mapping(bytes32=>bool) public activeBusiness;
 event Registered(bytes32 indexed id,bytes32 indexed evidence,address borrower,uint256 principal,uint256 fee,uint256 dueAt);
 event Drawn(bytes32 indexed id,address borrower,uint256 amount);
 event Repaid(bytes32 indexed id,address borrower,uint256 amount,uint256 total,bool complete);
 event Cancelled(bytes32 indexed id);
 modifier guard(){require(!entered,'REENTRANT');require(block.chainid==chain,'WRONG_CHAIN');entered=true;_;entered=false;}
 constructor(address token,address authority){require(block.chainid==84532||block.chainid==31337,'WRONG_CHAIN');require(token.code.length>0&&authority!=address(0),'INVALID_CONFIG');usdc=Token(token);lender=authority;chain=block.chainid;}
 function get(bytes32 id) external view returns(Agreement memory){return agreements[id];}
 function register(Terms calldata t) external guard {
 require(msg.sender==lender,'UNAUTHORIZED');require(t.borrower!=address(0)&&t.id!=bytes32(0)&&t.business!=bytes32(0)&&t.obligation!=bytes32(0)&&t.evidence!=bytes32(0),'INVALID_TERMS');
 require(t.principal>0&&t.principal<=1000e6&&t.fee<=(t.principal+99)/100,'LIMIT');require(t.expiresAt>block.timestamp&&t.expiresAt<=block.timestamp+1 hours&&t.dueAt>t.expiresAt&&t.dueAt<=block.timestamp+35 days,'EXPIRED');
 require(agreements[t.id].status==0&&!usedObligation[t.obligation]&&!activeBusiness[t.business],'DUPLICATE');
 usedObligation[t.obligation]=true;activeBusiness[t.business]=true;agreements[t.id]=Agreement(t,0,1);
 require(usdc.transferFrom(lender,address(this),t.principal),'TRANSFER');emit Registered(t.id,t.evidence,t.borrower,t.principal,t.fee,t.dueAt);
 }
 function draw(bytes32 id) external guard {Agreement storage a=agreements[id];require(a.status==1&&msg.sender==a.terms.borrower,'UNAUTHORIZED');require(block.timestamp<a.terms.expiresAt,'EXPIRED');a.status=2;require(usdc.transfer(msg.sender,a.terms.principal),'TRANSFER');emit Drawn(id,msg.sender,a.terms.principal);}
 function repay(bytes32 id,uint256 amount) external guard {Agreement storage a=agreements[id];require(a.status==2&&msg.sender==a.terms.borrower,'UNAUTHORIZED');require(amount>0&&amount<=a.terms.principal+a.terms.fee-a.repaid,'EXCESSIVE_REPAYMENT');a.repaid+=amount;bool complete=a.repaid==a.terms.principal+a.terms.fee;if(complete){a.status=3;activeBusiness[a.terms.business]=false;}require(usdc.transferFrom(msg.sender,lender,amount),'TRANSFER');emit Repaid(id,msg.sender,amount,a.repaid,complete);}
 function cancelExpired(bytes32 id) external guard {Agreement storage a=agreements[id];require(a.status==1&&msg.sender==lender&&block.timestamp>=a.terms.expiresAt,'UNAUTHORIZED');a.status=4;activeBusiness[a.terms.business]=false;require(usdc.transfer(lender,a.terms.principal),'TRANSFER');emit Cancelled(id);}
}
