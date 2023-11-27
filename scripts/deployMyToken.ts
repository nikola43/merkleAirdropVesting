
import { ethers } from 'hardhat';
const colors = require('colors/safe');
import test_util from './util'

async function main() {
    const [deployer] = await ethers.getSigners();

    let tokenFactory = await ethers.getContractFactory('MyToken')
    const token = await tokenFactory.deploy()
    await token.deployed();
    console.log(`${colors.cyan('MyToken Address')}: ${colors.yellow(token?.address)}`)
    await test_util.sleep("60");
    await test_util.verify(token.address, "MyToken")

    const airdropFactory = await ethers.getContractFactory('Airdrop')
    const airdrop = await airdropFactory.deploy()
    await airdrop.deployed();
    console.log(`${colors.cyan('Airdrop Address')}: ${colors.yellow(airdrop?.address)}`)

    await test_util.sleep("60");
    await test_util.verify(airdrop.address, "Airdrop")

    await token.transfer(airdrop.address, ethers.utils.parseEther('10000000000000000'))
    await airdrop.setToken(token.address)
    await airdrop.setMerkleRoot("0x72346cee5ef720a00fb8ca1b3b586281471b90ccb72b9f18e58d5a2852ce99b1")
}


main().catch((error: Error) => {
    console.error(error)
    process.exitCode = 1
})


