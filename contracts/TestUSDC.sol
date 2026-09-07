// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
/// @notice Local test double ONLY. Never deployed as Circle USDC.
contract TestUSDC {
 mapping(address=>uint256) public balanceOf;mapping(address=>mapping(address=>uint256)) public allowance;
 event Transfer(address indexed from,address indexed to,uint256 value);
 function mint(address to,uint256 value) external {balanceOf[to]+=value;emit Transfer(address(0),to,value);}
 function approve(address to,uint256 value) external returns(bool){allowance[msg.sender][to]=value;return true;}
 function transfer(address to,uint256 value) external returns(bool){move(msg.sender,to,value);return true;}
 function transferFrom(address from,address to,uint256 value) external returns(bool){require(allowance[from][msg.sender]>=value,'ALLOWANCE');allowance[from][msg.sender]-=value;move(from,to,value);return true;}
 function move(address from,address to,uint256 value) private {require(balanceOf[from]>=value,'BALANCE');balanceOf[from]-=value;balanceOf[to]+=value;emit Transfer(from,to,value);}
}
