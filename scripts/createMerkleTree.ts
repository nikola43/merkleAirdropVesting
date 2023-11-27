import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
const fs = require('fs');
const lineByLine = require('n-readlines');
const colors = require('colors');
const { parse } = require("csv-parse");
import { parseEther, solidityKeccak256 } from 'ethers/lib/utils';

type AirdropRecipient = {
    // Recipient address
    address: string;
    // Scaled-to-decimals token value
    value: string;
};

type UserData = {
    address: string;
    proof: string[];
    value: string;
}

type AirdropData = {
    root: string;
    users: UserData[];
};

async function main() {
    let recipients: AirdropRecipient[] = [];


    fs.createReadStream("./wallets.csv")
        .pipe(parse({ delimiter: ",", from_line: 2 }))
        .on("data", function (row: any) {
            console.log(row);
            recipients.push({
                address: row[0],
                value: parseEther(row[1]).toString()
            })
        })
        .on("end", function () {
            console.log("finished");

            const airdropData: AirdropData = {
                root: "",
                users: []
            };


            const leafNodes = recipients.map((recipient) =>
                Buffer.from(
                    // Hash in appropriate Merkle format
                    solidityKeccak256(["address", "uint256"], [recipient.address, recipient.value]).slice(2),
                    "hex"
                )
            );

            const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

            for (let i = 0; i < recipients.length; i++) {
                const proof = merkleTree.getHexProof(leafNodes[i]);
                airdropData.users.push({
                    address: recipients[i].address,
                    proof: proof,
                    value: recipients[i].value
                })
            }
            airdropData.root = merkleTree.getHexRoot();
            fs.writeFileSync('data.json', JSON.stringify(airdropData));
        })
        .on("error", function (error: any) {
            console.log(error.message);
        });


}
main()
    .then(async () => {
        console.log("Done")
    })
    .catch(error => {
        console.error(error);
        return undefined;
    })