const colors = require('colors');
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai'
import { randomBytes } from 'crypto'
import { Contract, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
const { time } = require('@openzeppelin/test-helpers');
const util = require("../scripts/util");

import { MyToken, MyToken__factory, Airdrop, Airdrop__factory } from '../typechain';
import { parseEther, solidityKeccak256 } from 'ethers/lib/utils';

type AirdropRecipient = {
    // Recipient address
    address: string;
    // Scaled-to-decimals token value
    value: string;
};

//available functions
describe("Token contract", async () => {
    let deployer: SignerWithAddress;
    let bob: SignerWithAddress;
    let alice: SignerWithAddress;
    let recipients: AirdropRecipient[] = [];
    let leafNodes: Buffer[]

    let airdrop: Airdrop;
    let merkleTree: MerkleTree;
    let root: string;
    let token: MyToken;

    it("1. Get Signer", async () => {
        const signers = await ethers.getSigners();
        if (signers[0] !== undefined) {
            deployer = signers[0];
            console.log(`${colors.cyan('Deployer Address')}: ${colors.yellow(deployer?.address)}`)
        }
        if (signers[1] !== undefined) {
            bob = signers[1];
            console.log(`${colors.cyan('Bob Address')}: ${colors.yellow(bob?.address)}`)
        }
        if (signers[2] !== undefined) {
            alice = signers[2];
            console.log(`${colors.cyan('Alice Address')}: ${colors.yellow(alice?.address)}`)
        }
    });

    it('1. Should create merkle tree', async () => {
        recipients.push({
            address: alice.address,
            value: parseEther('1000').toString(),
        })

        recipients.push({
            address: bob.address,
            value: parseEther('1000').toString(),
        })

        leafNodes = recipients.map((recipient) =>
            Buffer.from(
                // Hash in appropriate Merkle format
                solidityKeccak256(["address", "uint256"], [recipient.address, recipient.value]).slice(2),
                "hex"
            )
        );

        merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

        root = merkleTree.getHexRoot()
        expect(root).to.not.equal("0x0000000000000000000000000000000000000000")
    });

    it('2. Should Generate proofs', async () => {
        const proofs = merkleTree.getLeaves();
        expect(proofs.length).to.gt(0);
    })

    it('3. Should Deploy Token', async () => {
        const contractFactory = await ethers.getContractFactory('MyToken')
        token = await contractFactory.deploy()
        await token.deployed();
        expect(token.address).to.not.equal("0x0000000000000000000000000000000000000000")
    })

    it('3. Should Deploy MerkeTree', async () => {
        const contractFactory = await ethers.getContractFactory('Airdrop')
        airdrop = await contractFactory.deploy()
        await airdrop.deployed();
        expect(airdrop.address).to.not.equal("0x0000000000000000000000000000000000000000")

        await airdrop.setToken(token.address)
        await airdrop.setMerkleRoot(root)
        console.log(`${colors.cyan('Merkle Root')}: ${colors.yellow(root)}`)
        console.log(`${colors.cyan('Token')}: ${colors.yellow(token.address)}`)
        await token.connect(deployer).transfer(airdrop.address, parseEther('2000').toString())
    })


    it('5. Test Bob Claim', async () => {
        const bobInfo = recipients.find((r) => r.address === bob.address)
        let p = await airdrop.calculateClaimable(bob.address, bobInfo?.value!)
        console.log(`${colors.cyan('Bob Address')}: ${colors.yellow(bob.address)}`)
        console.log(`${colors.cyan('Bob Value')}: ${colors.yellow(bobInfo?.value!)}`)
        console.log(`${colors.cyan('Pending Claimable')}: ${colors.yellow(p.toString())}`)

        const leaf = leafNodes[1]
        const proof = merkleTree.getHexProof(leaf);
        expect(proof.length).to.gt(0);

        const d = await airdrop.canClaim(bob.address, bobInfo?.value!, proof)
        //console.log(d)
        expect(d[0]).to.eq(true)


        await airdrop.connect(bob).claim(parseEther('1000').toString(), proof)
        const balance = await token.balanceOf(bob.address)
        console.log(`${colors.cyan('Bob Balance')}: ${colors.yellow(balance.toString())}`)

        await time.increase(300); // 1 days increase.

        p = await airdrop.calculateClaimable(bob.address, bobInfo?.value!)
        console.log(`${colors.cyan('Pending Claimable')}: ${colors.yellow(p.toString())}`)

        await airdrop.connect(bob).claim(parseEther('1000').toString(), proof)

        await time.increase(300*10); // 1 days increase.

        p = await airdrop.calculateClaimable(bob.address, bobInfo?.value!)
        console.log(`${colors.cyan('Pending Claimable')}: ${colors.yellow(p.toString())}`)

        /*
        await expect(airdrop.connect(bob).claim(1, proof)).to.be.revertedWith(
            'MerkleAirdrop: Address is not a candidate for claim'
        )
        */

    })

    /*
    it('7. Test Bad Proof', async () => {
        Object.assign(token, { getAddress: () => token.address })

        const badProof = merkleTree.getHexProof(keccak256(alice.address))

        expect(badProof).to.eql([])

        expect(await airdrop.canClaim(alice.address, badProof)).to.eq(false)

        await expect(airdrop.connect(alice).claim(badProof)).to.be.revertedWith(
            'MerkleAirdrop: Address is not a candidate for claim'
        )
        const proof = merkleTree.getHexProof(keccak256(alice.address))

        await expect(airdrop.connect(alice).claim(proof)).to.be.revertedWith(
            'MerkleAirdrop: Address is not a candidate for claim'
        )
    })
    */



    /*
    it('9. ClaimPA OK', async () => {
        await time.increase(6048000); // 70 days increase.
        await token.connect(deployer).claimPA()
    })
    */
})