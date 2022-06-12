# Hyperledger Fabric Samples

Get started with Hyperledger Fabric, explore important Fabric features, and learn how to build applications that can interact with blockchain networks using the Fabric SDKs. 

To learn more about Hyperledger Fabric, visit the [Fabric documentation](https://hyperledger-fabric.readthedocs.io/en/latest).

## Getting started with the Fabric samples

To use the Fabric samples, you need to download the Fabric Docker images and the Fabric CLI tools. First, make sure that you have installed all of the [Fabric prerequisites](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html). You can then follow the instructions to [Install the Fabric Samples, Binaries, and Docker Images](https://hyperledger-fabric.readthedocs.io/en/latest/install.html) in the Fabric documentation. In addition to downloading the Fabric images and tool binaries, the Fabric samples will also be cloned to your local machine.

After this setup, you should have a bin folder in your PWD. If you don't have one then you need to be sure you ran this script: 
```
$ curl -sSL https://bit.ly/2ysbOFE | bash -s
```

## Test network

This is a local network.

The [Fabric test network](test-network) provides a Docker Compose-based test network with two
Organization peers and an ordering service node. You can use it on your local machine to run the <i>example-channel</i> using the [moonshotNetwork.sh](test-network/blockchain-up.sh) file.

Once all the proper bianary files (see above) are installed, simply run this command in the test-network file:
```
$ ./blockchain-up.sh
```

If you are having permission issues running the [blockchain-up.sh](test-network/blockchain-up.sh), [network.sh](test-network/network.sh), or [deployCC.sh](test-network/scripts/deployCC.sh) file, change the permissions using the following:
```
// Mac and Linux OS
$ chmod 755 blockchain-up.sh network.sh scripts/deployCC.sh
```

## Updating the network/CC

Updating the CC and the Blockchain network is fairly simple. 

First, go into the proper folder.

Then, simply run the commands:
```
$ cd test-network
$ ./blockchain-up.sh
```
This will run the executable file that starts the local network with 2 ca nodes, 2 peer nodes, and an orderer node (plus a few other containers with CC and tools). Once the network is up we need to ensure that the blockchain is running and the CC runs properly. Envoke the chainchode using the <i>peer chaincode query</i> command below. If it gives you an error saying that you need the peer bianry then we will need to run a few configuration commands.
```
#query the CC
$ peer chaincode query -C moonshot -n moonshot -c '{"Args":["GetAllAssets"]}'

#configuration for running the peer bianry commands
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
```
